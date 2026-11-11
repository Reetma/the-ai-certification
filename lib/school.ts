import 'server-only';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { createPayment, getPayment, isMollieUrl, mockPaymentsEnabled, mollieEnabled } from './mollie';
import { pricingFor } from './pricing';
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from './locales';
import { findOrCreateUser, setFirstPassword } from './auth';
import { emailConfigured, sendConfirmationEmail } from './email';
import { recordCommissions } from './team';
import { createTicket } from './tickets';
import { PROGRAM_CURRENCY, PROGRAM_PRICE_CENTS, programBySlug, STUDENT_PROGRAM } from './catalog';
import { isOnSale } from './visibility';
import { siteUrl } from '@/lib/site';

export const TERMS_VERSION = '2026-10';
const HOLD_MINUTES = Number(process.env.HOLD_MINUTES ?? 15);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type University = {
  id: string;
  name: string;
  short_name: string;
  state: string;
  email_domains: string[];
};

export async function listUniversities(): Promise<University[]> {
  const rows = await sql(
    `select id, name, short_name, state, email_domains from universities
     where active order by name`,
  );
  return rows as University[];
}

// Registration always closes 7 days from today: on the 24th it closes on the 31st, on the 25th on the 1st…
// Each day has its own cohort, created on first use: registration closes that evening (Paris time)
// and lessons open the next morning.
const CLOSES_IN_DAYS = 7;

function rollingDates(now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
    .split('-')
    .map(Number);
  const deadline = new Date(Date.UTC(y, m - 1, d + CLOSES_IN_DAYS, 21, 59, 0)); // 22:59 or 23:59 in Paris
  const start = new Date(Date.UTC(y, m - 1, d + CLOSES_IN_DAYS + 1, 8, 0, 0));
  return { deadline, start };
}

/** The cohort students register for today (created if needed). */
export async function publicIntake() {
  const { deadline, start } = rollingDates();
  await sql(
    `insert into intakes (id, name, starts_at, registration_deadline, capacity, status)
     select $1, $2, $3, $4, 100000, 'open'
     where not exists (select 1 from intakes where registration_deadline = $4)`,
    [randomUUID(), `Start ${start.toISOString().slice(0, 10)}`, start.toISOString(), deadline.toISOString()],
  );
  const rows = await sql(
    `select i.*,
       i.capacity - (
         select count(*)::int from registrations r
         where r.intake_id = i.id
           and (r.status = 'paid' or (r.status = 'held' and r.hold_expires_at > now()))
       ) as seats_left
     from intakes i
     where i.registration_deadline = $1
     order by i.starts_at
     limit 1`,
    [deadline.toISOString()],
  );
  const i = rows[0];
  if (!i) return null;
  const deadlinePassed = new Date(i.registration_deadline) <= new Date();
  const status: 'open' | 'closed' | 'full' =
    i.status !== 'open' || deadlinePassed ? 'closed' : i.seats_left <= 0 ? 'full' : 'open';
  return {
    intake_id: i.id as string,
    name: i.name as string,
    status,
    starts_at: new Date(i.starts_at).toISOString(),
    registration_deadline: new Date(i.registration_deadline).toISOString(),
    seats_left: Math.max(0, Number(i.seats_left)),
  };
}

function reference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  return 'TAC-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type StartInput = {
  university_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  terms_accepted?: boolean;
  age_confirmed?: boolean;
  independence_acknowledged?: boolean;
  marketing_opt_in?: boolean;
  sms_opt_in?: boolean;
  utm?: Record<string, string>;
  locale?: string;
};

export async function startRegistration(input: StartInput) {
  const locale: Locale = isLocale(input.locale) ? input.locale : DEFAULT_LOCALE;
  const errors: Record<string, string> = {};
  const first = (input.first_name ?? '').trim();
  const last = (input.last_name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const phone = (input.phone ?? '').trim();

  if (!first) errors.first_name = 'Enter your first name.';
  if (!last) errors.last_name = 'Enter your last name.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!input.terms_accepted) errors.terms_accepted = 'Accept the program terms to continue.';
  if (!input.age_confirmed) errors.age_confirmed = 'You must be 18 or older.';
  if (!input.independence_acknowledged) errors.independence_acknowledged = 'Tick this box to continue.';

  const [uni] = input.university_id
    ? await sql('select * from universities where id = $1 and active', [input.university_id])
    : [];
  if (!uni) errors.university_id = 'Select your university.';
  if (Object.keys(errors).length) return { result: 'invalid' as const, errors };

  const intake = await publicIntake();
  if (!intake || intake.status === 'closed') return { result: 'closed' as const };
  if (intake.status === 'full') return { result: 'full' as const };

  const [paid] = await sql(
    `select 1 from registrations where lower(email) = $1 and intake_id = $2 and program = $3 and status = 'paid'`,
    [email, intake.intake_id, STUDENT_PROGRAM],
  );
  if (paid) return { result: 'already_registered' as const };

  // Release any earlier hold from the same student before creating a new one.
  await sql(
    `update registrations set status = 'expired'
     where lower(email) = $1 and intake_id = $2 and program = $3 and status = 'held'`,
    [email, intake.intake_id, STUDENT_PROGRAM],
  );

  const domain = email.split('@')[1];
  const domains: string[] = uni.email_domains ?? [];
  const mismatch = domains.length > 0 && !domains.some((d) => domain === d || domain.endsWith(`.${d}`));

  const price = pricingFor(locale);
  const id = randomUUID();
  const token = randomBytes(24).toString('base64url');
  const ref = reference();
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

  await sql(
    `insert into registrations (
       id, reference, client_token, intake_id, university_id, first_name, last_name, email, phone,
       email_domain_mismatch, terms_accepted, age_confirmed, independence_acknowledged,
       marketing_opt_in, sms_opt_in, terms_version, currency, amount_cents, status, hold_expires_at, utm, locale, program
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true,true,$11,$12,$13,$14,$15,'held',$16,$17,$18,$19)`,
    [
      id, ref, token, intake.intake_id, uni.id, first, last, email, phone,
      mismatch, Boolean(input.marketing_opt_in), Boolean(input.sms_opt_in), TERMS_VERSION,
      price.currency, price.priceCents, holdExpiresAt.toISOString(), JSON.stringify(input.utm ?? {}), locale, STUDENT_PROGRAM,
    ],
  );

  return {
    result: 'ok' as const,
    registration_id: id,
    client_token: token,
    reference: ref,
    hold_expires_at: holdExpiresAt.toISOString(),
    summary: {
      name: `${first} ${last}`,
      email,
      university: uni.name as string,
      intake: intake.name,
      starts_at: intake.starts_at,
      currency: price.currency,
      amount_cents: price.priceCents,
      corporate_cents: price.corporateCents,
    },
  };
}

async function findRegistration(id: string, token: string) {
  const [r] = await sql('select * from registrations where id = $1', [id]);
  if (!r || !sameToken(String(r.client_token), String(token ?? ''))) return null;
  return r;
}

export async function createCheckout(input: { registration_id?: string; client_token?: string }) {
  const r = await findRegistration(input.registration_id ?? '', input.client_token ?? '');
  if (!r) return { result: 'not_found' as const };
  if (r.status === 'paid') return { result: 'already_paid' as const };
  if (r.status !== 'held' || new Date(r.hold_expires_at) <= new Date()) {
    await sql(`update registrations set status = 'expired' where id = $1 and status = 'held'`, [r.id]);
    return { result: 'expired' as const };
  }

  const base = siteUrl();
  const redirectUrl = `${base}/confirmation?ref=${encodeURIComponent(r.reference)}&id=${r.id}&t=${encodeURIComponent(r.client_token)}&lang=${r.locale}`;

  if (await mockPaymentsEnabled()) {
    return {
      result: 'ok' as const,
      checkout_url: `/pay/mock?id=${r.id}&t=${encodeURIComponent(r.client_token)}&lang=${r.locale}`,
    };
  }
  if (!(await mollieEnabled())) return { result: 'payments_unavailable' as const };
  // Never take a payment the customer would get no confirmation or sign-in link for.
  if (!(await emailConfigured())) return { result: 'payments_unavailable' as const };

  // Payment page opened again (double click, Back from Mollie): reuse the open payment so nobody pays twice.
  if (r.payment_id) {
    const previous = await getPayment(r.payment_id).catch(() => null);
    if (previous?.status === 'paid') {
      await syncPayment(previous.id);
      return { result: 'already_paid' as const };
    }
    const href = previous?._links.checkout?.href;
    if (previous?.status === 'open' && href && isMollieUrl(href)) return { result: 'ok' as const, checkout_url: href };
  }

  try {
    const payment = await createPayment({
      amountCents: r.amount_cents,
      currency: r.currency,
      description: `The AI Certification ${programBySlug(r.program)?.title ?? (r.program === STUDENT_PROGRAM ? 'AI for students' : 'certification')} ${r.reference}`,
      redirectUrl,
      webhookUrl: base.startsWith('https://') ? `${base}/api/mollie/webhook` : undefined,
      registrationId: r.id,
      locale: MOLLIE_LOCALES[r.locale as Locale],
    });
    await sql('update registrations set payment_id = $2 where id = $1', [r.id, payment.id]);
    return { result: 'ok' as const, checkout_url: payment.checkoutUrl };
  } catch (err) {
    console.error(err);
    return { result: 'payments_unavailable' as const };
  }
}

const MOLLIE_LOCALES: Record<Locale, string> = { 'en-us': 'en_US', fr: 'fr_FR', es: 'es_ES', it: 'it_IT', de: 'de_DE' };

/** Updates a registration from its Mollie payment. Always reads the status from Mollie itself. */
export async function syncPayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  // A buyer who opened the payment page twice may pay the first one: the registration is found by the id
  // it was created for (metadata), not only by the latest payment saved on it.
  const [r] = await sql('select * from registrations where payment_id = $1 or id::text = $2 limit 1', [
    payment.id,
    payment.metadata?.registration_id ?? '',
  ]);
  if (!r || r.status === 'paid') return;
  if (payment.status === 'paid') {
    await sql(`update registrations set status = 'paid', paid_at = $2, payment_id = $3 where id = $1`, [
      r.id,
      payment.paidAt ?? new Date().toISOString(),
      payment.id,
    ]);
    await onPaid(r.id);
    await recordCommissions(r.id);
  } else if (['canceled', 'expired', 'failed'].includes(payment.status) && r.payment_id === payment.id) {
    // Only the latest payment decides: an abandoned earlier tab must not cancel a place still being paid for.
    await sql(`update registrations set status = $2 where id = $1 and status = 'held'`, [r.id, payment.status]);
  }
}

export async function registrationStatus(input: { registration_id?: string; client_token?: string }) {
  let r = await findRegistration(input.registration_id ?? '', input.client_token ?? '');
  if (!r) return { result: 'not_found' as const };

  // The webhook cannot reach a local machine, so check with Mollie directly too.
  if (r.status === 'held' && r.payment_id && (await mollieEnabled())) {
    try {
      await syncPayment(r.payment_id);
      r = (await findRegistration(r.id, r.client_token))!;
    } catch (err) {
      console.error(err);
    }
  }

  const [uni] = r.university_id ? await sql('select name from universities where id = $1', [r.university_id]) : [];
  const [intake] = await sql('select name, starts_at from intakes where id = $1', [r.intake_id]);
  const holdOver = r.status === 'held' && new Date(r.hold_expires_at) <= new Date();
  const [buyer] = r.user_id ? await sql('select password_hash is null as needs from users where id = $1', [r.user_id]) : [];
  return {
    result: 'ok' as const,
    status: holdOver ? 'expired' : (r.status as string),
    reference: r.reference as string,
    // Where "Try again" leads: the student offer, or the page of the certification bought.
    retry_path: r.program && r.program !== STUDENT_PROGRAM ? `/certifications/${r.program}/enroll` : null,
    email_domain_mismatch: Boolean(r.email_domain_mismatch),
    // Paid and no password yet: the confirmation page lets the buyer choose one right away.
    needs_password: r.status === 'paid' && Boolean(buyer?.needs),
    summary: {
      name: `${r.first_name} ${r.last_name}`,
      email: r.email as string,
      university: (uni?.name as string) ?? null,
      certification: programBySlug(r.program)?.title ?? null,
      organization: (r.organization as string) || null,
      intake: intake?.name as string,
      starts_at: new Date(intake?.starts_at).toISOString(),
      currency: r.currency as string,
      amount_cents: r.amount_cents as number,
    },
  };
}

/** Development only: marks a held registration as paid, standing in for Mollie. */
export async function mockPay(input: { registration_id?: string; client_token?: string; outcome?: string }) {
  if (!(await mockPaymentsEnabled())) return { result: 'not_found' as const };
  const r = await findRegistration(input.registration_id ?? '', input.client_token ?? '');
  if (!r || r.status !== 'held') return { result: 'not_found' as const };
  if (input.outcome === 'paid') {
    await sql(`update registrations set status = 'paid', paid_at = now(), payment_id = $2 where id = $1`, [
      r.id,
      `mock_${r.reference}`,
    ]);
    await onPaid(r.id);
    await recordCommissions(r.id);
  } else {
    await sql(`update registrations set status = 'canceled' where id = $1`, [r.id]);
  }
  return {
    result: 'ok' as const,
    redirect: `/confirmation?ref=${encodeURIComponent(r.reference)}&id=${r.id}&t=${encodeURIComponent(r.client_token)}&lang=${r.locale}`,
  };
}

export async function joinWaitlist(input: {
  first_name?: string;
  email?: string;
  reason?: string;
  intake_id?: string;
  university_id?: string;
  other_university_name?: string;
  consent?: boolean;
}) {
  const first = (input.first_name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  if (!first || !EMAIL_RE.test(email) || !input.consent) return { result: 'invalid' as const };
  const reasons = ['university_not_listed', 'full', 'closed', 'notify'];
  await sql(
    `insert into waitlist (id, first_name, email, reason, intake_id, university_id, other_university_name)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      randomUUID(),
      first,
      email,
      reasons.includes(input.reason ?? '') ? input.reason : 'notify',
      input.intake_id || null,
      input.university_id || null,
      (input.other_university_name ?? '').trim() || null,
    ],
  );
  // Seen in /admin as a ticket (there is no waitlist screen any more).
  const reason = reasons.includes(input.reason ?? '') ? input.reason! : 'notify';
  const label: Record<string, string> = {
    university_not_listed: 'Their school is not in the list',
    full: 'Session full, wants to be told',
    closed: 'Registration closed, wants to be told',
    notify: 'Wants to be told when it opens',
  };
  const [uni] = input.university_id ? await sql('select name from universities where id::text = $1', [input.university_id]) : [];
  const school = (input.other_university_name ?? '').trim() || uni?.name || '';
  await createTicket({
    name: first,
    email,
    category: 'other',
    message: `${label[reason]}.${school ? `\nSchool: ${school}` : ''}`,
    notify: false,
  });
  return { result: 'ok' as const };
}

/**
 * Runs once per paid registration: creates the student account and sends the
 * confirmation email with a sign-in link valid for 7 days.
 */
async function onPaid(registrationId: string) {
  const [r] = await sql(
    `select r.*, u.name as university_name, i.starts_at
     from registrations r
     left join universities u on u.id = r.university_id
     join intakes i on i.id = r.intake_id
     where r.id = $1 and r.status = 'paid' and r.user_id is null`,
    [registrationId],
  );
  if (!r) return;

  const locale: Locale = isLocale(r.locale) ? r.locale : DEFAULT_LOCALE;
  const user = await findOrCreateUser({ email: r.email, first_name: r.first_name, last_name: r.last_name, locale });
  // Claim the registration so a concurrent webhook cannot send the email twice.
  const claimed = await sql('update registrations set user_id = $2 where id = $1 and user_id is null returning id', [r.id, user.id]);
  if (!claimed[0]) return;

  const amount = new Intl.NumberFormat(LOCALES[locale].intl, {
    style: 'currency',
    currency: r.currency,
    maximumFractionDigits: r.amount_cents % 100 ? 2 : 0,
  }).format(r.amount_cents / 100);
  await sendConfirmationEmail({
    to: r.email,
    name: r.first_name,
    reference: r.reference,
    university: r.university_name,
    certification: programBySlug(r.program)?.title ?? null,
    startsAt: new Date(r.starts_at).toISOString(),
    amount,
    locale,
    registrationId: r.id,
  });
}

const AUDIENCES = ['company', 'school', 'association', 'student', 'other'];

/** Contact request from the general landing page (companies, schools, associations…). */
export async function saveLead(input: { name?: string; email?: string; organization?: string; audience?: string; message?: string }) {
  const name = (input.name ?? '').trim().slice(0, 200);
  const email = (input.email ?? '').trim().toLowerCase().slice(0, 200);
  if (!name || !EMAIL_RE.test(email)) return { result: 'invalid' as const };
  await sql(
    'insert into leads (id, name, email, organization, audience, message) values ($1, $2, $3, $4, $5, $6)',
    [
      randomUUID(),
      name,
      email,
      (input.organization ?? '').trim().slice(0, 200),
      AUDIENCES.includes(input.audience ?? '') ? input.audience : 'other',
      (input.message ?? '').trim().slice(0, 4000),
    ],
  );
  // Answered from /admin like every other request: it arrives as a ticket.
  const audience: Record<string, string> = { company: 'Company', school: 'School', association: 'Association', student: 'Student', other: 'Other' };
  const organization = (input.organization ?? '').trim().slice(0, 200);
  await createTicket({
    name,
    email,
    category: 'company',
    message: [`Contact request (${audience[input.audience ?? ''] ?? 'Other'}${organization ? ` · ${organization}` : ''})`, (input.message ?? '').trim() || '(no message)'].join('\n\n'),
  });
  return { result: 'ok' as const };
}

/**
 * Purchase of a catalogue certification at the full programme price (no university, no student funding).
 * Places it in the current intake like a student registration, so payment and confirmation work the same way.
 */
export async function startPurchase(input: {
  program?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  organization?: string;
  terms_accepted?: boolean;
  age_confirmed?: boolean;
  marketing_opt_in?: boolean;
  utm?: Record<string, string>;
}) {
  const found = programBySlug(input.program ?? '');
  // Certifications sold elsewhere (the student programme) cannot be bought here.
  const program = found && !found.href ? found : null;
  const first = (input.first_name ?? '').trim();
  const last = (input.last_name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const errors: Record<string, string> = {};
  if (!program || !(await isOnSale(program.slug))) errors.program = 'This certification is not open yet.';
  if (!first) errors.first_name = 'Enter your first name.';
  if (!last) errors.last_name = 'Enter your last name.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!input.terms_accepted) errors.terms_accepted = 'Accept the terms to continue.';
  if (!input.age_confirmed) errors.age_confirmed = 'You must be 18 or older.';
  if (Object.keys(errors).length || !program) return { result: 'invalid' as const, errors };

  const intake = await publicIntake();
  if (!intake || intake.status === 'closed') return { result: 'closed' as const };
  if (intake.status === 'full') return { result: 'full' as const };

  const [paid] = await sql(
    `select 1 from registrations where lower(email) = $1 and intake_id = $2 and program = $3 and status = 'paid'`,
    [email, intake.intake_id, program.slug],
  );
  if (paid) return { result: 'already_registered' as const };
  await sql(
    `update registrations set status = 'expired' where lower(email) = $1 and intake_id = $2 and program = $3 and status = 'held'`,
    [email, intake.intake_id, program.slug],
  );

  const id = randomUUID();
  const token = randomBytes(24).toString('base64url');
  const ref = reference();
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  await sql(
    `insert into registrations (
       id, reference, client_token, intake_id, university_id, first_name, last_name, email, phone,
       email_domain_mismatch, terms_accepted, age_confirmed, independence_acknowledged,
       marketing_opt_in, sms_opt_in, terms_version, currency, amount_cents, status, hold_expires_at, utm, locale,
       program, organization
     ) values ($1,$2,$3,$4,null,$5,$6,$7,'',false,true,true,false,$8,false,$9,$10,$11,'held',$12,$13,'en-us',$14,$15)`,
    [
      id, ref, token, intake.intake_id, first, last, email, Boolean(input.marketing_opt_in), TERMS_VERSION,
      PROGRAM_CURRENCY, PROGRAM_PRICE_CENTS, holdExpiresAt.toISOString(), JSON.stringify(input.utm ?? {}),
      program.slug, (input.organization ?? '').trim().slice(0, 200),
    ],
  );
  return {
    result: 'ok' as const,
    registration_id: id,
    client_token: token,
    reference: ref,
    hold_expires_at: holdExpiresAt.toISOString(),
    summary: {
      name: `${first} ${last}`,
      email,
      certification: program.title,
      starts_at: intake.starts_at,
      currency: PROGRAM_CURRENCY,
      amount_cents: PROGRAM_PRICE_CENTS,
    },
  };
}

/** From the confirmation page, right after paying: the buyer chooses a password and is signed in. */
export async function passwordAfterPayment(input: { registration_id?: string; client_token?: string; password?: string }) {
  const r = await findRegistration(input.registration_id ?? '', input.client_token ?? '');
  if (!r || r.status !== 'paid' || !r.user_id) return { result: 'not_found' as const };
  const user = await setFirstPassword(r.user_id, String(input.password ?? ''));
  return user ? { result: 'ok' as const, redirect: `/space?lang=${r.locale}` } : { result: 'already_set' as const };
}

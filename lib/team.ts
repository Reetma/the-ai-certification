import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';
import { createLoginToken, findOrCreateUser, type User } from './auth';
import { sendAmbassadorWelcome } from './email';
import { createTicket } from './tickets';

// Commission rates in basis points (1000 = 10 %), applied to the amount the student paid.
export const RATES = {
  owner: Number(process.env.TEAM_RATE_OWNER_BP ?? 1000), // ambassador who holds the student's school
  parent: Number(process.env.TEAM_RATE_PARENT_BP ?? 1000), // the ambassador who invited them
  grandparent: Number(process.env.TEAM_RATE_GRANDPARENT_BP ?? 500), // the one above: nothing further up
};
export const AMBASSADOR_TERMS_VERSION = '2026-10-25';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newInviteCode() {
  // 10 lowercase letters/digits: used as the whole invite address, e.g. /k7q2m9xa4t.
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join('');
}

/** Ambassador row for a user, created on first use (admins get one too, to invite the first ambassadors). */
export async function ensureAmbassador(userId: string, parentUserId: string | null = null) {
  const [row] = await sql('select * from ambassadors where user_id = $1', [userId]);
  if (row) return row;
  for (let i = 0; i < 5; i++) {
    const created = await sql(
      `insert into ambassadors (user_id, invite_code, parent_user_id, terms_version) values ($1, $2, $3, $4)
       on conflict do nothing returning *`,
      [userId, newInviteCode(), parentUserId, AMBASSADOR_TERMS_VERSION],
    );
    if (created[0]) return created[0];
    const [again] = await sql('select * from ambassadors where user_id = $1', [userId]);
    if (again) return again;
  }
  throw new Error('could not create invite code');
}

export async function inviterByCode(code: string) {
  if (!/^[a-z0-9]{10}$/.test(code)) return null;
  const [row] = await sql(
    `select a.user_id, u.first_name, u.role from ambassadors a join users u on u.id = a.user_id where a.invite_code = $1`,
    [code],
  );
  return row ?? null;
}

export async function freeSchools() {
  const rows = await sql(
    `select u.id, u.name, u.state from universities u
     where u.active and not exists (select 1 from school_claims c where c.university_id = u.id)`,
  );
  // Alphabetical as people expect it: « École » with the E's, not after Z.
  return rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr', { sensitivity: 'base', numeric: true }));
}

export type JoinResult = { ok: true } | { ok: false; error: 'invalid' | 'taken' | 'exists' | 'terms' | 'school' };

/**
 * The school picked in a form: a listed one, one the ambassador typed because it is missing (created, or found
 * if a school of that name already exists, so it also appears for students), or none at all.
 */
export async function pickedSchool(universityId: string, newName = '', newCity = ''): Promise<{ id: string } | { none: true } | null> {
  if (universityId === 'none') return { none: true };
  if (universityId === 'new') {
    const name = newName.trim().replace(/\s+/g, ' ').slice(0, 160);
    if (name.length < 3) return null;
    const [found] = await sql('select id from universities where lower(name) = lower($1) limit 1', [name]);
    if (found) return { id: String(found.id) };
    const id = randomUUID();
    await sql(`insert into universities (id, name, short_name, state, email_domains, active) values ($1, $2, '', $3, '{}', true)`, [id, name, newCity.trim().slice(0, 80)]);
    return { id };
  }
  const [row] = await sql('select id from universities where id::text = $1 and active', [universityId]);
  return row ? { id: String(row.id) } : null;
}

/** Self-service sign-up from an invite link: creates the ambassador, gives them the school, emails a sign-in link. */
export async function joinTeam(input: {
  code: string;
  first_name: string;
  last_name: string;
  email: string;
  university_id: string;
  new_school?: string;
  new_school_city?: string;
  terms: boolean;
}): Promise<JoinResult> {
  const inviter = await inviterByCode(input.code);
  const email = input.email.trim().toLowerCase();
  if (!inviter || !input.first_name.trim() || !input.last_name.trim() || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'invalid' };
  }
  if (!input.terms) return { ok: false, error: 'terms' };

  const [existing] = await sql(
    `select a.user_id from ambassadors a join users u on u.id = a.user_id where u.email = $1`,
    [email],
  );
  if (existing) return { ok: false, error: 'exists' };

  const school = await pickedSchool(input.university_id, input.new_school, input.new_school_city);
  if (!school) return { ok: false, error: 'school' };
  if ('id' in school) {
    const [taken] = await sql('select 1 from school_claims where university_id = $1', [school.id]);
    if (taken) return { ok: false, error: 'taken' };
  }

  const user = await findOrCreateUser({ email, first_name: input.first_name.trim(), last_name: input.last_name.trim(), locale: 'en-us' });

  // First come, first served: the school belongs to one ambassador. No school: they grow a team instead.
  if ('id' in school) {
    const claimed = await sql(
      'insert into school_claims (university_id, user_id) values ($1, $2) on conflict do nothing returning university_id',
      [school.id, user.id],
    );
    // Taken in the meantime: leave the account exactly as it was.
    if (!claimed[0]) return { ok: false, error: 'taken' };
  }
  if (user.role === 'student') await sql(`update users set role = 'ambassador' where id = $1`, [user.id]);

  // Invited by an admin = first level, with no one above.
  await ensureAmbassador(user.id, inviter.role === 'admin' ? null : inviter.user_id);
  const token = await createLoginToken(user.id, 7 * 24 * 60);
  await sendAmbassadorWelcome({ to: user.email, firstName: user.first_name, token, ownerRate: RATES.owner / 100, parentRate: RATES.parent / 100, secondRate: RATES.grandparent / 100, termsVersion: AMBASSADOR_TERMS_VERSION });
  return { ok: true };
}

export async function claimSchool(userId: string, universityId: string) {
  const claimed = await sql(
    `insert into school_claims (university_id, user_id)
     select $1, $2 where exists (select 1 from universities where id = $1 and active)
     on conflict do nothing returning university_id`,
    [universityId, userId],
  );
  return Boolean(claimed[0]);
}

/** Schools an ambassador holds. One is taken freely; any further one is asked for (requestSchool). */
export async function schoolCount(userId: string) {
  const [r] = await sql('select count(*)::int as n from school_claims where user_id = $1', [userId]);
  return Number(r.n);
}

/** A request for one more school: stored, and a ticket so it is seen in /admin. */
export async function requestSchool(userId: string, input: { universityId: string; newName: string; newCity: string }) {
  const listed = input.universityId && input.universityId !== 'new';
  const name = input.newName.trim().replace(/\s+/g, ' ').slice(0, 160);
  if (!listed && name.length < 3) return 'pick';
  const [school] = listed ? await sql('select id, name from universities where id::text = $1 and active', [input.universityId]) : [];
  if (listed && !school) return 'pick';
  if (school) {
    const [taken] = await sql('select 1 from school_claims where university_id = $1', [school.id]);
    if (taken) return 'taken';
  }
  const [open] = await sql(`select 1 from school_requests where user_id = $1 and status = 'pending'`, [userId]);
  if (open) return 'pending';
  await sql(
    `insert into school_requests (id, user_id, university_id, new_name, new_city) values ($1, $2, $3, $4, $5)`,
    [randomUUID(), userId, school?.id ?? null, school ? '' : name, school ? '' : input.newCity.trim().slice(0, 80)],
  );
  const [u] = await sql('select first_name, last_name, email from users where id = $1', [userId]);
  await createTicket({
    name: `${u.first_name} ${u.last_name}`.trim() || u.email,
    email: u.email,
    category: 'school',
    message: `Asks for one more school: ${school ? school.name : `${name} (to add${input.newCity.trim() ? `, ${input.newCity.trim()}` : ''})`}.\nAccept or refuse it in /admin → Ambassadors.`,
    locale: 'en-us',
    notify: false,
  });
  return 'requested';
}

/** Admin decision on a school request: accepted = the school is given (created first if it was typed). */
export async function decideSchoolRequest(requestId: string, accept: boolean) {
  const [r] = await sql(`select * from school_requests where id::text = $1 and status = 'pending'`, [requestId]);
  if (!r) return 'gone';
  if (!accept) {
    await sql(`update school_requests set status = 'refused', decided_at = now() where id = $1`, [r.id]);
    return 'refused';
  }
  const school = r.university_id ? { id: String(r.university_id) } : await pickedSchool('new', r.new_name, r.new_city);
  if (!school || !('id' in school) || !(await claimSchool(String(r.user_id), school.id))) return 'taken';
  await sql(`update school_requests set status = 'accepted', decided_at = now(), university_id = $2 where id = $1`, [r.id, school.id]);
  return 'accepted';
}

/**
 * Called once a registration is paid: the ambassador holding the student's school earns the owner rate,
 * the one who invited them the parent rate, and the one above that the grandparent rate; nobody further up
 * (and never the admin, whose invites start a branch with no one above). Idempotent per ambassador and registration.
 */
export async function recordCommissions(registrationId: string) {
  const [r] = await sql(
    `select r.id, r.amount_cents, r.currency, c.user_id as owner_id, a.parent_user_id, p.parent_user_id as grandparent_user_id
     from registrations r
     join school_claims c on c.university_id = r.university_id
     join ambassadors a on a.user_id = c.user_id
     left join ambassadors p on p.user_id = a.parent_user_id
     where r.id = $1 and r.status = 'paid'`,
    [registrationId],
  );
  if (!r) return;
  const lines: { user: string; level: number; rate: number }[] = [{ user: r.owner_id, level: 1, rate: RATES.owner }];
  if (r.parent_user_id) lines.push({ user: r.parent_user_id, level: 2, rate: RATES.parent });
  if (r.grandparent_user_id) lines.push({ user: r.grandparent_user_id, level: 3, rate: RATES.grandparent });
  // Admins see the whole network but never earn commissions.
  const admins = new Set((await sql(`select id from users where role = 'admin' and id = any($1)`, [lines.map((l) => l.user)])).map((u) => String(u.id)));
  for (const l of lines.filter((l) => !admins.has(String(l.user)))) {
    await sql(
      `insert into commissions (id, user_id, registration_id, level, rate_bp, amount_cents, currency)
       values ($1, $2, $3, $4, $5, $6, $7) on conflict (user_id, registration_id) do nothing`,
      [randomUUID(), l.user, r.id, l.level, l.rate, Math.round((r.amount_cents * l.rate) / 10000), r.currency],
    );
  }
}

export async function saveBankDetails(userId: string, holder: string, iban: string) {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (!holder.trim() || !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(clean)) return false;
  await sql('update ambassadors set iban = $2, iban_holder = $3 where user_id = $1', [userId, clean, holder.trim()]);
  return true;
}

/** Turns every owed commission into one payout request per currency. */
export async function requestPayout(userId: string) {
  const [amb] = await sql('select iban, iban_holder from ambassadors where user_id = $1', [userId]);
  if (!amb?.iban) return 'no_iban';
  const owed = await sql(
    `select currency, sum(amount_cents)::int as cents from commissions where user_id = $1 and status = 'owed' group by currency`,
    [userId],
  );
  if (!owed.length) return 'nothing';
  const lines: string[] = [];
  for (const o of owed) {
    const id = randomUUID();
    await sql(
      `insert into payouts (id, user_id, currency, amount_cents, iban, iban_holder) values ($1, $2, $3, $4, $5, $6)`,
      [id, userId, o.currency, o.cents, amb.iban, amb.iban_holder],
    );
    await sql(
      `update commissions set status = 'requested', payout_id = $3 where user_id = $1 and currency = $2 and status = 'owed'`,
      [userId, o.currency, id],
    );
    lines.push(new Intl.NumberFormat('en-GB', { style: 'currency', currency: o.currency }).format(o.cents / 100));
  }
  // A ticket in /admin so the transfer is not forgotten: it is promised within 48 hours.
  const [u] = await sql('select first_name, last_name, email from users where id = $1', [userId]);
  await createTicket({
    name: `${u.first_name} ${u.last_name}`.trim() || u.email,
    email: u.email,
    category: 'payout',
    message: [
      `Ambassador payout request: ${lines.join(' + ')}.`,
      `Account holder: ${amb.iban_holder}`,
      `IBAN : ${amb.iban}`,
      'Transfer within 48 hours, then mark the payout as paid in /admin → Payouts.',
    ].join('\n'),
    locale: 'en-us',
    notify: false,
  });
  return 'ok';
}

export async function markPayoutPaid(payoutId: string) {
  await sql(`update payouts set status = 'paid', paid_at = now() where id = $1 and status = 'requested'`, [payoutId]);
  await sql(`update commissions set status = 'paid' where payout_id = $1`, [payoutId]);
}

export async function releaseSchool(universityId: string) {
  await sql('delete from school_claims where university_id = $1', [universityId]);
}

export type Ambassador = User;

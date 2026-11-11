import 'server-only';
import { randomUUID } from 'node:crypto';
import { sql } from './db';
import { company } from './company';
import { member } from './i18n/member';
import { setting } from './settings';
import { formatDate, LOCALES, type Locale } from './locales';
import { siteUrl } from '@/lib/site';
import { SITE_DOMAIN, SITE_NAME } from './site';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(locale: Locale, body: string) {
  const t = member(locale).email;
  return `<!doctype html><html lang="${LOCALES[locale].lang}"><body style="margin:0;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;color:#17274C">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(23,39,76,.10)">
<div style="background:#17274C;padding:18px 28px">
<img src="${base()}/assets/logo-email-white.png" width="173" height="30" alt="The AI Certification" style="display:block;border:0">
</div>
<div style="background:#EAEFF8;text-align:center;padding:24px 0 0">
<img src="${base()}/assets/kai-email.png" width="170" height="170" alt="" style="display:block;margin:0 auto;border:0">
</div>
<div style="padding:28px">${body}</div>
</div>
<div style="background:#FFF4E5;border:1px solid #F5C77E;border-radius:14px;padding:16px 18px;margin:20px 0 0">
<p style="font-size:15px;font-weight:700;margin:0 0 4px;color:#7A4100">${esc(t.noReply)}</p>
<p style="font-size:14px;margin:0 0 14px;color:#7A4100">${esc(t.helpQuestion)}</p>
<a href="${esc(`${base()}/support?lang=${locale}`)}" style="display:inline-block;background:#17274C;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:999px">${esc(t.helpButton)} &rarr;</a>
</div>
<p style="font-size:12px;color:#4A5370;margin:20px 0 0;text-align:center">${esc(company.name ? t.footer(company.name) : SITE_NAME)} · <a href="${esc(base())}" style="color:#4A5370">${esc(SITE_DOMAIN)}</a></p>
</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0;text-align:center"><a href="${esc(href)}" style="display:inline-block;background:#1F3A75;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 32px;border-radius:999px">${esc(label)} &rarr;</a></p>`;

/**
 * Sends an email through SMTP (SMTP_USER/SMTP_PASS, e.g. Gmail) or Resend (RESEND_API_KEY) when configured. Every email is also kept
 * in the `emails` table so the admin can see it; without a key it is only stored (and logged in development).
 */
async function send(input: { to: string; subject: string; html: string; kind: string; locale: Locale; registrationId?: string }) {
  const id = randomUUID();
  let status = 'stored';
  let providerId: string | null = null;
  let error: string | null = null;
  let resendKey: string | undefined;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    // SMTP, e.g. Gmail with an app password: SMTP_USER=you@gmail.com.
    try {
      const nodemailer = (await import('nodemailer')).default;
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: Number(process.env.SMTP_PORT ?? 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const info = await transport.sendMail({
        from: (await setting('EMAIL_FROM')) ?? `The AI Certification <${process.env.SMTP_USER}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      status = 'sent';
      providerId = info.messageId ?? null;
    } catch (err) {
      status = 'failed';
      error = String(err).slice(0, 500);
    }
  } else if ((resendKey = await setting('RESEND_API_KEY'))) {
    try {
      const res = await fetch(`${(process.env.NODE_ENV !== 'production' && process.env.RESEND_API_BASE) || 'https://api.resend.com'}/emails`, {
        method: 'POST',
        headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: (await setting('EMAIL_FROM')) ?? `${SITE_NAME} <noreply@${SITE_DOMAIN}>`,
          to: [input.to],
          subject: input.subject,
          html: input.html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        status = 'sent';
        providerId = data.id ?? null;
      } else {
        status = 'failed';
        error = JSON.stringify(data).slice(0, 500);
      }
    } catch (err) {
      status = 'failed';
      error = String(err).slice(0, 500);
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`[email:${input.kind}] to ${input.to}: ${input.subject}`);
  }

  await sql(
    `insert into emails (id, to_email, subject, kind, locale, html, status, provider_id, error, registration_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, input.to, input.subject, input.kind, input.locale, input.html, status, providerId, error, input.registrationId ?? null],
  );
  return status;
}

/** True when emails can actually be delivered (SMTP or Resend). */
export async function emailConfigured() {
  return Boolean((process.env.SMTP_USER && process.env.SMTP_PASS) || (await setting('RESEND_API_KEY')));
}

const base = () => siteUrl();

export function loginUrl(token: string, locale: Locale) {
  return `${base()}/login/password?token=${encodeURIComponent(token)}&lang=${locale}`;
}

export function sendLoginEmail(to: string, token: string, locale: Locale) {
  const t = member(locale).email;
  const html = layout(
    locale,
    `<p style="font-size:16px;margin:0">${esc(t.loginIntro)}</p>${button(loginUrl(token, locale), t.loginButton)}<p style="font-size:13px;color:#4A5370;margin:0">${esc(t.ignore)}</p>`,
  );
  return send({ to, subject: t.loginSubject, html, kind: 'login', locale });
}

export function sendConfirmationEmail(input: {
  to: string;
  name: string;
  reference: string;
  university?: string | null;
  certification?: string | null;
  startsAt: string;
  amount: string;
  locale: Locale;
  registrationId: string;
}) {
  const t = member(input.locale).email;
  const row = (k: string, v: string, last = false) =>
    `<tr><td style="padding:10px 0;color:#4A5370;${last ? '' : 'border-bottom:1px solid #E1E5EC'}">${esc(k)}</td><td style="padding:10px 0;text-align:right;font-weight:700;${last ? '' : 'border-bottom:1px solid #E1E5EC'}">${esc(v)}</td></tr>`;
  const html = layout(
    input.locale,
    `<p style="margin:0 0 12px"><span style="display:inline-block;background:#EAEFF8;color:#1F3A75;font-weight:700;font-size:13px;padding:6px 12px;border-radius:999px">&#10003; ${esc(t.confirmBadge)}</span></p>
<p style="font-size:24px;line-height:1.25;font-weight:800;margin:0 0 20px">${esc(t.confirmIntro(input.name))}</p>
<div style="background:#F7F8FA;border-radius:14px;padding:6px 18px">
<table style="width:100%;border-collapse:collapse;font-size:14px">${row(t.reference, input.reference)}${input.certification ? row('Certification', input.certification) : ''}${input.university ? row(t.university, input.university) : ''}${row(t.paid, input.amount, true)}</table>
</div>
<p style="font-size:15px;line-height:1.5;margin:22px 0 0">${esc(t.confirmNext)}</p>${button(`${base()}/login?lang=${input.locale}`, t.spaceButton)}
<p style="font-size:12px;color:#4A5370;margin:0;text-align:center">${esc(t.receipt)}</p>`,
  );
  return send({ to: input.to, subject: t.confirmSubject(input.reference), html, kind: 'confirmation', locale: input.locale, registrationId: input.registrationId });
}

const TICKET_TEXT = {
  fr: {
    received: (ref: string) => `Nous avons bien reçu ta demande (${ref})`,
    receivedIntro: 'Merci ! Ta demande est enregistrée. Nous te répondons par email sous 7 jours ouvrés. Voici ton message :',
    reply: (ref: string) => `Réponse à ta demande ${ref}`,
    replyIntro: 'Voici notre réponse :',
    followUp: 'Pour donner une suite, ouvre une nouvelle demande et indique cette référence.',
  },
  en: {
    received: (ref: string) => `We received your request (${ref})`,
    receivedIntro: 'Thanks! Your request is logged. We answer by email within 7 working days. Here is your message:',
    reply: (ref: string) => `Answer to your request ${ref}`,
    replyIntro: 'Here is our answer:',
    followUp: 'To follow up, open a new request and mention this reference.',
  },
};

/** Ticket emails: the acknowledgement when a request is opened, and each answer from the team. */
export function sendTicketEmail(input: { to: string; reference: string; locale: Locale; kind: 'received' | 'reply'; body: string }) {
  const t = input.locale === 'fr' ? TICKET_TEXT.fr : TICKET_TEXT.en;
  const quote = `<div style="white-space:pre-line;background:#F7F8FA;border-radius:12px;padding:16px;margin:12px 0;font-size:15px">${esc(input.body)}</div>`;
  const html =
    input.kind === 'received'
      ? layout(input.locale, `<p style="font-size:16px;margin:0">${esc(t.receivedIntro)}</p>${quote}${button(`${base()}/support?lang=${input.locale}`, `${SITE_DOMAIN}/support`)}`)
      : layout(input.locale, `<p style="font-size:16px;margin:0">${esc(t.replyIntro)}</p>${quote}<p style="font-size:13px;color:#4A5370">${esc(t.followUp)} (${esc(input.reference)})</p>`);
  return send({ to: input.to, subject: input.kind === 'received' ? t.received(input.reference) : t.reply(input.reference), html, kind: `ticket_${input.kind}`, locale: input.locale });
}

/** "Tester" button of the admin settings: a short email to the admin. */
export function sendTestEmail(to: string) {
  const html = layout('fr', '<p style="font-size:18px;font-weight:800;margin:0 0 8px">Test réussi</p><p style="font-size:15px;margin:0">Les e-mails de The AI Certification partent correctement.</p>');
  return send({ to, subject: 'The AI Certification : test d’envoi des e-mails', html, kind: 'test', locale: 'fr' });
}

/** Welcome email of a new ambassador: the link to choose a password and the terms of the programme. */
export function sendAmbassadorWelcome(input: { to: string; firstName: string; token: string; ownerRate: number; parentRate: number; secondRate: number; termsVersion: string }) {
  const li = (s: string) => `<li style="margin:0 0 8px">${s}</li>`;
  const html = layout(
    'en-us',
    `<p style="font-size:22px;font-weight:800;margin:0 0 12px">Welcome to the ambassador programme${input.firstName ? `, ${esc(input.firstName)}` : ''}!</p>
<p style="font-size:15px;line-height:1.5;margin:0">Choose your password to open your ambassador space. The link works once and is valid for 7 days.</p>
${button(loginUrl(input.token, 'en-us'), 'Choose my password')}
<p style="font-weight:800;margin:8px 0 8px">Your ambassador terms (version ${esc(input.termsVersion)}), in short</p>
<ul style="padding-left:20px;margin:0;font-size:14px;line-height:1.5">
${li(`You earn <strong>${input.ownerRate} %</strong> of every payment made by a student of your schools, <strong>${input.parentRate} %</strong> of the payments at the schools of the ambassadors you invite directly, and <strong>${input.secondRate} %</strong> at the schools of the ambassadors they invite (nothing further down).`)}
${li('Joining is free, nothing has to be bought, and nothing is earned just for recruiting: every commission comes from a real student purchase. That is what makes the programme legal (it is not a pyramid scheme).')}
${li('A commission is recorded when the student’s payment is confirmed, and cancelled if the payment is refunded or disputed.')}
${li('Add your IBAN in your space and request a payout: The AI Certification sends the funds by bank transfer within 48 hours.')}
${li('Be honest: certifications are private certificates, not university diplomas, The AI Certification is independent from schools, and you must say that you earn a commission. No spam.')}
${li('You are an independent partner, responsible for declaring your income.')}
</ul>
<p style="margin:16px 0 0"><a href="${esc(`${base()}/ambassador-terms`)}" style="color:#1F3A75;font-weight:700">Read the full ambassador terms →</a></p>
<p style="font-size:11px;color:#4A5370;margin:20px 0 0">To receive your commissions in France you need a business status, for example a micro-entreprise (auto-entrepreneur). Outside France, the equivalent status in your country.</p>`,
  );
  return send({ to: input.to, subject: 'Welcome to The AI Certification ambassador programme', html, kind: 'ambassador_welcome', locale: 'en-us' });
}

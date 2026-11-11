import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';
import { sendTicketEmail } from './email';
import { isLocale, type Locale } from './locales';

// Support tickets: every question or complaint goes through the form on /support and is answered from the admin console.

export const TICKET_CATEGORIES = ['registration', 'payment', 'access', 'certificate', 'company', 'refund', 'payout', 'school', 'other'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'TCK-' + Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
}

export async function createTicket(input: {
  name: string;
  email: string;
  category: string;
  registration_ref?: string;
  message: string;
  locale?: string;
  /** false for tickets opened by the site itself (internal notes the customer should not receive). */
  notify?: boolean;
}): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  const message = input.message.trim().slice(0, 5000);
  const category = (TICKET_CATEGORIES as readonly string[]).includes(input.category) ? input.category : 'other';
  const locale: Locale = isLocale(input.locale) ? input.locale : 'en-us';
  if (!name || !EMAIL_RE.test(email) || message.length < 5) return { ok: false, error: 'invalid' };

  const id = randomUUID();
  const ref = reference();
  await sql(
    `insert into tickets (id, reference, name, email, category, registration_ref, locale) values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, ref, name, email, category, (input.registration_ref ?? '').trim().slice(0, 40), locale],
  );
  await sql(`insert into ticket_messages (id, ticket_id, author, body) values ($1, $2, 'customer', $3)`, [randomUUID(), id, message]);
  if (input.notify !== false) await sendTicketEmail({ to: email, reference: ref, locale, kind: 'received', body: message });
  return { ok: true, reference: ref };
}

/** An answer from the admin console: stored, emailed to the customer, ticket marked answered. */
export async function replyToTicket(ticketId: string, body: string) {
  const text = body.trim();
  if (!text) return false;
  const [t] = await sql('select * from tickets where id::text = $1', [ticketId]);
  if (!t) return false;
  await sql(`insert into ticket_messages (id, ticket_id, author, body) values ($1, $2, 'admin', $3)`, [randomUUID(), t.id, text.slice(0, 10000)]);
  await sql(`update tickets set status = 'answered', updated_at = now() where id = $1`, [t.id]);
  await sendTicketEmail({ to: t.email, reference: t.reference, locale: isLocale(t.locale) ? t.locale : 'en-us', kind: 'reply', body: text });
  return true;
}

export async function setTicketStatus(ticketId: string, status: 'open' | 'answered' | 'closed') {
  await sql('update tickets set status = $2, updated_at = now() where id::text = $1', [ticketId, status]);
}

import Link from 'next/link';
import { sql } from '@/lib/db';
import { PRIVATE_SLUGS } from '@/lib/private';
import { replyTicketAction, ticketStatusAction } from '@/lib/privateActions';

// Admin "Tickets" tab: every request sent from /support, answered from here by email.

const STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: 'To handle', tone: 'warn' },
  answered: { label: 'Answered', tone: 'ok' },
  closed: { label: 'Closed', tone: 'muted' },
};
const CATEGORY: Record<string, string> = {
  registration: 'Registration', payment: 'Payment', access: 'Access', certificate: 'Certificate', company: 'Company / school', refund: 'Refund', payout: 'Ambassador payout', school: 'School request', other: 'Other',
};
const dt = (v: string | Date) => new Date(v).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const href = (q: string) => `/${PRIVATE_SLUGS.admin}?tab=tickets${q}`;

function Badge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'muted' };
  return <span className={`cx-badge tone-${s.tone}`}>{s.label}</span>;
}

export default async function Tickets({ id, status }: { id: string; status: string }) {
  if (id) {
    const [t] = await sql('select * from tickets where id::text = $1', [id]);
    if (t) {
      const thread = await sql('select * from ticket_messages where ticket_id = $1 order by created_at', [t.id]);
      return (
        <section className="cx-card">
          <p><Link href={`/${PRIVATE_SLUGS.admin}?tab=tickets`}>← All tickets</Link></p>
          <div className="cx-toolbar">
            <h2>{t.reference} <Badge status={t.status} /></h2>
            <form action={ticketStatusAction}>
              <input type="hidden" name="ticket_id" value={t.id} />
              <input type="hidden" name="status" value={t.status === 'closed' ? 'open' : 'closed'} />
              <button className="btn btn-sm btn-ghost" type="submit">{t.status === 'closed' ? 'Reopen' : 'Close the ticket'}</button>
            </form>
          </div>
          <p className="help">
            {t.name} · {t.email} · {CATEGORY[t.category] ?? t.category}{t.registration_ref ? ` · ${t.registration_ref}` : ''} · /{t.locale} · {dt(t.created_at)}
          </p>
          {thread.map((m) => (
            <div key={m.id} className={`cx-ticket-msg is-${m.author}`}>
              <small>{m.author === 'admin' ? 'The AI Certification' : t.name} · {dt(m.created_at)}</small>
              <p>{m.body}</p>
            </div>
          ))}
          <form action={replyTicketAction} className="form" style={{ marginTop: 16 }}>
            <input type="hidden" name="ticket_id" value={t.id} />
            <div className="field">
              <label htmlFor="reply">Reply (sent by email to {t.email})</label>
              <textarea id="reply" name="body" rows={6} required />
            </div>
            <div><button className="btn btn-green" type="submit">Send the reply</button></div>
          </form>
        </section>
      );
    }
  }

  const rows = await sql(
    `select t.*, (select body from ticket_messages m where m.ticket_id = t.id order by created_at limit 1) as first
     from tickets t where ($1 = '' or t.status = $1)
     order by (t.status = 'open') desc, t.updated_at desc limit 500`,
    [status],
  );
  return (
    <section className="cx-card">
      <div className="cx-toolbar">
        <h2>Tickets <small>({rows.filter((r) => r.status === 'open').length} to handle)</small></h2>
        <nav className="cx-pills" aria-label="Status">
          {[['', 'All'], ['open', 'To handle'], ['answered', 'Answered'], ['closed', 'Closed']].map(([k, v]) => (
            <Link key={k} href={href(k ? `&status=${k}#tickets` : '#tickets')} aria-current={status === k ? 'page' : undefined}>{v}</Link>
          ))}
        </nav>
      </div>
      <div className="cx-scroll">
        <table className="cx-table">
          <thead><tr><th>Received</th><th>Ticket</th><th>Topic</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{dt(r.created_at)}</td>
                <td><Link href={href(`&id=${r.id}`)}><strong>{r.reference}</strong></Link><small>{r.name} · {r.email}</small></td>
                <td>{CATEGORY[r.category] ?? r.category}</td>
                <td style={{ maxWidth: 420 }}><small>{String(r.first ?? '').slice(0, 160)}</small></td>
                <td><Badge status={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No ticket.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import Link from 'next/link';
import type { User } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getCourse, lessonIdsOf } from '@/lib/learning';
import { LOCALES, isLocale } from '@/lib/locales';
import Tickets from '@/components/private/Tickets';
import Settings from '@/components/private/Settings';
import { ADMIN_TABS, AdminHeader } from '@/components/private/ConsoleHeaders';
import { programBySlug } from '@/lib/catalog';
import { decideSchoolRequestAction, markPayoutPaidAction } from '@/lib/privateActions';
import { setting } from '@/lib/settings';

// Admin console, rendered by app/[locale]/page.tsx for signed-in admins only.
// It has no route of its own, so for anyone else its address behaves like any unknown address.
type Params = Record<string, string | string[] | undefined>;


const STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: 'Paid', tone: 'ok' },
  held: { label: 'Paying now', tone: 'warn' },
  expired: { label: 'Not paid', tone: 'muted' },
  canceled: { label: 'Not paid', tone: 'muted' },
  failed: { label: 'Not paid', tone: 'muted' },
};
// Filters of the Students table: expired, cancelled and failed are all “not paid”.
const FILTERS: [string, string][] = [['', 'All'], ['paid', 'Paid'], ['unpaid', 'Not paid'], ['certified', 'Certified']];

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const dt = (v: string | Date | null) =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const bought = (r: { uni?: string | null; program?: string; organization?: string }) =>
  r.uni ?? [programBySlug(r.program ?? '')?.title ?? 'Certification', r.organization].filter(Boolean).join(' · ');
const lang = (l: string) => (isLocale(l) ? LOCALES[l].slug : l);

function Badge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'muted' };
  return <span className={`cx-badge tone-${s.tone}`}>{s.label}</span>;
}

// Older addresses of sections now merged: students on the dashboard, contact requests and ambassadors in Tickets.
const MERGED: Record<string, string> = {
  demandes: 'tickets', ambassadeurs: 'tickets', inscriptions: 'etudiants', 'attente-paiement': 'etudiants', progression: 'etudiants', 'liste-attente': 'etudiants',
};

export default async function AdminConsole({ admin, params }: { admin: User; params: Params }) {
  const asked = MERGED[String(params.tab ?? '')] ?? String(params.tab ?? '');
  const tab = ADMIN_TABS.some((t) => t.id === asked) || asked === 'reglages' ? asked : 'apercu'; // settings: the gear in the header
  const q = String(params.q ?? '').trim().toLowerCase();
  const statusFilter = String(params.status ?? '');
  const id = String(params.id ?? '');

  return (
    <div className="cx">
      <AdminHeader admin={admin} tab={tab} />
      <main id="main" className="container cx-main">
        {asked === 'emails' ? (
          <>
            <p><Link href="/admin#etudiants">← Back to the dashboard</Link></p>
            <Emails id={id} q={q} />
          </>
        ) : tab === 'tickets' ? (
          <>
            {/* Ambassadors asking for one more school: decided here, next to the other requests. */}
            {!id && <SchoolRequests msg={String(params.msg ?? '')} />}
            <Tickets id={id} status={statusFilter} />
          </>
        ) : tab === 'versements' ? (
          <Payouts />
        ) : tab === 'reglages' ? (
          <Settings params={params} />
        ) : (
          <>
            <Overview name={admin.first_name} />
            <div id="etudiants" className="cx-anchor"><Students q={asked === 'etudiants' ? q : ''} status={asked === 'etudiants' ? statusFilter : ''} /></div>
          </>
        )}
      </main>
    </div>
  );
}

async function Overview({ name }: { name: string }) {
  const revenue = await sql(
    `select currency, sum(amount_cents)::int as cents, count(*)::int as n from registrations where status = 'paid' group by currency order by currency`,
  );
  const [counts] = await sql(`
    select
      count(*) filter (where status = 'paid')::int as paid,
      count(*) filter (where status = 'held' and hold_expires_at > now())::int as held,
      count(*) filter (where status in ('expired','canceled','failed') or (status = 'held' and hold_expires_at <= now()))::int as lost,
      count(*) filter (where email_domain_mismatch and status = 'paid')::int as mismatch,
      count(*)::int as total
    from registrations`);
  const [certs] = await sql('select count(*)::int as n from certificates');
  const recent = await sql(
    `select r.reference, r.first_name, r.last_name, r.currency, r.amount_cents, r.paid_at, r.program, r.organization, u.name as uni
     from registrations r left join universities u on u.id = r.university_id
     where r.status = 'paid' order by r.paid_at desc limit 8`,
  );
  const conversion = counts.total ? Math.round((counts.paid / counts.total) * 100) : 0;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

  return (
    <>
      <section className="cx-welcome">
        <div>
          <span className="cx-kicker">{today}</span>
          <h1>Hello{name ? ` ${name}` : ''}, here is where The AI Certification stands.</h1>
          <p>{counts.paid} paid registration{counts.paid === 1 ? '' : 's'} · {counts.held} payment{counts.held === 1 ? '' : 's'} in progress</p>
        </div>
        <img src="/assets/kai-laptop.png" alt="" width={150} height={150} />
      </section>
      <div className="cx-kpis">
        {revenue.length === 0 && <Kpi label="Revenue" value="€0" />}
        {revenue.map((r) => (
          <Kpi key={r.currency} label={`Revenue (${r.currency})`} value={money(r.cents, r.currency)} sub={`${r.n} sale${r.n === 1 ? '' : 's'}`} />
        ))}
        <Kpi label="Paid registrations" value={String(counts.paid)} sub={`${conversion} % of registrations started`} />
        <Kpi label="Certificates issued" value={String(certs.n)} />
      </div>

      <div>
        <section className="cx-card">
          <h2>Latest sales</h2>
          <table className="cx-table">
            <tbody>
              {recent.map((r) => (
                <tr key={r.reference}>
                  <td><strong>{r.first_name} {r.last_name}</strong><small>{bought(r)}</small></td>
                  <td>{dt(r.paid_at)}</td>
                  <td className="num">{money(r.amount_cents, r.currency)}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td className="empty">No sale yet.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </>
  );
  return href ? <Link className="cx-kpi" href={href}>{body}</Link> : <div className="cx-kpi">{body}</div>;
}

/**
 * Everyone who started a registration, in one table: what they bought, where the payment stands (a place held
 * while paying), how far they are in the course, and the emails sent to them.
 */
async function Students({ q, status }: { q: string; status: string }) {
  const rows = await sql(
    `select r.*, u.name as uni, us.last_login_at,
       case when r.status = 'held' and r.hold_expires_at <= now() then 'expired' else r.status end as live_status
     from registrations r
     left join universities u on u.id = r.university_id
     left join users us on us.id = r.user_id
     where ($1 = '' or lower(r.email) like $2 or lower(r.first_name || ' ' || r.last_name) like $2 or lower(r.reference) like $2 or lower(coalesce(u.name, '')) like $2)
     order by r.created_at desc limit 500`,
    [q, `%${q}%`],
  );
  const userIdsAll = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const certs = userIdsAll.length ? await sql('select user_id, program from certificates where user_id = any($1)', [userIdsAll]) : [];
  const certified = (r: Record<string, any>) => certs.some((c) => c.user_id === r.user_id && c.program === r.program);
  const filter = ['expired', 'canceled', 'failed'].includes(status) ? 'unpaid' : status;
  const filtered = rows.filter((r) =>
    filter === 'paid' ? r.live_status === 'paid'
      : filter === 'unpaid' ? ['expired', 'canceled', 'failed'].includes(r.live_status)
        : filter === 'certified' ? certified(r)
          : true,
  );
  const userIds = [...new Set(filtered.map((r) => r.user_id).filter(Boolean))];
  const done = userIds.length ? await sql('select user_id, lesson_id, completed_at from lesson_progress where user_id = any($1)', [userIds]) : [];
  const mails = await sql(
    `select id, to_email, registration_id, subject, status, created_at from emails
     where registration_id = any($1) or lower(to_email) = any($2) order by created_at desc`,
    [filtered.map((r) => r.id), [...new Set(filtered.map((r) => String(r.email).toLowerCase()))]],
  );
  const progress = (r: Record<string, any>) => {
    const course = getCourse(r.program, 'en-us');
    if (!course || !r.user_id) return null;
    const ids = new Set(lessonIdsOf(course));
    const mine = done.filter((d) => d.user_id === r.user_id && ids.has(d.lesson_id));
    const last = mine.reduce<string | null>((m, d) => (!m || d.completed_at > m ? d.completed_at : m), null);
    return { done: mine.length, total: ids.size, last, certified: certified(r) };
  };
  return (
    <section className="cx-card">
      <div className="cx-toolbar">
        <h2>Students <small>({filtered.length})</small></h2>
        <form className="cx-search" action="/admin#etudiants">
          <input type="hidden" name="tab" value="etudiants" />
          <input name="q" defaultValue={q} placeholder="Name, email, reference, school…" aria-label="Search" />
          {status && <input type="hidden" name="status" value={status} />}
          <button className="btn btn-sm" type="submit">Search</button>
        </form>
      </div>
      <nav className="cx-pills" aria-label="Status" style={{ marginBottom: 12 }}>
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/admin?tab=etudiants${k ? `&status=${k}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}#etudiants`} aria-current={filter === k ? 'page' : undefined}>{label}</Link>
        ))}
      </nav>
      {!(await setting('RESEND_API_KEY')) && <p className="price-alert">No Resend key configured: emails are stored but not sent.</p>}
      <div className="cx-scroll">
        <table className="cx-table">
          <thead>
            <tr><th>Date</th><th>Student</th><th>School or certification</th><th className="num">Amount</th><th>Payment</th><th>Progress</th><th>Emails</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const p = progress(r);
              const sent = mails.filter((m) => m.registration_id === r.id || String(m.to_email).toLowerCase() === String(r.email).toLowerCase());
              return (
                <tr key={r.id}>
                  <td>{dt(r.created_at)}</td>
                  <td>
                    <strong>{r.first_name} {r.last_name}</strong>
                    <small>{r.email}{r.email_domain_mismatch && <span className="cx-flag" title="The email does not match the school’s domain"> ⚑ domain</span>}</small>
                    <small>{r.reference}{r.phone ? ` · ${r.phone}` : ''} · /{lang(r.locale)}</small>
                  </td>
                  <td>{bought(r)}</td>
                  <td className="num">{money(r.amount_cents, r.currency)}</td>
                  <td>
                    <Badge status={r.live_status} />
                    {r.paid_at && <small>{dt(r.paid_at)}</small>}
                  </td>
                  <td>
                    {p ? (
                      <>
                        <div className="cx-meter"><span style={{ width: `${Math.round((p.done / Math.max(p.total, 1)) * 100)}%` }} /></div>
                        <small>{p.certified ? 'Certified ✓' : `${p.done} / ${p.total} lessons`}{p.last ? ` · ${dt(p.last)}` : ''}</small>
                      </>
                    ) : <small>—</small>}
                  </td>
                  <td>
                    {sent.length ? (
                      <>
                        <Link href={`/admin?tab=emails&id=${sent[0].id}`}>{sent.length} email{sent.length > 1 ? 's' : ''}</Link>
                        {sent.some((m) => m.status === 'failed') ? <small className="cx-flag">⚑ sending failed</small> : <small>Last: {dt(sent[0].created_at)}</small>}
                      </>
                    ) : <small>—</small>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">No student yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="help" style={{ marginTop: 10 }}><Link href="/admin?tab=emails">All emails sent</Link> (ambassadors and tickets included)</p>
    </section>
  );
}

async function Emails({ id, q }: { id: string; q: string }) {
  if (id) {
    const [email] = await sql('select * from emails where id::text = $1', [id]);
    if (email) {
      return (
        <section className="cx-card">
          <p><Link href="/admin?tab=emails">← Tous les emails</Link></p>
          <h2>{email.subject}</h2>
          <p className="help">À {email.to_email} · {dt(email.created_at)} · {email.kind} · {email.status}{email.error ? ` · ${email.error}` : ''}</p>
          {/* Rendered sandboxed: no scripts, no same-origin access. */}
          <iframe className="cx-email" sandbox="" srcDoc={email.html} title={email.subject} />
        </section>
      );
    }
  }
  const rows = await sql(
    `select id, to_email, subject, kind, status, created_at from emails
     where ($1 = '' or lower(to_email) like $2 or lower(subject) like $2)
     order by created_at desc limit 500`,
    [q, `%${q}%`],
  );
  return (
    <section className="cx-card">
      <div className="cx-toolbar">
        <h2>Emails <small>({rows.length})</small></h2>
        <form className="cx-search" action="/admin">
          <input type="hidden" name="tab" value="emails" />
          <input name="q" defaultValue={q} placeholder="Recipient or subject…" aria-label="Search" />
          <button className="btn btn-sm" type="submit">Filter</button>
        </form>
      </div>
      {!(await setting('RESEND_API_KEY')) && (
        <p className="price-alert">No Resend key configured: emails are stored here but not sent.</p>
      )}
      <div className="cx-scroll">
        <table className="cx-table">
          <thead><tr><th>Date</th><th>Recipient</th><th>Subject</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{dt(r.created_at)}</td>
                <td>{r.to_email}</td>
                <td><Link href={`/admin?tab=emails&id=${r.id}`}>{r.subject}</Link></td>
                <td>{r.kind === 'login' ? 'Sign-in' : r.kind === 'confirmation' ? 'Confirmation' : r.kind}</td>
                <td><span className={`cx-badge tone-${r.status === 'sent' ? 'ok' : r.status === 'failed' ? 'bad' : 'muted'}`}>{r.status === 'sent' ? 'Sent' : r.status === 'failed' ? 'Failed' : 'Stored'}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No email.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function SchoolRequests({ msg }: { msg: string }) {
  const requests = await sql(
    `select sr.id, sr.created_at, sr.new_name, sr.new_city, u.name as school, u.state, us.first_name, us.last_name, us.email,
       (select string_agg(x.name, ', ') from school_claims c join universities x on x.id = c.university_id where c.user_id = sr.user_id) as holds
     from school_requests sr join users us on us.id = sr.user_id left join universities u on u.id = sr.university_id
     where sr.status = 'pending' order by sr.created_at`,
  );
  const notice: Record<string, string> = { accepted: 'Request accepted: the school is theirs.', refused: 'Request refused.', taken: 'That school was taken in the meantime.', gone: 'Request already handled.' };

  return (
    <>
      {notice[msg] && <p className="price-alert" role="status">{notice[msg]}</p>}
      {requests.length > 0 && (
        <section className="cx-card">
          <h2>School requests <small>({requests.length})</small></h2>
          <p className="help">Each ambassador holds one school. To get another one, they ask for it here.</p>
          <div className="cx-scroll">
            <table className="cx-table">
              <thead><tr><th>Ambassador</th><th>Already holds</th><th>Asks for</th><th></th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.first_name} {r.last_name}</strong><small>{r.email}</small></td>
                    <td>{r.holds ?? '—'}</td>
                    <td>{r.school ? <>{r.school}{r.state && <small>{r.state}</small>}</> : <>{r.new_name} <small>New school{r.new_city ? ` · ${r.new_city}` : ''}</small></>}</td>
                    <td>
                      <div className="cx-actions">
                        <form action={decideSchoolRequestAction}><input type="hidden" name="request_id" value={r.id} /><input type="hidden" name="accept" value="1" /><button className="btn btn-sm btn-green" type="submit">Accept</button></form>
                        <form action={decideSchoolRequestAction}><input type="hidden" name="request_id" value={r.id} /><button className="btn btn-sm" type="submit">Refuse</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

async function Payouts() {
  const rows = await sql(
    `select p.*, u.first_name, u.last_name, u.email from payouts p join users u on u.id = p.user_id
     order by (p.status = 'requested') desc, p.requested_at desc limit 500`,
  );
  return (
    <section className="cx-card">
      <h2>Payouts <small>({rows.filter((r) => r.status === 'requested').length} to pay)</small></h2>
      <p className="help">Make the transfer from your bank (within 48 hours), then mark the request as paid: its commissions become “paid”.</p>
      <div className="cx-scroll">
        <table className="cx-table">
          <thead><tr><th>Requested</th><th>Ambassador</th><th className="num">Amount</th><th>Holder · IBAN</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{dt(p.requested_at)}</td>
                <td><strong>{p.first_name} {p.last_name}</strong><small>{p.email}</small></td>
                <td className="num">{money(p.amount_cents, p.currency)}</td>
                <td>{p.iban_holder}<small>{p.iban}</small></td>
                <td>
                  {p.status === 'paid' ? (
                    <span className="cx-badge tone-ok">Paid {dt(p.paid_at)}</span>
                  ) : (
                    <form action={markPayoutPaidAction}>
                      <input type="hidden" name="payout_id" value={p.id} />
                      <button className="btn btn-sm btn-green" type="submit">Mark as paid</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No payout request.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}


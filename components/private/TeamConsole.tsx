import Link from 'next/link';
import CopyLink from '@/components/private/CopyLink';
import { AdminHeader, TEAM_TABS, TeamHeader } from '@/components/private/ConsoleHeaders';
import type { User } from '@/lib/auth';
import { sql } from '@/lib/db';
import { ensureAmbassador, freeSchools, RATES } from '@/lib/team';
import { claimSchoolAction, requestPayoutAction, saveBankAction } from '@/lib/privateActions';
import { PRIVATE_SLUGS } from '@/lib/private';
import { siteUrl } from '@/lib/site';
import UniversityPicker from '@/components/UniversityPicker';
import NetworkPyramid, { type PyramidNode } from '@/components/private/NetworkPyramid';

// Ambassador space, rendered by app/[locale]/page.tsx for signed-in ambassadors only. Server-rendered, no client code.
type Params = Record<string, string | string[] | undefined>;

const BASE = () => siteUrl();

const MESSAGES: Record<string, string> = {
  claimed: 'The school is yours.',
  taken: 'Someone already holds that school.',
  pick: 'Choose a school in the list, or type the name of yours.',
  requested: 'Request sent. The AI Certification will review it shortly.',
  pending: 'You already have a request being reviewed.',
  bank_saved: 'Bank details saved.',
  bank_invalid: 'Check the account holder and the IBAN.',
  ok: 'Payout requested. The funds are sent to your bank account within 48 hours.',
  nothing: 'Nothing to pay out yet.',
  no_iban: 'Add your bank details first.',
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
const day = (v: string | Date | null) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const short = (first: string, last: string) => `${first} ${last ? `${last[0]}.` : ''}`.trim();
const STATUS: Record<string, string> = { paid: 'Paid', held: 'Paying now', expired: 'Did not pay', canceled: 'Did not pay', failed: 'Did not pay' };

export default async function TeamConsole({ user, params }: { user: User; params: Params }) {
  const amb = await ensureAmbassador(user.id);
  // Schools, students and the team now sit on the overview; their old addresses lead there.
  const tab = params.tab === 'earnings' ? 'earnings' : 'overview';
  const msg = MESSAGES[String(params.msg ?? '')];
  const inviteUrl = `${BASE()}/${amb.invite_code}`;
  const href = (t: string) => `/${PRIVATE_SLUGS.ambassador}?tab=${t}`;

  return (
    <div className="cx" lang="en">
      {user.role === 'admin' ? (
        <>
          {/* An admin looking at the ambassador space keeps the /admin header, with the ambassador sections below. */}
          <AdminHeader admin={user} view="ambassador" />
          <div className="cx-header cx-subheader">
            <nav className="container cx-tabs" aria-label="Ambassador sections">
              {TEAM_TABS.map((t) => <Link key={t.id} href={href(t.id)} aria-current={tab === t.id ? 'page' : undefined}>{t.label}</Link>)}
            </nav>
          </div>
        </>
      ) : (
        <TeamHeader user={user} tab={tab} />
      )}
      <main id="main" className="container cx-main">
        {msg && <p className="price-alert" role="status">{msg}</p>}
        {tab === 'overview' && <Overview user={user} inviteUrl={inviteUrl} />}
        {tab === 'earnings' && <Earnings userId={user.id} amb={amb} />}
      </main>
    </div>
  );
}

async function Overview({ user, inviteUrl }: { user: User; inviteUrl: string }) {
  const userId = user.id;
  const tree = await loadTree(user);
  const [own] = await sql(
    `select count(*) filter (where r.status = 'paid')::int as paid, count(*)::int as total
     from registrations r join school_claims c on c.university_id = r.university_id where c.user_id = $1`,
    [userId],
  );
  const owed = await sql(
    `select currency, sum(amount_cents)::int as cents from commissions where user_id = $1 and status = 'owed' group by currency`,
    [userId],
  );
  const [schools] = await sql('select count(*)::int as n from school_claims where user_id = $1', [userId]);
  // What matters most: the money. Ambassadors see what they earned (cancelled commissions aside); the admin sees
  // what the network's students paid.
  const earned = await sql(
    `select currency, sum(amount_cents)::int as cents from commissions where user_id = $1 and status in ('owed', 'requested', 'paid') group by currency`,
    [userId],
  );
  const sales = user.role === 'admin'
    ? await sql(`select r.currency, sum(r.amount_cents)::int as cents from registrations r join school_claims c on c.university_id = r.university_id where r.status = 'paid' group by r.currency`)
    : [];
  const sum = (rows: Row[]) => rows.filter((r) => r.cents > 0).map((r) => money(r.cents, r.currency)).join(' · ') || money(0, 'EUR');
  const admin = user.role === 'admin';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  return (
    <>
      <section className="cx-welcome">
        <div>
          <span className="cx-kicker">{today}</span>
          <h1>Hello {user.first_name || 'there'}!</h1>
          <p className="cx-money">
            <strong>{admin ? sum(sales) : sum(earned)}</strong>
            <span>{admin ? 'paid by the students of the network' : 'earned so far'}</span>
          </p>
          {!admin && <p className="cx-money-sub">{sum(owed)} ready to be paid out to you</p>}
          <p>{tree.total} ambassador{tree.total === 1 ? '' : 's'} in your network · {tree.paid} paid student{tree.paid === 1 ? '' : 's'}</p>
        </div>
        <img className="cx-welcome-money" src="/assets/kai-sitting.webp" alt="" width={190} height={190} />
      </section>
      <NetworkTree user={user} tree={tree} inviteUrl={inviteUrl} />
      <InviteCard inviteUrl={inviteUrl} />
      <div className="cx-kpis">
        <div className="cx-kpi"><span>{admin ? 'Ambassadors in the network' : 'Your network'}</span><strong>{tree.total}</strong><small>{tree.top.length} invited directly</small></div>
        <div className="cx-kpi"><span>Paid students in {admin ? 'the network' : 'your network'}</span><strong>{tree.paid}</strong></div>
        {!admin && <div className="cx-kpi"><span>Your schools</span><strong>{schools.n}</strong><small>{own.paid} paid of {own.total} started</small></div>}
        {!admin && (
          <div className="cx-kpi">
            <span>Owed to you</span>
            <strong>{owed.length ? owed.map((o) => money(o.cents, o.currency)).join(' · ') : money(0, 'EUR')}</strong>
          </div>
        )}
      </div>
      <div id="schools" className="cx-anchor"><Schools userId={userId} /></div>
      <div id="students" className="cx-anchor"><Students userId={userId} /></div>
      {!admin && (
        <section className="cx-card">
          <h2>How you earn</h2>
          <ul className="checklist">
            <li>{RATES.owner / 100} % of every payment from a student of your schools. Students are matched to you by their school.</li>
            <li>{RATES.parent / 100} % of every payment at the schools of the ambassadors you invited.</li>
            <li>{RATES.grandparent / 100} % at the schools of the ambassadors they invited. Nothing further down, but you see your whole network.</li>
            <li>A refund cancels the commission on that payment.</li>
          </ul>
        </section>
      )}
    </>
  );
}

function InviteCard({ inviteUrl }: { inviteUrl: string }) {
  return (
    <section className="cx-card">
      <h2>Invite an ambassador</h2>
      <p className="help">Send this link to anyone: they pick their school (or add it, or take none and grow a team) and start right away.</p>
      <CopyLink url={inviteUrl} shareText="Join me as an ambassador for The AI Certification:" />
    </section>
  );
}

async function Schools({ userId }: { userId: string }) {
  const mine = await sql(
    `select u.id, u.name, u.state, c.claimed_at,
       (select count(*)::int from registrations r where r.university_id = u.id and r.status = 'paid' and r.paid_at >= c.claimed_at) as paid
     from school_claims c join universities u on u.id = c.university_id where c.user_id = $1 order by u.name`,
    [userId],
  );
  const free = await freeSchools();
  const [pending] = await sql(
    `select coalesce(u.name, sr.new_name) as name from school_requests sr left join universities u on u.id = sr.university_id
     where sr.user_id = $1 and sr.status = 'pending' limit 1`,
    [userId],
  );
  return (
    <>
      <section className="cx-card">
        <h2>Your schools <small>({mine.length})</small></h2>
        <div className="cx-scroll">
        <table className="cx-table">
          <thead><tr><th>School</th><th>Yours since</th><th className="num">Paid students</th></tr></thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.id}><td><strong>{s.name}</strong>{s.state && <small>{s.state}</small>}</td><td>{day(s.claimed_at)}</td><td className="num">{s.paid}</td></tr>
            ))}
            {mine.length === 0 && <tr><td colSpan={3} className="empty">No school yet.</td></tr>}
          </tbody>
        </table>
        </div>
      </section>
      <section className="cx-card">
        {/* One school per ambassador: the first is taken at once, another one is asked for and decided by The AI Certification.
            Asking for another one stays folded until opened. */}
        <details className="cx-fold" open={mine.length === 0}>
          <summary><h2>{mine.length === 0 ? 'Choose your school' : 'Ask for another school'}</h2></summary>
          {pending ? (
            <p className="price-alert" role="status">
              Your request for <strong>{pending.name}</strong> is being reviewed. You will see the school here once it is accepted.
            </p>
          ) : (
            <>
              <p className="help">
                {mine.length === 0
                  ? `Pick the school you represent: you earn ${RATES.owner / 100} % of every sale there. ${free.length} schools are still free.`
                  : 'Each ambassador holds one school. To represent another one, send a request: The AI Certification reviews it and gives you the school if it is still free.'}
              </p>
              <form className="form" action={claimSchoolAction}>
                <UniversityPicker schools={free.map((s) => ({ id: s.id, name: s.name, state: s.state ?? '' }))} allowAdd />
                <div><button className="btn btn-sm btn-green" type="submit">{mine.length === 0 ? 'Take this school' : 'Send my request'}</button></div>
              </form>
            </>
          )}
        </details>
      </section>
    </>
  );
}

async function Students({ userId }: { userId: string }) {
  const rows = await sql(
    `select r.id, r.first_name, r.last_name, r.created_at, r.paid_at, r.amount_cents, r.currency,
       case when r.status = 'held' and r.hold_expires_at <= now() then 'expired' else r.status end as status,
       u.name as school, owner.first_name as via, c.user_id = $1 as mine,
       cm.amount_cents as earned
     from registrations r
     join universities u on u.id = r.university_id
     join school_claims c on c.university_id = r.university_id
     join ambassadors a on a.user_id = c.user_id
     join users owner on owner.id = c.user_id
     left join commissions cm on cm.registration_id = r.id and cm.user_id = $1
     where c.user_id = $1 or a.parent_user_id = $1
        or a.parent_user_id in (select user_id from ambassadors where parent_user_id = $1)
     order by r.created_at desc limit 500`,
    [userId],
  );
  return (
    <section className="cx-card">
      <h2>{rows.length} student{rows.length === 1 ? '' : 's'}</h2>
      <div className="cx-scroll">
        <table className="cx-table">
          <thead><tr><th>Student</th><th>School</th><th>Registered</th><th>Status</th><th className="num">Your share</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{short(r.first_name, r.last_name)}</strong>{!r.mine && <small>via {r.via}</small>}</td>
                <td>{r.school}</td>
                <td>{day(r.created_at)}</td>
                <td><span className={`cx-badge tone-${r.status === 'paid' ? 'ok' : r.status === 'held' ? 'warn' : 'muted'}`}>{STATUS[r.status] ?? r.status}{r.status === 'paid' ? ` ${money(r.amount_cents, r.currency)}` : ''}</span></td>
                <td className="num">{r.earned != null ? money(r.earned, r.currency) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No student yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function Earnings({ userId, amb }: { userId: string; amb: Record<string, any> }) {
  const totals = await sql(
    `select currency, status, sum(amount_cents)::int as cents from commissions where user_id = $1 group by currency, status`,
    [userId],
  );
  const lines = await sql(
    `select cm.*, r.first_name, r.last_name, r.amount_cents as paid_cents, u.name as school
     from commissions cm join registrations r on r.id = cm.registration_id join universities u on u.id = r.university_id
     where cm.user_id = $1 order by cm.created_at desc limit 500`,
    [userId],
  );
  const payouts = await sql('select * from payouts where user_id = $1 order by requested_at desc', [userId]);
  const sum = (status: string) =>
    totals.filter((t) => t.status === status).map((t) => money(t.cents, t.currency)).join(' · ') || money(0, 'EUR');
  const hasOwed = totals.some((t) => t.status === 'owed' && t.cents > 0);
  const iban = String(amb.iban ?? '');
  const maskedIban = iban ? `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}` : '';

  return (
    <>
      <div className="cx-kpis">
        <div className="cx-kpi"><span>Owed to you</span><strong>{sum('owed')}</strong></div>
        <div className="cx-kpi"><span>Payout requested</span><strong>{sum('requested')}</strong></div>
        <div className="cx-kpi"><span>Paid to you</span><strong>{sum('paid')}</strong></div>
      </div>

      <section className="cx-card cx-payout">
        <div className="cx-payout-main">
          <span className="eyebrow">Your payout</span>
          <strong className="cx-payout-amount">{sum('owed')}</strong>
          <p className="help">
            Ask whenever you have something owed: we send the funds to your bank account by transfer within 48 hours.
          </p>
          <form action={requestPayoutAction}>
            <button className="btn btn-green" type="submit" disabled={!hasOwed || !iban}>Ask for my payout</button>
          </form>
          {!iban && <p className="help">Add your bank account first.</p>}
          {iban && !hasOwed && <p className="help">Nothing owed right now: commissions appear as soon as a student pays.</p>}
        </div>
        <div className="cx-payout-bank">
          <h3>Bank account</h3>
          {iban && (
            <div className="cx-bank-saved">
              <strong>{amb.iban_holder}</strong>
              <code>{maskedIban}</code>
            </div>
          )}
          <details className="cx-setting-edit" open={!iban}>
            {iban && <summary className="btn btn-sm">Change</summary>}
            <form className="form" action={saveBankAction}>
              <div className="field">
                <label htmlFor="b-holder">Account holder</label>
                <input id="b-holder" name="holder" defaultValue={amb.iban_holder ?? ''} autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="b-iban">IBAN</label>
                <input id="b-iban" name="iban" defaultValue={iban} placeholder="FR76 3000 6000 0112 3456 7890 189" required />
              </div>
              <div><button className="btn btn-sm" type="submit">Save bank account</button></div>
            </form>
          </details>
        </div>
      </section>

      <section className="cx-card">
        <h2>Commissions</h2>
        <p className="help">{RATES.owner / 100} % on students of your schools, {RATES.parent / 100} % at the schools of the ambassadors you invited, {RATES.grandparent / 100} % one level below them.</p>
        <div className="cx-scroll">
          <table className="cx-table">
            <thead><tr><th>Date</th><th>Student</th><th>Payment</th><th>Your share</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{day(l.created_at)}</td>
                  <td><strong>{short(l.first_name, l.last_name)}</strong><small>{l.school}</small></td>
                  <td>{money(l.paid_cents, l.currency)}</td>
                  <td>{l.rate_bp / 100} %{l.level === 2 ? ' (your invitee)' : l.level === 3 ? ' (2nd level)' : ''}</td>
                  <td className="num">{money(l.amount_cents, l.currency)}</td>
                  <td>{l.status === 'owed' ? 'Owed' : l.status === 'requested' ? 'Requested' : l.status === 'paid' ? 'Paid' : 'Cancelled'}</td>
                </tr>
              ))}
              {lines.length === 0 && <tr><td colSpan={6} className="empty">No commission yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {payouts.length > 0 && (
        <section className="cx-card">
          <h2>Payouts</h2>
          <div className="cx-scroll">
          <table className="cx-table">
            <thead><tr><th>Requested</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}><td>{day(p.requested_at)}</td><td className="num">{money(p.amount_cents, p.currency)}</td><td>{p.status === 'paid' ? `Sent ${day(p.paid_at)}` : 'On its way (within 48 h)'}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </>
  );
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Node = Row & { children: Node[]; size: number };

/**
 * The network as a tree. An ambassador sees who invited them, then everyone below them, at every level;
 * an admin sees the whole network (ambassadors invited from the admin's link start a branch).
 */
async function loadTree(user: User) {
  const rows = await sql(
    `select a.user_id as id, a.parent_user_id as parent, a.created_at, u.first_name, u.last_name, u.role,
       (select string_agg(un.name, ', ' order by un.name) from school_claims c join universities un on un.id = c.university_id where c.user_id = a.user_id) as schools,
       (select count(*)::int from registrations r join school_claims c on c.university_id = r.university_id where c.user_id = a.user_id and r.status = 'paid') as paid
     from ambassadors a join users u on u.id = a.user_id order by a.created_at`,
  );
  const earned = await sql(
    `select c.user_id as owner, cm.currency, sum(cm.amount_cents)::int as cents
     from commissions cm join registrations r on r.id = cm.registration_id join school_claims c on c.university_id = r.university_id
     where cm.user_id = $1 group by c.user_id, cm.currency`,
    [user.id],
  );
  const nodes = new Map<string, Node>(rows.map((r) => [String(r.id), { ...r, earned: earned.filter((e) => e.owner === r.id), children: [], size: 0 }]));
  const roots: Node[] = [];
  for (const n of nodes.values()) {
    if (n.id === user.id) continue;
    if (n.parent && nodes.has(n.parent)) nodes.get(n.parent)!.children.push(n);
    else if (user.role === 'admin' && n.role !== 'admin') roots.push(n);
  }
  const me = nodes.get(user.id);
  const top = user.role === 'admin' ? roots : me?.children ?? [];
  // Sizes and paid students per branch (guarded against a loop in the data).
  const seen = new Set<string>();
  const measure = (n: Node): [number, number] => {
    if (seen.has(n.id)) return [0, 0];
    seen.add(n.id);
    let size = 0, paid = n.paid as number;
    for (const c of n.children) { const [s2, p2] = measure(c); size += 1 + s2; paid += p2; }
    n.size = size;
    return [size, paid];
  };
  let total = 0, paid = 0;
  for (const n of top) { const [s2, p2] = measure(n); total += 1 + s2; paid += p2; }
  const sponsor = me?.parent ? nodes.get(me.parent) : null;
  return { top, total, paid, sponsor: sponsor ? `${sponsor.first_name} ${sponsor.last_name}`.trim() : me ? 'The AI Certification' : null };
}

type Tree = Awaited<ReturnType<typeof loadTree>>;

function NetworkTree({ user, tree, inviteUrl }: { user: User; tree: Tree; inviteUrl: string }) {
  const admin = user.role === 'admin';
  const toPyramid = (n: Node, level: number): PyramidNode => ({
    id: String(n.id),
    name: `${n.first_name} ${n.last_name}`.trim(),
    school: n.schools ?? 'No school',
    paid: Number(n.paid),
    size: n.size,
    rate: admin ? 0 : LEVEL_RATE(level) / 100,
    earned: (n.earned ?? []).map((e: { currency: string; cents: number }) => money(e.cents, e.currency)).join(' · '),
    children: n.children.map((c) => toPyramid(c, level + 1)),
  });
  const root: PyramidNode = {
    id: user.id,
    name: user.first_name || 'You',
    school: admin ? 'The AI Certification' : 'You',
    paid: tree.paid,
    size: tree.total,
    rate: 0,
    earned: '',
    children: tree.top.map((n) => toPyramid(n, 1)),
  };
  return (
    <section className="cx-card tm-card">
      <div className="cx-toolbar">
        <h2 style={{ margin: 0 }}>{admin ? 'Ambassador network' : 'Your network'}</h2>
        <span className="cx-badge tone-ok">{tree.total} ambassador{tree.total === 1 ? '' : 's'} · {tree.paid} paid student{tree.paid === 1 ? '' : 's'}</span>
      </div>
      <p className="help">
        {admin
          ? 'Everyone, under the person who invited them. Ambassadors invited from this space start a new branch.'
          : `You earn ${RATES.parent / 100} % at the schools of the people you invited and ${RATES.grandparent / 100} % one level below. You see everyone further down too.`}
      </p>
      <NetworkPyramid root={root} sponsor={admin ? null : tree.sponsor} viewerEarns={!admin} inviteUrl={inviteUrl} />
    </section>
  );
}

const LEVEL_RATE = (level: number) => (level === 1 ? RATES.parent : level === 2 ? RATES.grandparent : 0);

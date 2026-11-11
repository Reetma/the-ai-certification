import 'server-only';
import { randomUUID } from 'node:crypto';
import universities from '@/data/universities.json';

type Row = Record<string, any>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = `
create table if not exists universities (
  id uuid primary key,
  name text not null,
  short_name text not null default '',
  state text not null default '',
  email_domains text[] not null default '{}',
  timezone text not null default 'Europe/Paris',
  active boolean not null default true
);

create table if not exists intakes (
  id uuid primary key,
  name text not null,
  starts_at timestamptz not null,
  registration_deadline timestamptz not null,
  capacity integer not null,
  status text not null default 'open'
);

create table if not exists registrations (
  id uuid primary key,
  reference text not null unique,
  client_token text not null,
  intake_id uuid not null references intakes(id),
  university_id uuid not null references universities(id),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null default '',
  email_domain_mismatch boolean not null default false,
  terms_accepted boolean not null,
  age_confirmed boolean not null,
  independence_acknowledged boolean not null,
  marketing_opt_in boolean not null default false,
  sms_opt_in boolean not null default false,
  terms_version text not null,
  currency text not null,
  amount_cents integer not null,
  status text not null,
  hold_expires_at timestamptz not null,
  payment_id text,
  paid_at timestamptz,
  utm jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table registrations add column if not exists locale text not null default 'en-us';

create index if not exists registrations_email on registrations (lower(email));
create index if not exists registrations_payment on registrations (payment_id);

create table if not exists waitlist (
  id uuid primary key,
  first_name text not null,
  email text not null,
  reason text not null,
  intake_id uuid,
  university_id uuid,
  other_university_name text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  role text not null default 'student',
  first_name text not null default '',
  last_name text not null default '',
  locale text not null default 'en-us',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists login_tokens (
  token_hash text primary key,
  user_id uuid not null references users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists emails (
  id uuid primary key,
  to_email text not null,
  subject text not null,
  kind text not null,
  locale text not null default 'en-us',
  html text not null,
  status text not null,
  provider_id text,
  error text,
  registration_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists lesson_progress (
  user_id uuid not null references users(id),
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table registrations add column if not exists user_id uuid;
alter table users add column if not exists password_hash text;

-- Catalogue purchases: no university, a programme slug instead of the student programme.
alter table registrations alter column university_id drop not null;
alter table registrations add column if not exists program text not null default 'student-ai';
alter table registrations add column if not exists organization text not null default '';

create table if not exists ambassadors (
  user_id uuid primary key references users(id),
  invite_code text not null unique,
  parent_user_id uuid references users(id),
  iban text,
  iban_holder text,
  terms_version text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists school_claims (
  university_id uuid primary key references universities(id),
  user_id uuid not null references users(id),
  claimed_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key,
  user_id uuid not null references users(id),
  currency text not null,
  amount_cents integer not null,
  iban text not null,
  iban_holder text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists commissions (
  id uuid primary key,
  user_id uuid not null references users(id),
  registration_id uuid not null references registrations(id),
  level integer not null,
  rate_bp integer not null,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'owed',
  payout_id uuid references payouts(id),
  created_at timestamptz not null default now(),
  unique (user_id, registration_id)
);

-- Catalogue certifications put on sale from /admin (Formation). No row = not on sale, the student course always is.
-- An ambassador holds one school, a second one is asked for and decided from /admin (Ambassadeurs).
create table if not exists school_requests (
  id uuid primary key,
  user_id uuid not null references users(id),
  university_id uuid references universities(id),
  new_name text not null default '',
  new_city text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists course_visibility (
  program text primary key,
  on_sale boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key,
  reference text not null unique,
  name text not null,
  email text not null,
  category text not null,
  registration_ref text not null default '',
  locale text not null default 'en-us',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ticket_messages (
  id uuid primary key,
  ticket_id uuid not null references tickets(id),
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key,
  name text not null,
  email text not null,
  organization text not null default '',
  audience text not null,
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists exercise_submissions (
  user_id uuid not null references users(id),
  program text not null,
  exercise_id text not null,
  content text not null,
  submitted_at timestamptz not null default now(),
  primary key (user_id, program, exercise_id)
);

create table if not exists quiz_attempts (
  id uuid primary key,
  user_id uuid not null references users(id),
  program text not null,
  module_id text not null,
  score int not null,
  total int not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists exam_attempts (
  id uuid primary key,
  user_id uuid not null references users(id),
  program text not null,
  score int not null,
  total int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists certificates (
  reference text primary key,
  user_id uuid not null references users(id),
  program text not null,
  holder_name text not null,
  score int not null,
  total int not null,
  issued_at timestamptz not null default now(),
  unique (user_id, program)
)
`;

async function seed(q: Query) {
  // Schools added to data/universities.json later are inserted on the next start (existing ones are left as they are).
  const [{ n }] = await q('select count(*)::int as n from universities');
  if (n < (universities as Row[]).length) {
    for (const u of universities as Row[]) {
      await q(
        `insert into universities (id, name, short_name, state, email_domains, timezone)
         values ($1, $2, $3, $4, $5, $6) on conflict (id) do nothing`,
        [u.id, u.name, u.short_name ?? '', u.state ?? '', u.email_domains ?? [], u.timezone ?? 'Europe/Paris'],
      );
    }
  }

  // The admin account is shown as “Felix” (ambassador view, invite pages).
  // The old test account (test@test.test) is removed with what hangs on it. Its registrations, if any, stay as
  // history, detached from the account; schools it held become free again.
  const [test] = await q(`select id from users where lower(email) = 'test@test.test'`);
  if (test) {
    const id = test.id;
    await q('update ambassadors set parent_user_id = null where parent_user_id = $1', [id]);
    await q('update registrations set user_id = null where user_id = $1', [id]);
    for (const table of ['commissions', 'payouts', 'school_claims', 'ambassadors', 'certificates', 'exam_attempts', 'quiz_attempts',
      'exercise_submissions', 'lesson_progress', 'sessions', 'login_tokens']) {
      await q(`delete from ${table} where user_id = $1`, [id]);
    }
    await q('delete from users where id = $1', [id]);
    console.log('[db] removed the test@test.test account');
  }

  // A single admin account: the first address of ADMIN_EMAILS. Any other admin goes back to ambassador or student.
  const admin = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).find(Boolean);
  if (admin) {
    await q(`update users set first_name = 'Felix' where lower(email) = $1 and first_name <> 'Felix'`, [admin]);
    await q(
      `update users set role = case when exists (select 1 from ambassadors a where a.user_id = users.id) then 'ambassador' else 'student' end
       where role = 'admin' and lower(email) <> $1`,
      [admin],
    );
  }

  const [{ m }] = await q('select count(*)::int as m from intakes');
  if (m === 0) {
    // First cohort: next Monday 08:00 UTC, registration closes the evening before.
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + ((8 - start.getUTCDay()) % 7 || 7));
    start.setUTCHours(8, 0, 0, 0);
    const deadline = new Date(start.getTime() - 9 * 3600 * 1000);
    await q(
      `insert into intakes (id, name, starts_at, registration_deadline, capacity, status)
       values ($1, $2, $3, $4, $5, 'open')`,
      [randomUUID(), `Start ${start.toISOString().slice(0, 10)}`, start.toISOString(), deadline.toISOString(), 100000],
    );
  }
}

async function netlifyConnectionString(): Promise<string | null> {
  try {
    const { getConnectionString } = await import('@netlify/database');
    return getConnectionString();
  } catch {
    return null; // not running on Netlify (or no database provisioned)
  }
}

async function connect(): Promise<Query> {
  let q: Query;
  // Production database: DATABASE_URL if set, otherwise the Netlify Database provisioned for the site
  // (its connection string can rotate, so it is read on every query). Neither: the local PGlite file.
  const netlifyUrl = await netlifyConnectionString();
  if (process.env.DATABASE_URL || netlifyUrl) {
    const { neon } = await import('@neondatabase/serverless');
    const { getConnectionString } = await import('@netlify/database');
    const url = () => process.env.DATABASE_URL || getConnectionString();
    q = (text, params = []) => (neon(url()) as any)(text, params);
    console.log(`[db] using ${process.env.DATABASE_URL ? 'DATABASE_URL' : 'Netlify Database'}`);
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const { mkdirSync } = await import('node:fs');
    mkdirSync('./.data', { recursive: true });
    console.log('[db] using local PGlite');
    const db = new PGlite('./.data/pglite');
    await db.waitReady;
    q = async (text, params = []) => (await db.query<Row>(text, params)).rows;
  }
  for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
    await q(statement);
  }
  await seed(q);
  return q;
}

// One connection per process, kept across hot reloads in development.
const g = globalThis as unknown as { __theaicertDb?: Promise<Query> };

export function sql(text: string, params: unknown[] = []): Promise<Row[]> {
  g.__theaicertDb ??= connect().catch((err) => {
    g.__theaicertDb = undefined; // retry on the next query
    throw err;
  });
  return g.__theaicertDb.then((q) => q(text, params));
}

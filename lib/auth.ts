import 'server-only';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { sql } from './db';
import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';
import { PRIVATE_SLUGS } from './private';

export type Role = 'student' | 'ambassador' | 'admin';
export type User = { id: string; email: string; role: Role; first_name: string; last_name: string; locale: Locale };

export const SESSION_COOKIE = 'cfx_session';
// Holds no secret: only tells the public header to show the "My space" button.
export const MEMBER_COOKIE = 'cfx_member';
// As long as course access (6 months), so learners are not signed out mid-course.
const SESSION_DAYS = 183;

// User rows without the password hash, so it never travels further than this file.
const asUser = (row: Record<string, unknown> | undefined): User | null => {
  if (!row) return null;
  const { password_hash: _, ...user } = row;
  return user as User;
};

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** The one admin account: the first address of ADMIN_EMAILS (any others are ignored). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 1);
}

export async function findOrCreateUser(input: {
  email: string;
  role?: Role;
  first_name?: string;
  last_name?: string;
  locale?: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const [existing] = await sql('select * from users where email = $1', [email]);
  if (existing) return asUser(existing)!;
  const id = randomUUID();
  await sql(
    `insert into users (id, email, role, first_name, last_name, locale) values ($1, $2, $3, $4, $5, $6)
     on conflict (email) do nothing`,
    [id, email, input.role ?? 'student', input.first_name ?? '', input.last_name ?? '', isLocale(input.locale) ? input.locale : DEFAULT_LOCALE],
  );
  const [user] = await sql('select * from users where email = $1', [email]);
  return asUser(user)!;
}

/** Users who may sign in: paid students, ambassadors, and the configured admins. */
export async function userForLogin(email: string): Promise<User | null> {
  const clean = email.trim().toLowerCase();
  if (adminEmails().includes(clean)) {
    const user = await findOrCreateUser({ email: clean, role: 'admin' });
    if (user.role !== 'admin') await sql(`update users set role = 'admin' where id = $1`, [user.id]);
    return { ...user, role: 'admin' };
  }
  const [user] = await sql('select * from users where email = $1', [clean]);
  return asUser(user);
}

/** Creates a single-use sign-in token. Returns the raw token (only ever sent by email). */
export async function createLoginToken(userId: string, minutes: number) {
  const token = randomBytes(32).toString('base64url');
  await sql('insert into login_tokens (token_hash, user_id, expires_at) values ($1, $2, $3)', [
    hash(token),
    userId,
    new Date(Date.now() + minutes * 60 * 1000).toISOString(),
  ]);
  return token;
}

/** Consumes a sign-in token and opens a session. Returns the user, or null if the token is invalid. */
export async function consumeLoginToken(token: string): Promise<User | null> {
  const rows = await sql(
    `update login_tokens set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning user_id`,
    [hash(token)],
  );
  if (!rows[0]) return null;
  const [user] = await sql('select * from users where id = $1', [rows[0].user_id]);
  if (!user) return null;
  return openSession(asUser(user)!);
}

const MIN_PASSWORD = 8;

/** `scrypt:<salt hex>:<hash hex>`, the format scripts/hash-password.mjs prints for ADMIN_PASSWORD_HASH. */
function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function checkPassword(password: string, stored: string | null | undefined) {
  const [scheme, salt, expected] = (stored ?? '').split(':');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  const want = Buffer.from(expected, 'hex');
  return want.length === actual.length && timingSafeEqual(want, actual);
}

/**
 * Email and password sign-in. An admin without a password of their own can use ADMIN_PASSWORD_HASH,
 * so the first admin can sign in before any email is sent.
 */
export async function passwordLogin(email: string, password: string): Promise<User | null> {
  const clean = email.trim().toLowerCase();
  const user = await userForLogin(clean);
  if (!user || !password) return null;
  const [row] = await sql('select password_hash from users where id = $1', [user.id]);
  const ok = row?.password_hash
    ? checkPassword(password, row.password_hash)
    : adminEmails().includes(clean) && checkPassword(password, process.env.ADMIN_PASSWORD_HASH);
  return ok ? openSession(user) : null;
}

/** Sets the password from a link sent by email (first sign-in or forgotten password), then signs the user in. */
export async function setPasswordWithToken(token: string, password: string): Promise<User | null> {
  if (password.length < MIN_PASSWORD) return null;
  const user = await consumeLoginToken(token);
  if (user) await sql('update users set password_hash = $2 where id = $1', [user.id, hashPassword(password)]);
  return user;
}

/** The first password, set right after paying (no email needed). Refused when the account already has one. */
export async function setFirstPassword(userId: string, password: string): Promise<User | null> {
  if (password.length < MIN_PASSWORD) return null;
  const rows = await sql('update users set password_hash = $2 where id = $1 and password_hash is null returning *', [userId, hashPassword(password)]);
  return rows[0] ? openSession(asUser(rows[0])!) : null;
}

/** Where a signed-in user lands. */
export function homePath(user: User, lang: Locale) {
  if (user.role === 'admin') return `/${PRIVATE_SLUGS.admin}`;
  if (user.role === 'ambassador') return `/${PRIVATE_SLUGS.ambassador}`;
  return `/space?lang=${isLocale(user.locale) ? user.locale : lang}`;
}

async function openSession(user: User): Promise<User> {
  const session = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await sql('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [hash(session), user.id, expires.toISOString()]);
  await sql('update users set last_login_at = now() where id = $1', [user.id]);

  const jar = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  jar.set(SESSION_COOKIE, session, { httpOnly: true, secure, sameSite: 'lax', path: '/', expires });
  jar.set(MEMBER_COOKIE, '1', { httpOnly: false, secure, sameSite: 'lax', path: '/', expires });
  return user;
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [user] = await sql(
    `select u.* from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hash(token)],
  );
  return asUser(user);
}

/**
 * Gate for private pages. Anyone without the right role gets the ordinary 404 page,
 * so the page cannot be told apart from an address that does not exist.
 */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) notFound();
  return user;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sql('delete from sessions where token_hash = $1', [hash(token)]);
  jar.delete(SESSION_COOKIE);
  jar.delete(MEMBER_COOKIE);
}

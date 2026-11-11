import { NextRequest, NextResponse } from 'next/server';
import { createLoginToken, homePath, logout, passwordLogin, setPasswordWithToken, userForLogin } from '@/lib/auth';
import { loginUrl, sendLoginEmail } from '@/lib/email';
import { DEFAULT_LOCALE, isLocale } from '@/lib/locales';
import { setting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const hits = new Map<string, number[]>();
function rateLimited(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? '');

  if (action === 'logout') {
    await logout();
    return NextResponse.json({ result: 'ok' });
  }

  if (action === 'request_login') {
    const email = String(body?.email ?? '').trim().toLowerCase();
    const locale = isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ result: 'invalid' });
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    if (rateLimited(`ip:${ip}`, 10) || rateLimited(`email:${email}`)) return NextResponse.json({ result: 'rate_limited' });

    // Same answer whether or not the email has an account, so accounts cannot be guessed.
    const user = await userForLogin(email);
    let devLink: string | undefined;
    if (user) {
      const token = await createLoginToken(user.id, 30);
      await sendLoginEmail(user.email, token, isLocale(user.locale) ? user.locale : locale);
      if (process.env.NODE_ENV !== 'production' && !(await setting('RESEND_API_KEY'))) devLink = loginUrl(token, locale);
    }
    return NextResponse.json({ result: 'ok', ...(devLink ? { dev_link: devLink } : {}) });
  }

  if (action === 'password_login') {
    const email = String(body?.email ?? '').trim().toLowerCase();
    const locale = isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    if (rateLimited(`pw-ip:${ip}`, 20) || rateLimited(`pw-email:${email}`, 10)) return NextResponse.json({ result: 'rate_limited' });
    const user = await passwordLogin(email, String(body?.password ?? ''));
    return NextResponse.json(user ? { result: 'ok', redirect: homePath(user, locale) } : { result: 'invalid' });
  }

  if (action === 'set_password') {
    const locale = isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;
    const user = await setPasswordWithToken(String(body?.token ?? ''), String(body?.password ?? ''));
    return NextResponse.json(user ? { result: 'ok', redirect: homePath(user, locale) } : { result: 'expired' });
  }

  return NextResponse.json({ result: 'unknown_action' }, { status: 400 });
}

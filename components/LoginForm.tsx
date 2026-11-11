'use client';

import { useState } from 'react';
import { member } from '@/lib/i18n/member';
import type { Locale } from '@/lib/locales';
import Spinner from '@/components/Spinner';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const post = (body: Record<string, string>) =>
  fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => r.json())
    .catch(() => null);

export default function LoginForm({ locale, expired, reset = false }: { locale: Locale; expired: boolean; reset?: boolean }) {
  const t = member(locale).login;
  // "forgot" sends the link that sets a password: for a forgotten one, and for a first sign-in.
  const [mode, setMode] = useState<'login' | 'forgot'>(expired || reset ? 'forgot' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState('');

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL.test(email.trim())) return setError(t.invalid);
    setState('sending');
    const res = await post({ action: 'password_login', email, password, locale });
    if (res?.redirect) return window.location.assign(res.redirect);
    setState('idle');
    setError(res?.result === 'rate_limited' ? t.rateLimited : t.wrong);
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL.test(email.trim())) return setError(t.invalid);
    setState('sending');
    const res = await post({ action: 'request_login', email, locale });
    setState('sent');
    if (res?.dev_link) setDevLink(res.dev_link);
  }

  function switchTo(next: 'login' | 'forgot') {
    setMode(next);
    setState('idle');
    setError('');
  }

  const back = (
    <button type="button" className="linklike" onClick={() => switchTo('login')}>
      {t.back}
    </button>
  );

  return (
    <div className="register-card">
      <h1>{mode === 'login' ? t.title : t.setTitle}</h1>
      {expired && mode === 'forgot' && state !== 'sent' && <p className="alert" role="alert">{t.expired}</p>}
      {mode === 'forgot' && state === 'sent' ? (
        <>
          <p className="lead">{t.sent}</p>
          {devLink && (
            <p className="price-alert">
              <a href={devLink}>{t.devLink}</a>
            </p>
          )}
          <p>{back}</p>
        </>
      ) : mode === 'forgot' ? (
        <form className="form" onSubmit={sendLink}>
          <p className="help">{t.forgotLead}</p>
          <div className="field">
            <label htmlFor="login-email">{t.email}</label>
            <input id="login-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div>
            <button className="btn btn-green" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? <><Spinner />{t.sending}</> : t.send}
            </button>
          </div>
          <p>{back}</p>
        </form>
      ) : (
        <form className="form" onSubmit={signIn}>
          <p className="help">{t.lead}</p>
          <div className="field">
            <label htmlFor="login-email">{t.email}</label>
            <input id="login-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t.password}</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div>
            <button className="btn btn-green" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? <><Spinner />{t.sending}</> : t.submit}
            </button>
          </div>
          <p>
            <button type="button" className="linklike" onClick={() => switchTo('forgot')}>
              {t.forgot}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

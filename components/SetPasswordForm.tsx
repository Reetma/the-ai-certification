'use client';

import { useState } from 'react';
import { member } from '@/lib/i18n/member';
import type { Locale } from '@/lib/locales';
import Spinner from '@/components/Spinner';

const MIN_PASSWORD = 8;

export default function SetPasswordForm({ locale, token }: { locale: Locale; token: string }) {
  const t = member(locale).login;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) return setError(t.tooShort);
    if (password !== confirm) return setError(t.mismatch);
    setSending(true);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'set_password', token, password, locale }),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (res?.redirect) return window.location.assign(res.redirect);
    // Expired or already used: the sign-in page offers a new link.
    window.location.assign(`/login?lang=${locale}&expired=1`);
  }

  return (
    <div className="register-card">
      <h1>{t.setTitle}</h1>
      <form className="form" onSubmit={submit}>
        <p className="help">{t.setLead}</p>
        <div className="field">
          <label htmlFor="new-password">{t.newPassword}</label>
          <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">{t.confirm}</label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div>
          <button className="btn btn-green" type="submit" disabled={sending}>
            {sending ? <><Spinner />{t.sending}</> : t.save}
          </button>
        </div>
      </form>
    </div>
  );
}

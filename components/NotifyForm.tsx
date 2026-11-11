'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { dict } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import Spinner from '@/components/Spinner';

export default function NotifyForm({ locale }: { locale: Locale }) {
  const t = dict(locale).footer;
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    // The footer form only asks for an email; the first name is filled from it.
    const res = await api('join_waitlist', {
      first_name: email.split('@')[0],
      email,
      reason: 'notify',
      consent: true,
    }).catch(() => null);
    setState(res?.result === 'ok' ? 'done' : 'error');
  }

  if (state === 'done') return <p style={{ marginTop: 10 }}>{t.notifyThanks}</p>;

  return (
    <form className="notify" onSubmit={submit}>
      <label className="skip" htmlFor="notify-email">{t.emailLabel}</label>
      <input
        id="notify-email"
        type="email"
        placeholder={t.emailPlaceholder}
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn btn-sm btn-green" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? <><Spinner />{t.sending}</> : t.getNotified}
      </button>
      {state === 'error' && <p className="error" style={{ color: '#FFB4A8', width: '100%' }}>{t.notifyError}</p>}
    </form>
  );
}

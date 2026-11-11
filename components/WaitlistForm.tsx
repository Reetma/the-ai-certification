'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { dict } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import Spinner from '@/components/Spinner';

export default function WaitlistForm({
  locale,
  reason,
  intakeId,
  universityId,
  showUniversityField = false,
  defaultFirstName = '',
  defaultEmail = '',
}: {
  locale: Locale;
  reason: 'university_not_listed' | 'full' | 'closed' | 'notify';
  intakeId?: string;
  universityId?: string;
  showUniversityField?: boolean;
  defaultFirstName?: string;
  defaultEmail?: string;
}) {
  const t = dict(locale).waitlist;
  const [university, setUniversity] = useState('');
  const [first, setFirst] = useState(defaultFirstName);
  const [email, setEmail] = useState(defaultEmail);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p style={{ color: 'var(--green-dark)', fontWeight: 600 }}>
        {showUniversityField && university ? t.thanksUni(university) : t.thanks}
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!first.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !consent) {
      setError(t.fill);
      return;
    }
    setBusy(true);
    const res = await api('join_waitlist', {
      first_name: first.trim(),
      email: email.trim().toLowerCase(),
      reason,
      intake_id: intakeId,
      university_id: universityId,
      other_university_name: showUniversityField ? university.trim() : undefined,
      consent,
    }).catch(() => null);
    setBusy(false);
    if (res?.result === 'ok') setDone(true);
    else if (res?.result === 'rate_limited') setError(t.tooMany);
    else setError(t.couldNotSave);
  }

  return (
    <form className="form" onSubmit={submit}>
      {showUniversityField && (
        <div className="field">
          <label htmlFor="wl-university">{t.university}</label>
          <input id="wl-university" value={university} onChange={(e) => setUniversity(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label htmlFor="wl-first">{t.first}</label>
        <input id="wl-first" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="wl-email">{t.email}</label>
        <input id="wl-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{t.consent}</span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div>
        <button className="btn" type="submit" disabled={busy}>{busy ? <><Spinner />{t.sending}</> : t.add}</button>
      </div>
    </form>
  );
}

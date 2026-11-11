'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import Spinner from '@/components/Spinner';

type Summary = { name: string; email: string; certification: string; starts_at: string; currency: string; amount_cents: number };
type Reservation = { registration_id: string; client_token: string; reference: string; hold_expires_at: string; summary: Summary };

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const ERRORS: Record<string, string> = {
  first_name: 'Enter your first name.',
  last_name: 'Enter your last name.',
  email: 'Enter a valid email address.',
  terms_accepted: 'Accept the terms to continue.',
  age_confirmed: 'You must be 18 or older.',
};

/** Purchase of a catalogue certification: details, then payment. */
export default function EnrollFlow({ program, title }: { program: string; title: string }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', organization: '' });
  const [checks, setChecks] = useState({ terms_accepted: false, age_confirmed: false, marketing_opt_in: false });
  const [errors, setErrors] = useState<Record<string, true>>({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  // The payment step starts at the top of the page.
  useEffect(() => {
    if (reservation) window.scrollTo(0, 0);
  }, [reservation]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const tick = (k: keyof typeof checks) => (e: React.ChangeEvent<HTMLInputElement>) => setChecks({ ...checks, [k]: e.target.checked });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBanner('');
    setBusy(true);
    const res = await api('start_purchase', { program, ...form, ...checks }).catch(() => null);
    setBusy(false);
    if (res?.result === 'ok') return setReservation(res);
    if (res?.result === 'invalid') {
      setErrors(Object.fromEntries(Object.keys(res.errors ?? {}).map((k) => [k, true])));
      return setBanner('Check the highlighted fields.');
    }
    if (res?.result === 'already_registered') return setBanner(`This email already has a paid place for ${title} in this cohort. Check your inbox.`);
    if (res?.result === 'closed' || res?.result === 'full') return setBanner('Registration is closed for now.');
    if (res?.result === 'rate_limited') return setBanner('Too many attempts. Wait a few minutes and try again.');
    setBanner('We couldn’t save that. Try again in a moment.');
  }

  if (reservation) return <Payment reservation={reservation} onBack={() => setReservation(null)} />;

  const err = (k: string) => errors[k] && <p className="error">{ERRORS[k]}</p>;
  return (
    <form className="form" onSubmit={submit}>
      {banner && <p className="alert" role="alert">{banner}</p>}
      <div className="form-row">
        <div className="field">
          <label htmlFor="e-first">First name</label>
          <input id="e-first" autoComplete="given-name" value={form.first_name} onChange={set('first_name')} aria-invalid={!!errors.first_name} />
          {err('first_name')}
        </div>
        <div className="field">
          <label htmlFor="e-last">Last name</label>
          <input id="e-last" autoComplete="family-name" value={form.last_name} onChange={set('last_name')} aria-invalid={!!errors.last_name} />
          {err('last_name')}
        </div>
      </div>
      <div className="field">
        <label htmlFor="e-email">Email</label>
        <input id="e-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
        <p className="help">Your certificate is issued in this name, and your sign-in link is sent to this email.</p>
        {err('email')}
      </div>
      <div className="field">
        <label htmlFor="e-org">Company or organisation <span style={{ fontWeight: 500, color: 'var(--muted)' }}>(optional)</span></label>
        <input id="e-org" autoComplete="organization" value={form.organization} onChange={set('organization')} />
      </div>
      <label className="check">
        <input type="checkbox" checked={checks.terms_accepted} onChange={tick('terms_accepted')} />
        <span>I have read and accept the <Link href="/terms" target="_blank">terms of sale</Link> and the <Link href="/refund-policy" target="_blank">refund policy</Link>. I ask for access to the digital content as soon as my payment is confirmed and I expressly waive my right of withdrawal: the purchase is non-refundable.</span>
      </label>
      {err('terms_accepted')}
      <label className="check">
        <input type="checkbox" checked={checks.age_confirmed} onChange={tick('age_confirmed')} />
        <span>I am 18 or older.</span>
      </label>
      {err('age_confirmed')}
      <label className="check">
        <input type="checkbox" checked={checks.marketing_opt_in} onChange={tick('marketing_opt_in')} />
        <span>Email me about new The AI Certification certifications (optional).</span>
      </label>
      <div>
        <button className="btn btn-green" type="submit" disabled={busy || !checks.terms_accepted || !checks.age_confirmed}>
          {busy ? <><Spinner />Reserving…</> : 'Continue to payment'}
        </button>
      </div>
    </form>
  );
}

function Payment({ reservation, onBack }: { reservation: Reservation; onBack: () => void }) {
  const expires = useMemo(() => new Date(reservation.hold_expires_at), [reservation.hold_expires_at]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const s = reservation.summary;
  const left = Math.max(0, Math.floor((expires.getTime() - now) / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function pay() {
    setBusy(true);
    setError('');
    const res = await api('create_checkout', { registration_id: reservation.registration_id, client_token: reservation.client_token }).catch(() => null);
    if (res?.result === 'ok') return window.location.assign(res.checkout_url);
    setBusy(false);
    if (res?.result === 'expired') setNow(expires.getTime());
    else if (res?.result === 'already_paid') window.location.assign(`/confirmation?id=${reservation.registration_id}&t=${encodeURIComponent(reservation.client_token)}&lang=en-us`);
    else if (res?.result === 'payments_unavailable') setError('Payments are temporarily unavailable. Please try again in a few minutes.');
    else setError('We couldn’t open the payment page. Please try again.');
  }

  if (left === 0) {
    return (
      <div className="form">
        <p className="lead">Your place is no longer held. Confirm your details again to get a new one.</p>
        <div><button type="button" className="btn" onClick={onBack}>Try again</button></div>
      </div>
    );
  }

  const amount = money(s.amount_cents, s.currency);
  return (
    <div className="form">
      <div className="summary">
        <p style={{ margin: 0, fontWeight: 700 }}>Order summary</p>
        <dl>
          <div><dt>Certification</dt><dd>{s.certification}</dd></div>
          <div><dt>Name on the certificate</dt><dd>{s.name}</dd></div>
          <div><dt>Email</dt><dd>{s.email}</dd></div>
          <div><dt>Cohort starts</dt><dd>{new Date(s.starts_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</dd></div>
          <div><dt>Total</dt><dd>{amount} · VAT not applicable (art. 293 B CGI)</dd></div>
        </dl>
      </div>
      <p className="price-alert" role="timer" aria-live="off">
        Place held for {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </p>
      {error && <p className="alert" role="alert">{error}</p>}
      <button type="button" className="btn btn-green" style={{ width: '100%' }} disabled={busy} onClick={pay}>
        {busy ? <><Spinner />Opening secure payment…</> : `Pay ${amount} securely`}
      </button>
      <p className="help">You will be taken to our secure payment page and brought back once your payment is verified.</p>
      <div><button type="button" className="linklike" onClick={onBack}>Back to my details</button></div>
    </div>
  );
}

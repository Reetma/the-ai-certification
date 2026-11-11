'use client';

import { useState } from 'react';
import Spinner from '@/components/Spinner';

const TEXT = {
  en: {
    name: 'Your name', email: 'Your email', category: 'Topic', ref: 'Registration reference (if you have one)', refHint: 'It starts with TAC- and is in your confirmation email.',
    message: 'Your message', send: 'Send my request', sending: 'Sending…', invalid: 'Fill in your name, a valid email and your message.', rate: 'Too many requests. Try again in an hour.',
    done: (ref: string) => `Sent! Your reference: ${ref}. You will get a confirmation email, and we answer within 7 working days.`,
    categories: { registration: 'Registration', payment: 'Payment', access: 'Access to my space or lessons', certificate: 'Exam and certificate', company: 'Company, school or association', refund: 'Refund request', other: 'Other' },
    refundNote: 'Our programs are digital content: they are non-refundable. Read the refund policy before sending your request.', refundLink: 'Refund policy',
  },
};

export default function SupportForm({ topic }: { topic?: string }) {
  const t = TEXT.en;
  const locale = 'en-us';
  const [form, setForm] = useState({ name: '', email: '', category: topic && topic in t.categories ? topic : 'registration', registration_ref: '', message: '', website: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.message.trim().length < 5) return setError(t.invalid);
    setState('sending');
    const res = await fetch('/api/support', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, locale }) })
      .then((r) => r.json())
      .catch(() => null);
    if (res?.result === 'ok') {
      setReference(res.reference);
      setState('done');
      window.scrollTo(0, 0);
      return;
    }
    setState('idle');
    setError(res?.result === 'rate_limited' ? t.rate : t.invalid);
  }

  if (state === 'done') return <p className="price-alert" role="status">{t.done(reference)}</p>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="t-name">{t.name}</label>
          <input id="t-name" autoComplete="name" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label htmlFor="t-email">{t.email}</label>
          <input id="t-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </div>
      </div>
      <fieldset className="field topic-chips">
        <legend>{t.category}</legend>
        <div>
          {Object.entries(t.categories).map(([k, v]) => (
            <label key={k} className={form.category === k ? 'is-on' : ''}>
              <input type="radio" name="category" value={k} checked={form.category === k} onChange={set('category')} />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      {form.category === 'refund' && (
        <p className="price-alert">{t.refundNote} <a href="/refund-policy">{t.refundLink}</a></p>
      )}
      <div className="field">
        <label htmlFor="t-ref">{t.ref}</label>
        <input id="t-ref" value={form.registration_ref} onChange={set('registration_ref')} placeholder="TAC-…" aria-describedby="t-ref-hint" />
        <p className="help" id="t-ref-hint">{t.refHint}</p>
      </div>
      <div className="field">
        <label htmlFor="t-message">{t.message}</label>
        <textarea id="t-message" rows={6} value={form.message} onChange={set('message')} maxLength={5000} />
      </div>
      {/* Hidden from people; bots fill it. */}
      <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      {error && <p className="error" role="alert">{error}</p>}
      <div>
        <button className="btn btn-green" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? <><Spinner />{t.sending}</> : t.send}
        </button>
      </div>
    </form>
  );
}

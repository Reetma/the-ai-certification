'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import Spinner from '@/components/Spinner';

const AUDIENCES = [
  ['company', 'A company'],
  ['school', 'A school or university'],
  ['association', 'An association'],
  ['student', 'A student'],
  ['other', 'Something else'],
] as const;

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', organization: '', audience: 'company', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'invalid'>('idle');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setState('invalid');
    setState('sending');
    const res = await api('contact', form).catch(() => null);
    setState(res?.result === 'ok' ? 'done' : 'error');
  }

  if (state === 'done') return <p className="lead" style={{ margin: 0 }}>Thanks. We’ll get back to you by email.</p>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input id="c-name" autoComplete="name" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </div>
      </div>
      <fieldset className="field topic-chips">
        <legend>You are</legend>
        <div>
          {AUDIENCES.map(([k, v]) => (
            <label key={k} className={form.audience === k ? 'is-on' : ''}>
              <input type="radio" name="audience" value={k} checked={form.audience === k} onChange={set('audience')} />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="c-org">Organisation</label>
        <input id="c-org" autoComplete="organization" value={form.organization} onChange={set('organization')} />
      </div>
      <div className="field">
        <label htmlFor="c-msg">What do you need?</label>
        <textarea id="c-msg" value={form.message} onChange={set('message')} />
      </div>
      {state === 'invalid' && <p className="error" role="alert">Enter your name and a valid email.</p>}
      {state === 'error' && <p className="error" role="alert">We couldn’t send that. Try again in a moment.</p>}
      <div>
        <button className="btn btn-green" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? <><Spinner />Sending…</> : 'Send'}
        </button>
      </div>
    </form>
  );
}

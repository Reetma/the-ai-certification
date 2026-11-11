'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { dict } from '@/lib/i18n';
import { member } from '@/lib/i18n/member';
import Spinner from '@/components/Spinner';
import { formatDate, homePath, LOCALES, registerPath, type Locale } from '@/lib/locales';

type Status = {
  result: string;
  status?: string;
  reference?: string;
  retry_path?: string | null;
  email_domain_mismatch?: boolean;
  needs_password?: boolean;
  summary?: { name: string; email: string; university: string | null; certification?: string | null; organization?: string | null; starts_at: string; currency: string; amount_cents: number };
};

export default function Confirmation({ locale }: { locale: Locale }) {
  const t = dict(locale).confirmation;
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const token = params.get('t') ?? '';
  const [data, setData] = useState<Status | null>(null);

  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      const res = await api<Status>('registration_status', { registration_id: id, client_token: token }).catch(() => null);
      setData(res ?? { result: 'error' });
      // Payment confirmation can take a few seconds to reach us.
      if (res?.status === 'held' && tries++ < 20) timer = setTimeout(check, 3000);
      if (res?.status === 'paid') {
        try { sessionStorage.removeItem('theaicert_reservation'); } catch {}
      }
    }
    check();
    return () => clearTimeout(timer);
  }, [id, token]);

  if (!data) return <div className="register-card"><p>{t.checking}</p></div>;

  if (data.result !== 'ok' || !data.summary) {
    return (
      <div className="register-card">
        <h1>{t.notFoundTitle}</h1>
        <p className="lead">{t.notFoundLead}</p>
        <Link className="btn" href={homePath(locale)}>{dict(locale).register.backHome}</Link>
      </div>
    );
  }

  const s = data.summary;
  const paid = new Intl.NumberFormat(LOCALES[locale].intl, { style: 'currency', currency: s.currency, maximumFractionDigits: s.amount_cents % 100 ? 2 : 0 }).format(s.amount_cents / 100);

  if (data.status === 'paid') {
    return (
      <div className="register-card">
        <Image
          src="/assets/kai-cert.png"
          alt=""
          width={800}
          height={800}
          sizes="180px"
          style={{ width: 180, height: 'auto', display: 'block', margin: '-8px auto 8px' }}
        />
        <span className="badge" style={{ background: 'var(--green-dark)' }}>{t.confirmed}</span>
        <h1 style={{ marginTop: 16 }}>{t.confirmedTitle}</h1>
        <p className="lead">{t.confirmedLead}</p>
        <div className="summary">
          <dl>
            <div><dt>{t.reference}</dt><dd>{data.reference}</dd></div>
            <div><dt>{t.name}</dt><dd>{s.name}</dd></div>
            <div><dt>{t.email}</dt><dd>{s.email}</dd></div>
            {s.certification && <div><dt>Certification</dt><dd>{s.certification}</dd></div>}
            {s.university && <div><dt>{t.university}</dt><dd>{s.university}</dd></div>}
            {s.organization && <div><dt>Organisation</dt><dd>{s.organization}</dd></div>}
            <div><dt>{t.paid}</dt><dd>{paid}</dd></div>
          </dl>
        </div>
        {data.email_domain_mismatch && <p className="price-alert" style={{ marginTop: 16 }}>{t.mismatch}</p>}
        <ol className="numbered" style={{ marginTop: 24 }}>
          {t.next.map((line) => <li key={line}>{line}</li>)}
        </ol>
        {data.needs_password ? (
          <FirstPassword locale={locale} id={id} token={token} />
        ) : (
          <p style={{ marginTop: 16 }}><Link className="btn btn-green" href={`/login?lang=${locale}`}>{t.openSpace}</Link></p>
        )}
      </div>
    );
  }

  if (data.status === 'held') {
    return (
      <div className="register-card">
        <h1>{t.pendingTitle}</h1>
        <p className="lead">{t.pendingLead}</p>
        <p className="help">{t.reference}: {data.reference}</p>
      </div>
    );
  }

  return (
    <div className="register-card">
      <h1>{t.failedTitle}</h1>
      <p className="lead">{t.failedLead}</p>
      <Link className="btn btn-green" href={data.retry_path ?? registerPath(locale)}>{t.tryAgain}</Link>
    </div>
  );
}

/** Right after paying: the buyer chooses a password here and goes straight to their space, no email needed. */
function FirstPassword({ locale, id, token }: { locale: Locale; id: string; token: string }) {
  const t = dict(locale).confirmation;
  const l = member(locale).login;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError(l.tooShort);
    if (password !== confirm) return setError(l.mismatch);
    setSending(true);
    const res = await api<{ result: string; redirect?: string }>('set_password', { registration_id: id, client_token: token, password }).catch(() => null);
    if (res?.redirect) return window.location.assign(res.redirect);
    setSending(false);
    setError(res?.result === 'already_set' ? t.alreadySet : l.wrong);
  }

  return (
    <form className="form" onSubmit={submit} style={{ marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
      <h2 style={{ fontSize: 24, margin: 0 }}>{t.passwordTitle}</h2>
      <p className="help">{t.passwordLead}</p>
      <div className="field">
        <label htmlFor="first-password">{l.newPassword}</label>
        <input id="first-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="first-password-confirm">{l.confirm}</label>
        <input id="first-password-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="error" role="alert">{error}{error === t.alreadySet && <> <Link href={`/login?lang=${locale}`}>{t.openSpace}</Link></>}</p>}
      <div>
        <button className="btn btn-green" type="submit" disabled={sending}>{sending ? <><Spinner />{l.sending}</> : l.save}</button>
      </div>
    </form>
  );
}

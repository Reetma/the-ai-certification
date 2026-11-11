'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { dict } from '@/lib/i18n';
import { formatDate, formatMoney, homePath, LOCALES, type Locale } from '@/lib/locales';
import WaitlistForm from './WaitlistForm';
import Spinner from '@/components/Spinner';

export type University = { id: string; name: string; short_name: string; state: string; email_domains: string[] };
export type Intake = {
  intake_id: string;
  name: string;
  status: 'open' | 'closed' | 'full';
  starts_at: string;
  registration_deadline: string;
  pricing: { currency: string; priceCents: number; corporateCents: number; fundingCents: number; vatExempt: boolean };
};
type Summary = {
  name: string;
  email: string;
  university: string;
  intake: string;
  starts_at: string;
  currency: string;
  amount_cents: number;
  corporate_cents: number;
};
type Reservation = {
  registration_id: string;
  client_token: string;
  reference: string;
  hold_expires_at: string;
  summary: Summary;
  locale?: Locale;
};
type FieldError = keyof ReturnType<typeof dict>['register']['errors'];

const STORE = 'theaicert_reservation';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function utmParams() {
  const out: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (k.startsWith('utm_')) out[k] = v.slice(0, 100);
  });
  if (document.referrer) out.referrer = document.referrer.slice(0, 200);
  return out;
}

// The page loads the schools and the cohort on the server, so the first step shows complete at once.
export default function RegisterFlow({ locale, initialUniversities, initialIntake }: { locale: Locale; initialUniversities: University[]; initialIntake: Intake | null }) {
  const t = dict(locale).register;
  const [step, setStep] = useState(1);
  // Each step is an entry in the browser history (?step=2…), so the back button and the iPhone back swipe
  // return to the previous step instead of leaving the form. Each step also starts at the top of the page.
  const firstRender = useRef(true);
  const fromHistory = useRef(false);
  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
      setStep(Number(new URLSearchParams(window.location.search).get('step')) || 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (firstRender.current) {
      // A reload starts over at the first step: the form data is not kept.
      firstRender.current = false;
      if (url.searchParams.has('step')) {
        url.searchParams.delete('step');
        window.history.replaceState(null, '', url);
      }
      return;
    }
    if (fromHistory.current) fromHistory.current = false;
    else {
      url.searchParams.set('step', String(step));
      // Payment (step 4) replaces the summary: going back from it would mean booking twice.
      if (step === 4) window.history.replaceState(null, '', url);
      else window.history.pushState(null, '', url);
    }
    // Every step starts at the top, also with Back/Forward: the browser must not restore the old position.
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 0);
  }, [step]);
  const [intake] = useState<Intake | null>(initialIntake);
  const [universities] = useState<University[]>(initialUniversities);
  const [query, setQuery] = useState('');
  const [uniId, setUniId] = useState('');
  const [notListed, setNotListed] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [checks, setChecks] = useState({
    terms_accepted: false,
    age_confirmed: false,
    independence_acknowledged: false,
    marketing_opt_in: false,
    sms_opt_in: false,
  });
  const [errors, setErrors] = useState<Partial<Record<FieldError, true>>>({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<'' | 'already' | 'full' | 'closed'>('');
  const [reservation, setReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? 'null') as Reservation | null;
      if (saved && saved.locale === locale && new Date(saved.hold_expires_at) > new Date()) {
        setReservation(saved);
        setStep(4);
      }
    } catch {}
  }, [locale]);

  const uni = universities.find((u) => u.id === uniId);
  // Email in two parts when the school's domain is known: the student types the start, the domain stays fixed
  // (a choice when the school has several). "Use another address" switches to a plain field.
  const domains = uni?.email_domains ?? [];
  const [emailLocal, setEmailLocal] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [customEmail, setCustomEmail] = useState(false);
  const splitEmail = domains.length > 0 && !customEmail;
  useEffect(() => {
    setEmailDomain(domains[0] ?? '');
    setCustomEmail(false);
  }, [uniId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (splitEmail) setForm((f) => ({ ...f, email: emailLocal.trim() ? `${emailLocal.trim()}@${emailDomain}` : '' }));
  }, [splitEmail, emailLocal, emailDomain]);
  function typeLocal(value: string) {
    // A full address pasted in the first part: keep it whole if it uses another domain.
    const [local, domain] = value.split('@');
    if (domain === undefined) return setEmailLocal(value);
    if (domains.includes(domain.toLowerCase())) {
      setEmailDomain(domain.toLowerCase());
      return setEmailLocal(local);
    }
    setCustomEmail(true);
    setForm((f) => ({ ...f, email: value }));
  }
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter((u) => `${u.name} ${u.short_name} ${u.state}`.toLowerCase().includes(q));
  }, [query, universities]);

  const money = (cents: number) => formatMoney(cents, locale);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const tick = (k: keyof typeof checks) => (e: React.ChangeEvent<HTMLInputElement>) => setChecks({ ...checks, [k]: e.target.checked });
  const err = (k: FieldError) => errors[k] && <p className="error">{t.errors[k]}</p>;

  function next2() {
    const e: Partial<Record<FieldError, true>> = {};
    if (!form.first_name.trim()) e.first_name = true;
    if (!form.last_name.trim()) e.last_name = true;
    if (!EMAIL_RE.test(form.email.trim())) e.email = true;
    setErrors(e);
    if (!Object.keys(e).length) setStep(3);
  }

  async function submit() {
    setErrors({});
    setBanner('');
    setBusy(true);
    const res = await api('start_registration', { ...form, ...checks, university_id: uniId, utm: utmParams(), locale }).catch(() => null);
    setBusy(false);
    if (!res) return setBanner(t.errors.couldNotSave);
    if (res.result === 'ok') {
      const r: Reservation = { ...res, locale };
      try { sessionStorage.setItem(STORE, JSON.stringify(r)); } catch {}
      setReservation(r);
      setStep(4);
    } else if (res.result === 'invalid') {
      const e: Partial<Record<FieldError, true>> = {};
      for (const k of Object.keys(res.errors ?? {})) if (k in t.errors) e[k as FieldError] = true;
      setErrors(e);
      setBanner(t.errors.check);
      if (e.first_name || e.last_name || e.email) setStep(2);
      else if (e.university_id) setStep(1);
    } else if (res.result === 'already_registered') setOutcome('already');
    else if (res.result === 'full') setOutcome('full');
    else if (res.result === 'closed') setOutcome('closed');
    else if (res.result === 'rate_limited') setBanner(t.errors.tooMany);
    else setBanner(t.errors.couldNotSave);
  }

  function restart() {
    try { sessionStorage.removeItem(STORE); } catch {}
    setReservation(null);
    setStep(3);
  }

  const closed = outcome === 'closed' || !intake || intake.status === 'closed';
  const full = outcome === 'full' || intake?.status === 'full';

  if (outcome === 'already') {
    return (
      <div className="register-card">
        <h1>{t.alreadyTitle}</h1>
        <p className="lead">{t.alreadyLead}</p>
        <Link className="btn" href={homePath(locale)}>{t.backHome}</Link>
      </div>
    );
  }

  if (closed || full) {
    return (
      <div className="register-card">
        <h1>{full ? t.fullTitle : t.closedTitle}</h1>
        <p className="lead">{full ? t.fullLead : t.closedLead}</p>
        <WaitlistForm locale={locale} reason={full ? 'full' : 'closed'} intakeId={intake?.intake_id} universityId={uniId || undefined} defaultFirstName={form.first_name} defaultEmail={form.email} />
      </div>
    );
  }

  const tax = intake.pricing.vatExempt ? dict(locale).tax.exempt : dict(locale).tax.included;
  const price = money(intake.pricing.priceCents);
  const q = `?lang=${locale}`;

  return (
    <div className="register-card">
      <ol className="stepper" aria-label={t.stepOf(step)}>
        {[1, 2, 3, 4].map((n) => <li key={n} className={n <= step ? 'done' : ''} />)}
      </ol>
      {banner && <p className="alert" role="alert">{banner}</p>}

      {step === 1 && (
        <div className="form">
          <p style={{ margin: 0 }}><Link className="linklike" href={homePath(locale)}>← {t.back}</Link></p>
          <span className="eyebrow">{t.stepOf(1)}</span>
          <h1>{t.uniTitle}</h1>
          <p className="help">{t.uniHelp}</p>
          {!notListed ? (
            <>
              <div className="field">
                <label htmlFor="uni-search">{t.search}</label>
                <input id="uni-search" type="search" placeholder={t.searchPlaceholder} value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    // Typing something else than the chosen name clears the choice.
                    if (uni && e.target.value !== uni.name) setUniId('');
                  }}
                />
              </div>
              <ul className="uni-list" aria-label={t.universities}>
                {filtered.map((u) => (
                  <li key={u.id}>
                    <button type="button" aria-pressed={u.id === uniId} onClick={() => { setUniId(u.id); setQuery(u.name); }}>
                      {u.name}
                      {u.state && <small>{u.state}</small>}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li style={{ padding: 16 }} className="help">{t.noMatch(query)}</li>}
              </ul>
              {err('university_id')}
              <div className="row-actions">
                <button type="button" className="linklike" onClick={() => setNotListed(true)}>{t.notListed}</button>
                <button type="button" className="btn btn-green" disabled={!uniId} onClick={() => setStep(2)}>
                  {uni ? t.continueWith(uni.short_name || uni.name) : t.continue}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="lead" style={{ fontSize: 17 }}>{t.notListedLead}</p>
              <WaitlistForm locale={locale} reason="university_not_listed" intakeId={intake.intake_id} showUniversityField />
              <button type="button" className="linklike" onClick={() => setNotListed(false)}>{t.backToList}</button>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="form">
          <span className="eyebrow">{t.stepOf(2)}</span>
          <h1>{t.detailsTitle}</h1>
          <div className="form-row">
            <div className="field">
              <label htmlFor="first">{t.first}</label>
              <input id="first" autoComplete="given-name" value={form.first_name} onChange={set('first_name')} aria-invalid={!!errors.first_name} />
              {err('first_name')}
            </div>
            <div className="field">
              <label htmlFor="last">{t.last}</label>
              <input id="last" autoComplete="family-name" value={form.last_name} onChange={set('last_name')} aria-invalid={!!errors.last_name} />
              {err('last_name')}
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">{t.email}</label>
            {splitEmail ? (
              <div className={`email-split${errors.email ? ' is-invalid' : ''}`}>
                <input id="email" type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder={t.emailLocal} value={emailLocal} onChange={(e) => typeLocal(e.target.value)} aria-invalid={!!errors.email} aria-describedby="email-help" />
                {/* The domain is pre-filled but stays editable; other domains of the school are suggested. */}
                <span className="email-at" aria-hidden="true">@</span>
                <input
                  className="email-domain-input"
                  aria-label="@"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value.replace(/^@/, '').trim().toLowerCase())}
                  list="school-domains"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  size={Math.max(emailDomain.length, 8)}
                />
                <datalist id="school-domains">{domains.map((d) => <option key={d} value={d} />)}</datalist>
              </div>
            ) : (
              <input id="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby="email-help" />
            )}
            <p className="help" id="email-help">
              {uni?.email_domains.length
                ? t.emailHelpDomains(uni.short_name || uni.name, uni.email_domains.map((d) => `@${d}`).join(', '))
                : t.emailHelp}
              {splitEmail && <> <button type="button" className="linklike email-other" onClick={() => { setCustomEmail(true); setForm((f) => ({ ...f, email: '' })); }}>{t.emailOther}</button></>}
            </p>
            {err('email')}
          </div>
          <div className="field">
            <label htmlFor="phone">{t.phone} <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{t.optional}</span></label>
            <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="row-actions">
            <button type="button" className="linklike" onClick={() => setStep(1)}>{t.back}</button>
            <button type="button" className="btn btn-green" onClick={next2}>{t.continue}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form">
          <span className="eyebrow">{t.stepOf(3)}</span>
          <h1>{t.confirmTitle}</h1>
          <div className="summary">
            <span className="badge">{t.badge}</span>{' '}
            <strong style={{ color: 'var(--navy)' }}>{t.fundedBy}</strong>
            <p style={{ margin: '12px 0 0', fontSize: 15, color: 'var(--muted)' }}>
              {t.fundingText(money(intake.pricing.corporateCents), money(intake.pricing.fundingCents), price, tax)}
            </p>
          </div>
          <label className="check">
            <input type="checkbox" checked={checks.terms_accepted} onChange={tick('terms_accepted')} />
            <span>
              {t.termsBefore}
              <Link href={`/terms${q}`} target="_blank">{t.termsLink}</Link>
              {t.termsAnd}
              <Link href={`/refund-policy${q}`} target="_blank">{t.refundLink}</Link>
              {t.termsAfter}
            </span>
          </label>
          {err('terms_accepted')}
          <label className="check">
            <input type="checkbox" checked={checks.age_confirmed} onChange={tick('age_confirmed')} />
            <span>{t.age(uni?.name ?? t.myUniversity)}</span>
          </label>
          {err('age_confirmed')}
          <label className="check">
            <input type="checkbox" checked={checks.independence_acknowledged} onChange={tick('independence_acknowledged')} />
            <span>{t.independence}</span>
          </label>
          {err('independence_acknowledged')}
          <label className="check">
            <input type="checkbox" checked={checks.marketing_opt_in} onChange={tick('marketing_opt_in')} />
            <span>{t.marketing}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={checks.sms_opt_in} onChange={tick('sms_opt_in')} />
            <span>{t.sms}</span>
          </label>
          <div className="row-actions">
            <button type="button" className="linklike" onClick={() => setStep(2)}>{t.back}</button>
            <button
              type="button"
              className="btn btn-green"
              disabled={busy || !checks.terms_accepted || !checks.age_confirmed || !checks.independence_acknowledged}
              onClick={submit}
            >
              {busy ? <><Spinner />{t.reserving}</> : t.reserve}
            </button>
          </div>
        </div>
      )}

      {step === 4 && reservation && <Payment locale={locale} reservation={reservation} tax={tax} onBack={restart} />}
    </div>
  );
}

function Payment({ locale, reservation, tax, onBack }: { locale: Locale; reservation: Reservation; tax: string; onBack: () => void }) {
  const t = dict(locale).register;
  const expires = useMemo(() => new Date(reservation.hold_expires_at), [reservation.hold_expires_at]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const s = reservation.summary;
  const left = Math.max(0, Math.floor((expires.getTime() - now) / 1000));
  const money = (cents: number) => formatMoney(cents, locale);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function pay() {
    setBusy(true);
    setError('');
    const res = await api('create_checkout', {
      registration_id: reservation.registration_id,
      client_token: reservation.client_token,
    }).catch(() => null);
    if (res?.result === 'ok') {
      window.location.assign(res.checkout_url);
      return;
    }
    setBusy(false);
    if (res?.result === 'expired') setNow(expires.getTime());
    else if (res?.result === 'already_paid') window.location.assign(`/confirmation?id=${reservation.registration_id}&t=${encodeURIComponent(reservation.client_token)}&lang=${locale}`);
    else if (res?.result === 'payments_unavailable') setError(t.unavailable);
    else setError(t.couldNotOpen);
  }

  if (left === 0) {
    return (
      <div className="form">
        <h1>{t.expiredTitle}</h1>
        <p className="lead">{t.expiredLead}</p>
        <div><button type="button" className="btn" onClick={onBack}>{t.tryAgain}</button></div>
      </div>
    );
  }

  const amount = money(s.amount_cents);
  const time = expires.toLocaleTimeString(LOCALES[locale].intl, { hour: 'numeric', minute: '2-digit' });
  const remaining = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div className="form">
      <span className="eyebrow">{t.stepOf(4)}</span>
      <h1>{t.payTitle}</h1>
      <div className="summary">
        <span className="badge">{t.badge}</span>{' '}
        <strong style={{ color: 'var(--navy)' }}>{t.fundedBy}</strong>
        <p style={{ margin: '14px 0 0', fontWeight: 700 }}>{t.summary}</p>
        <dl>
          <div><dt>{t.name}</dt><dd>{s.name}</dd></div>
          <div><dt>Email</dt><dd>{s.email}</dd></div>
          <div><dt>{t.university}</dt><dd>{s.university}</dd></div>
          <div><dt>{t.programPrice}</dt><dd>{money(s.corporate_cents)}</dd></div>
          <div><dt>{t.fundedBy}</dt><dd style={{ color: 'var(--green-dark)' }}>− {money(s.corporate_cents - s.amount_cents)}</dd></div>
          <div><dt>{t.youPay}</dt><dd>{amount} · {tax}</dd></div>
        </dl>
      </div>
      <p className="price-alert" role="timer" aria-live="off">{t.heldUntil(time, remaining)}</p>
      {error && <p className="alert" role="alert">{error}</p>}
      <button type="button" className="btn btn-green" style={{ width: '100%' }} disabled={busy} onClick={pay}>
        {busy ? <><Spinner />{t.opening}</> : t.pay(amount)}
      </button>
      <p className="help">{t.explain}</p>
      <div><button type="button" className="linklike" onClick={onBack}>{t.backToDetails}</button></div>
    </div>
  );
}

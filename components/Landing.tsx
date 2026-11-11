import Image from 'next/image';
import Link from 'next/link';
import Header from './Header';
import Footer from './Footer';
import AgentDemo from './AgentDemo';
import PriceCard from './PriceCard';
import { LinkedInLogo } from './HomeChrome';
import { publicIntake } from '@/lib/school';
import { pricingFor } from '@/lib/pricing';
import { company } from '@/lib/company';
import { dict } from '@/lib/i18n';
import { formatDate, formatMoney, LOCALES, registerPath, type Locale } from '@/lib/locales';
import { SITE_DOMAIN } from '@/lib/site';

const SOURCES = [
  'https://news.microsoft.com/source/2024/05/08/microsoft-and-linkedin-release-the-2024-work-trend-index/',
  'https://www.weforum.org/publications/the-future-of-jobs-report-2025/',
  'https://learning.linkedin.com/resources/workplace-learning-report',
];

const Icon = {
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>,
  code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4" /><path d="M4 20L20 4" /></svg>,
  medal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6" /><path d="M9 14.5L8 22l4-2 4 2-1-7.5" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};

export default async function Landing({ locale }: { locale: Locale }) {
  const d = dict(locale);
  const p = pricingFor(locale);
  const intake = await publicIntake();
  const money = (cents: number) => formatMoney(cents, locale);
  const price = money(p.priceCents);
  const full = money(p.corporateCents);
  const funding = money(p.fundingCents);
  const starts = intake ? formatDate(intake.starts_at, locale) : null;
  const tax = p.vatExempt ? d.tax.exempt : d.tax.included;
  // Every question goes through the support form.
  const support = `${SITE_DOMAIN}/support`;
  const register = registerPath(locale);
  const q = `?lang=${locale}`;

  return (
    <div lang={LOCALES[locale].lang}>
      <Header locale={locale} />
      <main id="main">
        {/* Hero + pricing */}
        <section className="hero hero-bands">
          <div className="container hero-grid" style={{ alignItems: 'start' }}>
            <div className="hero-copy">
              <div className="section-logo"><LinkedInLogo size={48} /></div>
              <span className="eyebrow">{d.hero.eyebrow}</span>
              <h1>{d.hero.title}</h1>
              <p className="lead">{d.hero.lead}</p>
              <ul className="highlights">
                <li>
                  <div className="icon">{Icon.calendar}</div>
                  <strong>{d.hero.modulesTitle}</strong>
                  <span>{d.hero.instant}</span>
                </li>
                <li>
                  <div className="icon">{Icon.code}</div>
                  <strong>{d.hero.codeTitle}</strong>
                  <span>{d.hero.codeSub}</span>
                </li>
                <li>
                  <div className="icon">{Icon.medal}</div>
                  <strong>{d.hero.certTitle}</strong>
                  <span>{d.hero.certSub}</span>
                </li>
              </ul>
            </div>

            <PriceCard
              locale={locale}
              price={price}
              fullPrice={full}
              funding={funding}
              taxLabel={tax}
              status={intake?.status ?? null}
              closesOn={intake?.status === 'open' ? formatDate(intake.registration_deadline, locale) : null}
            />
          </div>
        </section>

        {/* Mascot */}
        <section className="mascot-band">
          <div className="container mascot-cta">
            <Image src="/assets/kai-cert.png" alt={d.mascot.alt} width={800} height={800} sizes="(max-width: 760px) 240px, 320px" />
            <div>
              <h2>{d.mascot.title}</h2>
              <p className="lead" style={{ marginBottom: 28 }}>{d.mascot.lead}</p>
              <Link className="btn btn-green" href={register}>{d.mascot.cta}</Link>
            </div>
          </div>
        </section>

        {/* Career agent */}
        <section className="section-alt">
          <div className="container split">
            <div>
              <h2>{d.agent.title}</h2>
              <p className="lead">{d.agent.lead}</p>
            </div>
            <figure style={{ margin: 0 }}>
              <AgentDemo locale={locale} />
              <figcaption className="caption">{d.agent.caption}</figcaption>
            </figure>
          </div>
        </section>

        {/* Job market */}
        <section>
          <div className="container">
            <div className="section-head">
              <h2>{d.market.title}</h2>
            </div>
            <div className="grid grid-3">
              {d.market.stats.map((s, i) => (
                <article className="card" key={s.source}>
                  <p className="stat">{s.stat}</p>
                  <p className="source">
                    <strong>{d.market.source}</strong>
                    <a href={SOURCES[i]}>{s.source}</a>
                  </p>
                </article>
              ))}
            </div>
            <p className="pull">{d.market.pull}</p>
          </div>
        </section>

        {/* What you get */}
        <section className="section-alt" id="what-you-get">
          <div className="container">
            <div className="section-head">
              <h2>{d.get.title}</h2>
            </div>
            <div className="grid grid-3">
              <article className="card">
                <div className="icon">{Icon.shield}</div>
                <h3>{d.get.verifyTitle}</h3>
                <p>{d.get.verifyText(`[${SITE_DOMAIN}]`)}</p>
              </article>
              <article className="card">
                <div className="icon">{Icon.clock}</div>
                <h3>{d.get.timeTitle}</h3>
                <p>{d.get.timeText}</p>
              </article>
              <article className="card">
                <div className="icon">{Icon.medal}</div>
                <h3>{d.get.certTitle}</h3>
                <p>{d.get.certText}</p>
              </article>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works">
          <div className="container">
            <div className="section-head">
              <h2>{d.how.title}</h2>
            </div>
            <ol className="numbered">
              {d.how.steps.map((s) => (
                <li key={s.b}><span><strong>{s.b}</strong> {s.t}</span></li>
              ))}
            </ol>
          </div>
        </section>

        {/* Modules */}
        <section className="section-dark" id="modules">
          <div className="container">
            <div className="section-head">
              <h2>{d.modules.title}</h2>
            </div>
            <ol className="numbered">
              {d.modules.items.map((m) => (
                <li key={m.b}><span><strong>{m.b}</strong> {m.t}</span></li>
              ))}
            </ol>
          </div>
        </section>

        {/* Is it for you */}
        <section className="section-alt">
          <div className="container split">
            <div>
              <h2>{d.forYou.title}</h2>
            </div>
            <div>
              <p className="lead" style={{ color: 'var(--navy)' }}>{d.forYou.p1}</p>
              <p className="lead">{d.forYou.p2}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq">
          <div className="container">
            <div className="section-head">
              <h2>{d.faq.title}</h2>
            </div>
            <div className="faq">
              {d.faq.items({ full, funding, price, starts, support }).map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>
                    {item.a}
                    {'link' in item && item.link && (
                      <> <Link href={`${item.link.href}${q}`}>{item.link.label}</Link></>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

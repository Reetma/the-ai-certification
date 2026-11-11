import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { LinkedInLogo, Mark, SiteFooter, SiteHeader, TRADEMARKS } from '@/components/HomeChrome';
import { PROGRAM_CURRENCY, PROGRAM_PRICE_CENTS, PROGRAMS, programBySlug, programHref } from '@/lib/catalog';
import { publicIntake } from '@/lib/school';
import { onSaleChecker } from '@/lib/visibility';
import NotifyForm from '@/components/NotifyForm';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = programBySlug((await params).slug);
  if (!p) return {};
  return { title: `${p.title} certification | The AI Certification`, description: p.description };
}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export default async function CertificationPage({ params }: Props) {
  const p = programBySlug((await params).slug);
  if (!p) notFound();
  if (p.href) redirect(p.href);
  const intake = await publicIntake();
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: PROGRAM_CURRENCY, maximumFractionDigits: 0 }).format(PROGRAM_PRICE_CENTS / 100);
  const lessons = p.modules.reduce((n, m) => n + m.lessons.length, 0);
  const others = PROGRAMS.filter((o) => o.slug !== p.slug && o.group === p.group).concat(PROGRAMS.filter((o) => o.group !== p.group)).slice(0, 3);
  const open = intake?.status === 'open';
  const isAvailable = await onSaleChecker();
  const available = isAvailable(p.slug);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero hero-bands">
          <div className="container hero-grid" style={{ alignItems: 'start' }}>
            <div className="hero-copy">
              <p className="cp-crumb"><Link href="/#certifications">Certifications</Link> / {p.group}</p>
              <div className="cp-mark"><Mark cert={p} size={72} /></div>
              <span className="eyebrow" style={{ color: p.color }}>{p.area}</span>
              <h1>{p.title}</h1>
              <p className="lead">{p.description}</p>
              <ul className="highlights">
                <li><strong>{p.modules.length} modules</strong><span>{lessons} lessons, about 3 hours</span></li>
                <li><strong>Final exam</strong><span>Earned, not given</span></li>
                <li><strong>Verifiable certificate</strong><span>Ready for LinkedIn</span></li>
              </ul>
            </div>

            <aside className="pass" aria-labelledby="buy-title">
              <h2 id="buy-title" className="pass-label">{available ? 'Available now' : 'Coming soon'}</h2>
              <p className="pass-price"><span className="pass-amount">{price}</span><span className="pass-unit">one-time</span></p>
              <p className="pass-note">VAT not applicable (art. 293 B CGI)</p>
              <ul className="pass-perks">
                <li>{p.modules.length} online modules, {lessons} lessons</li>
                <li>Final exam and verifiable certificate</li>
                <li>6 months of access</li>
              </ul>
              {available && intake && open && (
                <dl className="pass-dates">
                  <div><dt>Registration closes</dt><dd>{date(intake.registration_deadline)}</dd></div>
                </dl>
              )}
              {!available ? (
                <>
                  <p className="pass-closed">We are finishing this certification. Leave your email and we will tell you when it opens.</p>
                  <NotifyForm locale="en-us" />
                </>
              ) : open ? (
                <Link className="btn btn-green pass-cta" href={`/certifications/${p.slug}/enroll`}>Get certified · {price}</Link>
              ) : (
                <p className="pass-closed">Registration is closed for now. <Link href="/#contact">Contact us</Link>.</p>
              )}
              <p className="pass-trust">Secure payment · Certificate in your name</p>
            </aside>
          </div>
        </section>

        <section>
          <div className="container split">
            <div>
              <span className="eyebrow">What you will learn</span>
              <h2>By the end, you can…</h2>
            </div>
            <ul className="checklist" style={{ marginTop: 0 }}>
              {p.outcomes.map((o) => <li key={o}>{o}</li>)}
            </ul>
          </div>
        </section>

        <section className="section-alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Programme</span>
              <h2>{p.modules.length} modules, then the exam</h2>
            </div>
            <div className="cp-modules">
              {p.modules.map((m, i) => (
                <article key={m.title} className="card">
                  <span className="cp-num" style={{ background: p.color }}>{i + 1}</span>
                  <h3>{m.title}</h3>
                  <ul>{m.lessons.map((l) => <li key={l}>{l}</li>)}</ul>
                </article>
              ))}
              <article className="card cp-exam">
                <span className="cp-num">✓</span>
                <h3>Final exam</h3>
                <p>Pass it and your certificate is issued in your name, with its own reference and verification page.</p>
              </article>
            </div>
          </div>
        </section>

        <section>
          <div className="container split" style={{ alignItems: 'center' }}>
            <div>
              <span className="eyebrow">Made to be shown</span>
              <h2 className="hm-li-title"><LinkedInLogo size={30} /> Add it to your LinkedIn profile</h2>
              <p className="lead">Your {p.title} certificate goes in the Licenses &amp; certifications section of LinkedIn, with The AI Certification as the issuer and its credential ID.</p>
            </div>
            <div className="hm-linkedin" aria-hidden="true">
              <div className="hm-linkedin-head"><LinkedInLogo size={24} /><strong>Licenses &amp; certifications</strong><span>Example</span></div>
              <div className="hm-linkedin-row">
                <Mark cert={p} size={46} />
                <div>
                  <strong>{p.title}</strong>
                  <span>The AI Certification</span>
                  <small>Issued 2026 · Credential ID TAC-SAMPLE</small>
                  <em>Show credential ↗</em>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">More certifications</span>
              <h2>Keep going</h2>
            </div>
            <div className="hm-certs">
              {others.map((o) => (
                <Link key={o.slug} href={programHref(o)} className="hm-cert-card">
                  <div className="hm-cert-top"><Mark cert={o} /><span className={`hm-status${isAvailable(o.slug) ? ' is-live' : ''}`}>{isAvailable(o.slug) ? 'Available now' : 'Coming soon'}</span></div>
                  <h4>{o.title}</h4>
                  <p>{o.text}</p>
                  <span className="hm-cert-more">See the certification →</span>
                </Link>
              ))}
            </div>
            <p className="hm-legal">{TRADEMARKS}</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

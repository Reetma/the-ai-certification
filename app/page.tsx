import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import CertBadge from '@/components/CertBadge';
import ContactForm from '@/components/ContactForm';
import { LinkedInLogo, Mark, SiteFooter, SiteHeader, TRADEMARKS } from '@/components/HomeChrome';
import { GROUPS, PROGRAMS, programBySlug, programHref } from '@/lib/catalog';
import { company } from '@/lib/company';
import { onSaleChecker } from '@/lib/visibility';
import { SITE_DOMAIN } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The AI Certification | Prove what you can do with AI',
  description:
    'The AI Certification designs and delivers online AI certifications for companies, schools, students and associations: ChatGPT, Claude, Copilot, prompting, automation, agents and more. A real exam, and a certificate anyone can verify.',
};

// The general home page.

const SOLUTIONS = [
  { img: '/images/team-meeting.webp', title: 'Companies', text: 'Upskill a team and give every person proof of what they learned.', points: ['Corporate rate per seat', 'Online, in five languages', 'One verifiable certificate per person'] },
  { img: '/images/laptop-work.webp', title: 'Schools & universities', text: 'Add a checkable credential to your students’ profile, with nothing to build.', points: ['Funded rate for students', 'Nothing to host or maintain', 'Independent from the curriculum'] },
  { img: '/images/students.webp', title: 'Students', text: 'Show employers a skill they can check, not just a line on a CV.', points: ['Funded place for students', 'About three hours online', 'Ready for your LinkedIn profile'] },
  { img: '/images/volunteers.webp', title: 'Associations', text: 'Recognise what your volunteers and members learn with you.', points: ['Pricing for non-profits', 'Certify members and volunteers', 'The same verifiable standard'] },
];

const check = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;
const shield = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>;

// Groups shown in full; the rest go in the sideways carousel.
const FEATURED_GROUPS = 2;

function CatalogBlock({ g, isAvailable }: { g: (typeof GROUPS)[number]; isAvailable: (slug: string) => boolean }) {
  const certs = PROGRAMS.filter((c) => c.group === g.title);
  return (
    <div className="hm-block">
      <div className="hm-block-head">
        <h3>{g.title}</h3>
        <p>{g.text}</p>
        <span>{certs.length} certification{certs.length > 1 ? 's' : ''}</span>
      </div>
      <div className={`hm-certs${certs.length === 1 ? ' is-single' : ''}`}>
        {certs.length === 1 && certs.map((c) => (
          // Alone in its block: a wide, horizontal card.
          <Link key={c.slug} href={programHref(c)} className="hm-cert-card hm-feature">
            <Mark cert={c} size={80} />
            <div className="hm-feature-body">
              <span className={`hm-status${isAvailable(c.slug) ? ' is-live' : ''}`}>{isAvailable(c.slug) ? 'Available now' : 'Coming soon'}</span>
              <h4>{c.title}</h4>
              <p>{c.text}</p>
              {c.tags && <ul className="hm-tags">{c.tags.map((t) => <li key={t}>{t}</li>)}</ul>}
            </div>
            <span className="btn btn-green hm-feature-cta">Discover →</span>
          </Link>
        ))}
        {certs.length > 1 && certs.map((c) => (
          <Link key={c.slug} href={programHref(c)} className="hm-cert-card">
            <div className="hm-cert-top">
              <Mark cert={c} />
              <span className={`hm-status${isAvailable(c.slug) ? ' is-live' : ''}`}>{isAvailable(c.slug) ? 'Available now' : 'Coming soon'}</span>
            </div>
            <h4>{c.title}</h4>
            <p>{c.text}</p>
            <span className="hm-cert-more">See the certification →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const isAvailable = await onSaleChecker();
  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="hero hero-bands">
          <div className="container hm-hero">
            <div>
              <span className="eyebrow">Skills certification for everyone</span>
              <h1>Prove what you can do with AI.</h1>
              <p className="lead">
                ChatGPT, Claude, Copilot, prompting, automation, agents and more. The AI Certification designs online AI certifications for
                companies, schools, students and associations: a real exam, and a certificate anyone can verify.
              </p>
              <div className="hm-ctas">
                <a className="btn btn-green" href="#certifications">See the certifications</a>
                <a className="btn btn-ghost" href="#contact">Talk to us</a>
              </div>
            </div>

            <div className="hm-visual">
              <Image
                className="hm-mascot"
                src="/assets/kai-laptop.png"
                alt="Kai, The AI Certification’s border collie, working on a laptop"
                width={900}
                height={900}
                sizes="(max-width: 960px) 80vw, 460px"
                priority
              />
              <div className="hm-cert" aria-hidden="true">
                <CertBadge kind="ai" color="#1F3A75" size={44} />
                <div>
                  <small>Certificate of completion</small>
                  <strong>AI for students</strong>
                  <span>Ref. TAC-SAMPLE · Verified</span>
                </div>
              </div>
              <div className="hm-li" aria-hidden="true">
                <LinkedInLogo size={20} />
                <span>Added to profile</span>
              </div>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="section-alt" id="certifications">
          <div className="container">
            <div className="section-head">
              <div className="section-logo"><LinkedInLogo size={48} /></div>
              <span className="eyebrow">Certifications</span>
              <h2>Get certified. Shine on LinkedIn. Walk into interviews with proof.</h2>
              <p className="lead">The AI tools every job now relies on. Pass a real exam, add your certificate to LinkedIn and show the skills the best companies look for, with a credential recruiters can verify in seconds.</p>
            </div>
            <div className="hm-blocks">
              {GROUPS.slice(0, FEATURED_GROUPS).map((g) => <CatalogBlock key={g.title} g={g} isAvailable={isAvailable} />)}
            </div>
            {/* The other groups sit in a row you swipe or scroll sideways. */}
            <div className="hm-carousel" aria-label="More certifications">
              {GROUPS.slice(FEATURED_GROUPS).map((g) => <CatalogBlock key={g.title} g={g} isAvailable={isAvailable} />)}
            </div>
            <p className="hm-legal">{TRADEMARKS}</p>
          </div>
        </section>

        {/* LinkedIn */}
        <section id="linkedin">
          <div className="container split" style={{ alignItems: 'center' }}>
            <div>
              <span className="eyebrow">Made to be shown</span>
              <h2 className="hm-li-title"><LinkedInLogo size={34} /> Put it on your LinkedIn profile</h2>
              <p className="lead">
                Every certificate goes in the Licenses &amp; certifications section of LinkedIn, with its name, The AI Certification as the issuer
                and its credential ID. Recruiters see it on your profile and can check it on our verification page.
              </p>
              <ul className="checklist">
                <li>Name, issuer, date and credential ID, ready to copy</li>
                <li>A link to the public verification page</li>
                <li>Seen by every recruiter who opens your profile</li>
              </ul>
            </div>
            <div className="hm-linkedin" aria-hidden="true">
              <div className="hm-linkedin-head">
                <LinkedInLogo size={24} />
                <strong>Licenses &amp; certifications</strong>
                <span>Example</span>
              </div>
              {[programBySlug('ai-at-work')!, programBySlug('chatgpt')!, programBySlug('prompt-engineering')!].map((c, i) => (
                <div key={c.title} className="hm-linkedin-row">
                  <Mark cert={c} size={46} />
                  <div>
                    <strong>{c.title}</strong>
                    <span>The AI Certification</span>
                    <small>Issued 2026 · Credential ID TAC-SAMPLE{i + 1}</small>
                    {i === 0 && <em>Show credential ↗</em>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions */}
        <section className="section-alt" id="solutions">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Solutions</span>
              <h2>One standard for everyone who needs to prove a skill</h2>
            </div>
            <div className="hm-solutions">
              {SOLUTIONS.map((s) => (
                <article key={s.title} className="hm-solution">
                  <div className="hm-solution-img"><Image src={s.img} alt="" fill sizes="(max-width: 760px) 90vw, 280px" /></div>
                  <div className="hm-solution-body">
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    <ul>{s.points.map((p) => <li key={p}>{check}{p}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Verification */}
        <section id="verify">
          <div className="container split" style={{ alignItems: 'center' }}>
            <div>
              <span className="eyebrow">Verification</span>
              <h2>A certificate you can check, not take on trust</h2>
              <p className="lead">Every certificate has its own reference and a public page. A recruiter, a manager or a school can confirm it in seconds.</p>
              <ol className="numbered" style={{ marginTop: 24 }}>
                <li><span><strong>Learn online.</strong> Short modules at your own pace, built around real tasks.</span></li>
                <li><span><strong>Pass a real exam.</strong> The certificate is earned, never given for showing up.</span></li>
                <li><span><strong>Prove it anywhere.</strong> CV, LinkedIn, interviews: anyone can verify it.</span></li>
              </ol>
            </div>
            <div className="co-browser" aria-hidden="true">
              <div className="co-browser-bar"><span /><span /><span /><p>{SITE_DOMAIN}/verify/TAC-SAMPLE</p></div>
              <div className="co-browser-body">
                <div className="co-valid">{shield}<div><strong>Valid certificate</strong><small>Sample verification page</small></div></div>
                <dl>
                  <div><dt>Certification</dt><dd>AI for students</dd></div>
                  <div><dt>Holder</dt><dd>Alex Martin</dd></div>
                  <div><dt>Reference</dt><dd>TAC-SAMPLE</dd></div>
                  <div><dt>Status</dt><dd className="ok">Active</dd></div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Ambition */}
        <section className="section-dark">
          <div className="container split">
            <div>
              <span className="eyebrow">Our ambition</span>
              <h2>This is the start of something big.</h2>
            </div>
            <p className="lead">
              A certificate should be a fact you can check. We are building that standard, one certification and one country at a
              time, for everyone who has a skill to prove.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="hero-bands" id="contact">
          <div className="container split">
            <div>
              <span className="eyebrow">Contact</span>
              <h2>Certify your team, your students or your members</h2>
              <p className="lead">Tell us who you are and what you need. We reply by email.</p>
            </div>
            <div className="card"><ContactForm /></div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

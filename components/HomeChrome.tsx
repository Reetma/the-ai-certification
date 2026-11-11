import Link from 'next/link';
import HomeMenu from '@/components/HomeMenu';
import AccountButton from './AccountButton';
import { existsSync } from 'node:fs';
import path from 'node:path';
import CertBadge from './CertBadge';
import { company } from '@/lib/company';
import type { Program } from '@/lib/catalog';
import Logo from '@/components/Logo';

// Shared pieces of the general site (home page and certification pages). None of them link to the student pages.

const hasLogo = (file?: string) => Boolean(file && existsSync(path.join(process.cwd(), 'public', 'logos', file)));

/** The certification's logo when its file is in public/logos/, otherwise its own badge. */
export function Mark({ cert, size = 56 }: { cert: Program; size?: number }) {
  if (hasLogo(cert.logo) && cert.wide) {
    // Landscape artwork shown as a rounded tile.
    const h = Math.round(size * 1.3);
    return <img src={`/logos/${cert.logo}`} alt="" width={Math.round(h * 1.5)} height={h} style={{ objectFit: 'cover', borderRadius: h / 5 }} />;
  }
  if (hasLogo(cert.logo)) return <img src={`/logos/${cert.logo}`} alt="" width={size} height={size} style={{ objectFit: 'contain' }} />;
  return <CertBadge kind={cert.kind} color={cert.color} size={size} />;
}

export function LinkedInLogo({ size = 22 }: { size?: number }) {
  // LinkedIn "in" mark in the site navy: the image in public/logos/ when present, otherwise the Simple Icons version.
  if (hasLogo('linkedin.webp')) return <img src="/logos/linkedin.webp" alt="LinkedIn" width={size} height={size} style={{ borderRadius: size / 5 }} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="LinkedIn">
      <path fill="#17274C" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <>
      <header className="site-header">
        <nav className="container nav" aria-label="Main">
          <Link className="brand" href="/">
            <Logo height={40} />
          </Link>
          <ul className="hm-links">
            <li><Link href="/#certifications">Certifications</Link></li>
            <li><Link href="/#solutions">Solutions</Link></li>
            <li><Link href="/#linkedin">LinkedIn</Link></li>
            <li><Link href="/#verify">Verification</Link></li>
          </ul>
          <AccountButton className="btn btn-sm btn-green hm-account" signIn="Sign in" mySpace="My space" />
          <HomeMenu />
        </nav>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="brand" href="/"><Logo height={40} /></Link>
            <p>Skills certification for companies, schools, students and associations.</p>
          </div>
          <div>
            <h4>The AI Certification</h4>
            <ul>
              <li><Link href="/#certifications">Certifications</Link></li>
              <li><Link href="/#solutions">Solutions</Link></li>
              <li><Link href="/#verify">Verification</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/legal-notice">Legal notice</Link></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of sale</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><Link href="/support">Help &amp; contact</Link></li>
              <li><Link href="/#contact">Contact form</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The AI Certification{company.name ? ` · ${company.name}` : ''}</span>
        </div>
      </div>
    </footer>
  );
}

export const TRADEMARKS =
  'ChatGPT, DALL·E, Claude, Gemini, NotebookLM, Microsoft, Copilot, Word, Excel, PowerPoint, Outlook, Teams, Perplexity, Midjourney, Adobe Firefly, Runway, Kling, ElevenLabs, Zapier, Make, n8n, Cursor, GitHub, Google and LinkedIn are trademarks of their respective owners. The AI Certification is independent and not affiliated with, sponsored or endorsed by any of them.';

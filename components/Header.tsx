'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { dict } from '@/lib/i18n';
import { member } from '@/lib/i18n/member';
import { homePath, registerPath, type Locale } from '@/lib/locales';
import Logo from '@/components/Logo';

export function Brand({ withMark = true }: { locale?: Locale; withMark?: boolean }) {
  return (
    // The logo always leads to the general home page.
    <Link className="brand" href="/">
      <Logo variant={withMark ? 'full' : 'wordmark'} height={withMark ? 40 : 30} />
    </Link>
  );
}

export default function Header({ locale, minimal = false }: { locale: Locale; minimal?: boolean }) {
  const [open, setOpen] = useState(false);
  // Shown only to people who have signed in before: nothing on the public page points to the member area.
  const [isMember, setIsMember] = useState(false);
  useEffect(() => setIsMember(document.cookie.split('; ').includes('cfx_member=1')), []);
  const t = dict(locale).nav;
  const home = homePath(locale);
  return (
    <>
      <header className="site-header">
        <nav className="container nav" aria-label="Main">
          <Brand locale={locale} />
          {!minimal && (
            <>
              <Link className="btn btn-sm btn-green nav-account" href={isMember ? `/space?lang=${locale}` : `/login?lang=${locale}`}>
                {isMember ? member(locale).mySpace : t.signIn}
              </Link>
              <button
                className="menu-toggle"
                aria-expanded={open}
                aria-controls="nav-links"
                aria-label={t.openMenu}
                onClick={() => setOpen(!open)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              {open && <div className="menu-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
              <ul className={`nav-links${open ? ' open' : ''}`} id="nav-links">
                <li><a href={`${home}#what-you-get`}>{t.whatYouGet}</a></li>
                <li><a href={`${home}#how-it-works`}>{t.howItWorks}</a></li>
                <li><a href={`${home}#modules`}>{t.modules}</a></li>
                <li><a href={`${home}#faq`}>{t.questions}</a></li>
                <li>
                  <Link className="btn btn-sm btn-ghost" href={isMember ? `/space?lang=${locale}` : `/login?lang=${locale}`}>
                    {isMember ? member(locale).mySpace : t.signIn}
                  </Link>
                </li>
                <li><Link className="btn btn-sm btn-green" href={registerPath(locale)}>{t.reserve}</Link></li>
              </ul>
            </>
          )}
        </nav>
      </header>
    </>
  );
}

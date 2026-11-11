'use client';

import Link from 'next/link';
import { useState } from 'react';
import AccountButton from '@/components/AccountButton';

// Phones and tablets: the home header links and the account button, behind a menu button.
export default function HomeMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="hm-menu">
      <button className="menu-toggle" aria-expanded={open} aria-controls="hm-menu-links" aria-label="Menu" onClick={() => setOpen(!open)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <>
          <div className="menu-scrim" onClick={close} aria-hidden="true" />
          <ul id="hm-menu-links" onClick={close}>
            <li><Link href="/#certifications">Certifications</Link></li>
            <li><Link href="/#solutions">Solutions</Link></li>
            <li><Link href="/#linkedin">LinkedIn</Link></li>
            <li><Link href="/#verify">Verification</Link></li>
            <li><AccountButton className="btn btn-sm btn-green" signIn="Sign in" mySpace="My space" /></li>
          </ul>
        </>
      )}
    </div>
  );
}

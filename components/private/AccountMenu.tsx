'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Account menu of the private consoles: an avatar that opens a small card with who is signed in,
// a link to the other space and sign-out.
export default function AccountMenu({
  name,
  email,
  role,
  other,
  links = [],
  signOut,
  light = false,
}: {
  name: string;
  email: string;
  role: string;
  other?: { href: string; label: string };
  /** Shortcuts shown in the card (the header buttons are hidden on phones). */
  links?: { href: string; label: string }[];
  signOut: string;
  /** On a light background (the learner's space) instead of the dark console header. */
  light?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name || email).trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  async function logout() {
    await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    window.location.assign('/');
  }

  return (
    <div className={`cx-menu${light ? ' is-light' : ''}`} ref={ref}>
      <button type="button" className="cx-menu-button" aria-expanded={open} aria-haspopup="menu" aria-label={`${role} : ${email}`} onClick={() => setOpen(!open)}>
        <span className="cx-avatar" aria-hidden="true">{initial}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="cx-menu-card" role="menu">
          <div className="cx-menu-who">
            <span className="cx-avatar cx-avatar-lg" aria-hidden="true">{initial}</span>
            <div>
              <strong>{name || email}</strong>
              {name && <small>{email}</small>}
            </div>
          </div>
          <span className="cx-menu-role">{role}</span>
          {[...(other ? [other] : []), ...links].map((l) => <Link key={l.href} role="menuitem" href={l.href} className="cx-menu-item">{l.label}</Link>)}
          <button role="menuitem" type="button" className="cx-menu-item" onClick={logout}>{signOut}</button>
        </div>
      )}
    </div>
  );
}

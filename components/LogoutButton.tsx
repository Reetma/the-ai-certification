'use client';

import { homePath, type Locale } from '@/lib/locales';

export default function LogoutButton({ label, locale }: { label: string; locale: Locale }) {
  async function out() {
    await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    window.location.assign(homePath(locale));
  }
  return (
    <button type="button" className="btn btn-sm btn-ghost" onClick={out}>
      {label}
    </button>
  );
}

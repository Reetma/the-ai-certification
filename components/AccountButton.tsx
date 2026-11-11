'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// "Sign in" for visitors, "My space" once signed in (the cfx_member cookie lives as long as the session).
export default function AccountButton({ className, signIn, mySpace, lang }: { className: string; signIn: string; mySpace: string; lang?: string }) {
  const [isMember, setIsMember] = useState(false);
  useEffect(() => setIsMember(document.cookie.split('; ').includes('cfx_member=1')), []);
  const q = lang ? `?lang=${lang}` : '';
  return isMember
    ? <Link className={className} href={`/space${q}`}>{mySpace}</Link>
    : <Link className={className} href={`/login${q}`}>{signIn}</Link>;
}

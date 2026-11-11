import Link from 'next/link';
import Logo from '@/components/Logo';

// Logo of the private consoles: the white logo and the space’s badge.
export default function ConsoleBrand({ href, badge }: { href: string; badge: string }) {
  return (
    <Link className="cx-brand" href={href}>
      <Logo height={34} />
      <span className="cx-badge-space">{badge}</span>
    </Link>
  );
}

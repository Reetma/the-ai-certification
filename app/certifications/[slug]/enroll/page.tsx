import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import EnrollFlow from '@/components/EnrollFlow';
import { Mark, SiteHeader } from '@/components/HomeChrome';
import { programBySlug } from '@/lib/catalog';
import { isOnSale } from '@/lib/visibility';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = programBySlug((await params).slug);
  return p ? { title: `Get certified: ${p.title} | The AI Certification`, robots: { index: false } } : {};
}

export default async function EnrollPage({ params }: Props) {
  const p = programBySlug((await params).slug);
  if (!p) notFound();
  if (p.href) redirect(p.href);
  // Not on sale until its course is written.
  if (!(await isOnSale(p.slug))) redirect(`/certifications/${p.slug}`);
  return (
    <>
      <SiteHeader />
      <main id="main" className="register hero-bands">
        <div className="container">
          <div className="register-card">
            <div className="cp-enroll-head">
              <Mark cert={p} size={48} />
              <div>
                <Link href={`/certifications/${p.slug}`} className="help">← {p.title}</Link>
                <h1 style={{ margin: '4px 0 0' }}>Get certified</h1>
              </div>
            </div>
            <EnrollFlow program={p.slug} title={p.title} />
          </div>
        </div>
      </main>
    </>
  );
}

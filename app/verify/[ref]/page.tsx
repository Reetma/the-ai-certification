import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { learn } from '@/lib/i18n/learn';
import { getCourse } from '@/lib/learning';
import { certificateByReference } from '@/lib/learning/progress';
import { formatDate } from '@/lib/locales';
import { localeFromSearch } from '@/lib/requestLocale';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Certificate verification | The AI Certification', robots: { index: false, follow: true } };

type Props = { params: Promise<{ ref: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// Public page of one certificate, the "credential URL" added to LinkedIn.
export default async function CertificateCheck({ params, searchParams }: Props) {
  const { ref } = await params;
  const locale = await localeFromSearch(searchParams);
  const l = learn(locale);
  const cert = await certificateByReference(decodeURIComponent(ref));
  const title = cert ? getCourse(cert.program, locale)?.title ?? cert.program : null;

  return (
    <LegalPage locale={locale} title={l.verifyTitle} updated="">
      {cert ? (
        <section className="verify-card">
          <p className="verify-valid">✓ {l.verifyValid}</p>
          <div className="summary">
            <dl>
              <div><dt>{l.verifyHolder}</dt><dd>{cert.holder_name}</dd></div>
              <div><dt>{l.verifyCert}</dt><dd>{title}</dd></div>
              <div><dt>{l.verifyIssuer}</dt><dd>The AI Certification</dd></div>
              <div><dt>{l.verifyDate}</dt><dd>{formatDate(new Date(cert.issued_at).toISOString(), locale)}</dd></div>
              <div><dt>{l.credentialId}</dt><dd>{cert.reference}</dd></div>
            </dl>
          </div>
        </section>
      ) : (
        <p className="price-alert" role="alert">{l.verifyNotFound}</p>
      )}
      <p style={{ marginTop: 16 }}><Link href={`/verify?lang=${locale}`}>{l.verifyTitle} →</Link></p>
    </LegalPage>
  );
}

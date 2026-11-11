import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LegalPage from '@/components/LegalPage';
import { learn } from '@/lib/i18n/learn';
import { localeFromSearch } from '@/lib/requestLocale';

export const metadata: Metadata = { title: 'Certificate verification | The AI Certification' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Public: anyone (a recruiter, a school) checks a certificate by its credential ID.
export default async function VerifyPage({ searchParams }: Props) {
  const query = await searchParams;
  const locale = await localeFromSearch(searchParams);
  const id = String(query.id ?? '').trim();
  if (id) redirect(`/verify/${encodeURIComponent(id.toUpperCase())}?lang=${locale}`);
  const l = learn(locale);
  return (
    <LegalPage locale={locale} title={l.verifyTitle} updated="">
      <form className="form card" style={{ marginTop: 16 }}>
        <input type="hidden" name="lang" value={locale} />
        <div className="field">
          <label htmlFor="id">{l.credentialId}</label>
          <input id="id" name="id" placeholder="CERT-…" required autoCapitalize="characters" />
        </div>
        <div><button className="btn btn-green" type="submit">{l.verifyTitle}</button></div>
      </form>
    </LegalPage>
  );
}

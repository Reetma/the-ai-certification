import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { Locale } from '@/lib/locales';

// Shared frame for the legal pages: header, a readable column, footer.
export default function LegalPage({ locale, title, updated, children }: { locale: Locale; title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Header locale={locale} />
      <main id="main">
        <section>
          <div className="container legal" style={{ maxWidth: 820 }}>
            <h1>{title}</h1>
            <p className="help">{updated}</p>
            {children}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

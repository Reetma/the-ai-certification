import Link from 'next/link';
import { Brand } from './Header';
import NotifyForm from './NotifyForm';
import { company } from '@/lib/company';
import { dict } from '@/lib/i18n';
import { homePath, type Locale } from '@/lib/locales';

export default function Footer({ locale }: { locale: Locale }) {
  const d = dict(locale);
  const t = d.footer;
  const home = homePath(locale);
  const q = `?lang=${locale}`;

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <ul className="inline-links">
              <li><Link href={`/terms${q}`}>{t.terms}</Link></li>
              <li><Link href={`/refund-policy${q}`}>{t.refund}</Link></li>
              <li><Link href={`/privacy${q}`}>{t.privacy}</Link></li>
              <li><Link href={`/support${q}`}>{locale === 'fr' ? 'Aide et contact' : 'Help & contact'}</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.2, margin: 0 }}>
              {t.getNotified}
            </h4>
            <NotifyForm locale={locale} />
          </div>
        </div>
        <div className="footer-grid">
          <div>
            <Brand withMark={false} />
            <p>{t.tagline}</p>
            {(company.name || company.siren || company.address) && (
              <p>
                {company.name && <>{t.operatedBy} {company.name}<br /></>}
                {company.siren && <>SIREN {company.siren}<br /></>}
                {company.address}
              </p>
            )}
          </div>
          <div>
            <h4>{t.program}</h4>
            <ul>
              <li><a href={`${home}#what-you-get`}>{d.nav.whatYouGet}</a></li>
              <li><a href={`${home}#how-it-works`}>{d.nav.howItWorks}</a></li>
              <li><a href={`${home}#modules`}>{d.nav.modules}</a></li>
              <li><a href={`${home}#faq`}>{d.nav.questions}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t.contact}</h4>
            <ul>
              <li><Link href={`/support${q}`}>{locale === 'fr' ? 'Aide et contact' : 'Help & contact'}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t.legal}</h4>
            <ul>
              <li><Link href={`/terms${q}`}>{t.terms}</Link></li>
              <li><Link href={`/legal-notice${q}`}>{t.legal}</Link></li>
              <li><Link href={`/privacy${q}`}>{t.privacy}</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The AI Certification{company.name && ` · ${company.name}`}</span>
          <Link href="/">{t.about}</Link>
        </div>
      </div>
    </footer>
  );
}

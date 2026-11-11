import Link from 'next/link';
import { dict } from '@/lib/i18n';
import { registerPath, type Locale } from '@/lib/locales';

type Props = {
  locale: Locale;
  price: string;
  fullPrice: string;
  funding: string;
  taxLabel: string;
  status: 'open' | 'closed' | 'full' | null;
  closesOn: string | null; // formatted date, only when registration is open
};

export default function PriceCard({ locale, price, fullPrice, funding, taxLabel, status, closesOn }: Props) {
  const t = dict(locale).price;
  const open = status === 'open';
  return (
    <aside className="pass" id="reserve" aria-labelledby="reserve-title">
      <h2 id="reserve-title" className="pass-label">{t.label}</h2>
      <p className="pass-price">
        <span className="pass-amount">{price}</span>
        <span className="pass-unit">{t.oneTime}</span>
      </p>
      <p className="pass-note">{taxLabel}</p>

      <dl className="pass-breakdown">
        <div><dt>{t.programPrice}</dt><dd>{fullPrice}</dd></div>
        <div><dt>{t.funded}</dt><dd className="pass-funded">− {funding}</dd></div>
        <div className="pass-total"><dt>{t.youPay}</dt><dd>{price}</dd></div>
      </dl>

      <ul className="pass-perks">
        {t.included.map((item) => <li key={item}>{item}</li>)}
      </ul>

      <dl className="pass-dates">
        {open && closesOn && (
          <div><dt>{t.closes}</dt><dd>{closesOn}</dd></div>
        )}
      </dl>

      {!open && <p className="pass-closed">{status === 'full' ? t.full : t.closed}</p>}

      <Link className="btn btn-green pass-cta" href={registerPath(locale)}>
        {open ? t.ctaOpen : status === 'full' ? t.ctaFull : t.ctaClosed}
      </Link>

      <p className="pass-trust">{t.trust}</p>
    </aside>
  );
}

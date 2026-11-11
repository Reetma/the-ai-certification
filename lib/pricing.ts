import { company } from './company';
import { LOCALES, type Currency, type Locale } from './locales';

// Prices in cents per currency. The student pays `price`; `full` is the program price,
// the difference is funded by The AI Certification.
const PRICES: Record<Currency, { price: number; full: number }> = {
  USD: { price: Number(process.env.PRICE_USD_CENTS ?? 3000), full: Number(process.env.FULL_PRICE_USD_CENTS ?? 43000) },
  EUR: { price: Number(process.env.PRICE_EUR_CENTS ?? 3000), full: Number(process.env.FULL_PRICE_EUR_CENTS ?? 43000) },
};

export type Pricing = {
  currency: Currency;
  priceCents: number;
  corporateCents: number;
  fundingCents: number;
  vatExempt: boolean; // picks the tax wording in each language
};

export function pricingFor(locale: Locale): Pricing {
  const currency = LOCALES[locale].currency;
  const { price, full } = PRICES[currency];
  return { currency, priceCents: price, corporateCents: full, fundingCents: full - price, vatExempt: company.vatExempt };
}

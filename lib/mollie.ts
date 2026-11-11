import 'server-only';
import { setting } from './settings';

// MOLLIE_API_BASE lets local end-to-end tests run against a stand-in server; production always talks to Mollie.
const API = (process.env.NODE_ENV !== 'production' && process.env.MOLLIE_API_BASE) || 'https://api.mollie.com/v2';

export type MolliePayment = {
  id: string;
  status: 'open' | 'pending' | 'authorized' | 'paid' | 'canceled' | 'expired' | 'failed';
  paidAt?: string;
  metadata?: { registration_id?: string };
  _links: { checkout?: { href: string } };
};

export class MollieError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** An API key from Mollie → Developers → API keys (not the organisation token or the profile ID). */
export const MOLLIE_KEY_RE = /^(test|live)_[A-Za-z0-9]{20,}$/;

export type MollieCheck =
  | { ok: true; mode: 'test' | 'live'; methods: Record<string, string[]> }
  | { ok: false; detail: string };

/** Checks a key with Mollie itself, and which payment methods it can offer in each currency the site sells in. */
export async function checkMollieKey(apiKey: string): Promise<MollieCheck> {
  if (!MOLLIE_KEY_RE.test(apiKey)) {
    return { ok: false, detail: 'This is not a Mollie API key. It starts with test_ or live_ (Mollie → Developers → API keys); it is neither the profile ID (pfl_…) nor an organisation token.' };
  }
  const methods: Record<string, string[]> = {};
  for (const currency of ['EUR', 'USD']) {
    const res = await fetch(`${API}/methods?amount[value]=30.00&amount[currency]=${currency}`, {
      headers: { authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    }).catch(() => null);
    if (!res) return { ok: false, detail: 'Mollie does not answer. Try again in a moment.' };
    if (res.status === 401) return { ok: false, detail: 'Mollie refuses this key: check it is complete and still active.' };
    if (!res.ok) return { ok: false, detail: `Mollie answered with an error (${res.status}). Try again in a moment.` };
    const data = await res.json();
    methods[currency] = (data?._embedded?.methods ?? []).map((m: { description: string }) => m.description);
  }
  return { ok: true, mode: apiKey.startsWith('live_') ? 'live' : 'test', methods };
}

export function describeMollieCheck(check: MollieCheck) {
  if (!check.ok) return check.detail;
  const mode = check.mode === 'live'
    ? 'Live mode: buyers really pay.'
    : 'Test mode: no money is taken, use Mollie’s test cards.';
  const lines = Object.entries(check.methods).map(([currency, list]) =>
    list.length ? `${currency} : ${list.join(', ')}` : `⚠ no payment method in ${currency}, turn on cards in Mollie → Settings → Payment methods`,
  );
  return `Valid key. ${mode} Payment methods on (${lines.join(' · ')}).`;
}

/** "test", "live" or null: read from the saved key, no network call. */
export async function mollieMode() {
  const key = await setting('MOLLIE_API_KEY');
  return key ? (key.startsWith('live_') ? 'live' : 'test') : null;
}

export async function mollieEnabled() {
  return Boolean(await setting('MOLLIE_API_KEY'));
}

/** The mock payment page only exists in development without a Mollie key. */
export async function mockPaymentsEnabled() {
  return process.env.NODE_ENV !== 'production' && !(await mollieEnabled());
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await setting('MOLLIE_API_KEY')}`,
      'content-type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new MollieError(res.status, `Mollie ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function createPayment(input: {
  amountCents: number;
  currency: string;
  description: string;
  redirectUrl: string;
  webhookUrl?: string;
  registrationId: string;
  locale?: string;
}) {
  const payment = await call<MolliePayment>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      amount: { currency: input.currency, value: (input.amountCents / 100).toFixed(2) },
      description: input.description,
      redirectUrl: input.redirectUrl,
      // Mollie cannot reach localhost, so the webhook is only sent for public URLs.
      ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
      metadata: { registration_id: input.registrationId },
      // The Mollie page in the buyer's language (fr_FR, de_DE…); Mollie picks one itself if absent.
      ...(input.locale ? { locale: input.locale } : {}),
    }),
  });

  const href = payment._links.checkout?.href;
  // Only ever send students to a Mollie-hosted page.
  if (!href || !isMollieUrl(href)) {
    throw new Error(`Refusing non-Mollie checkout URL: ${href}`);
  }
  return { id: payment.id, checkoutUrl: href };
}

export function getPayment(id: string) {
  return call<MolliePayment>(`/payments/${encodeURIComponent(id)}`);
}

export function isMollieUrl(href: string) {
  try {
    const { protocol, hostname } = new URL(href);
    return protocol === 'https:' && (hostname === 'mollie.com' || hostname.endsWith('.mollie.com'));
  } catch {
    return false;
  }
}

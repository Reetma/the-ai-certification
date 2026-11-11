import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { sql } from './db';

// Settings the admin manages from /admin (API keys and the sender address), so the site runs without touching
// the code or the hosting. Stored encrypted in the database; a value set in the environment is the fallback.

export const SETTINGS = {
  MOLLIE_API_KEY: { label: 'Mollie API key', help: 'Payments. Mollie → Developers → API keys: the live_… key (test_… to try without paying).', secret: true },
  RESEND_API_KEY: { label: 'Resend API key', help: 'Sends the emails. Resend → API Keys (a “Sending access” key is enough).', secret: true },
  EMAIL_FROM: { label: 'Email sender', help: 'For example: The AI Certification <noreply@your-domain.com>. The domain must be verified in Resend.', secret: false },
  ANTHROPIC_API_KEY: { label: 'Claude API key (chatbot)', help: 'console.anthropic.com → API Keys. Empty = the chatbot is hidden.', secret: true },
} as const;

export type SettingKey = keyof typeof SETTINGS;
const KEYS = Object.keys(SETTINGS) as SettingKey[];

// Encryption key: SETTINGS_KEY in the hosting environment (set once), so a database dump alone reveals nothing.
const cryptoKey = () => createHash('sha256').update(process.env.SETTINGS_KEY ?? process.env.ADMIN_PASSWORD_HASH ?? 'theaicert-local').digest();

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cryptoKey(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

function decrypt(stored: string): string | null {
  try {
    const [iv, tag, data] = stored.split('.').map((s) => Buffer.from(s, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', cryptoKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// Read on most requests, so kept in memory for a short while (a save clears it at once on this server).
let cache: { at: number; values: Partial<Record<SettingKey, string>> } | null = null;
const TTL_MS = 30_000;

async function stored(): Promise<Partial<Record<SettingKey, string>>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values;
  const rows = await sql('select key, value from settings');
  const values: Partial<Record<SettingKey, string>> = {};
  for (const r of rows) {
    if (!KEYS.includes(r.key)) continue;
    const v = decrypt(String(r.value));
    if (v) values[r.key as SettingKey] = v;
  }
  cache = { at: Date.now(), values };
  return values;
}

/** The value set from the admin console, else the environment variable of the same name. */
export async function setting(key: SettingKey): Promise<string | undefined> {
  return (await stored())[key] || process.env[key]?.trim() || undefined;
}

export async function saveSetting(key: SettingKey, value: string) {
  const clean = value.trim();
  if (clean) {
    await sql(
      `insert into settings (key, value, updated_at) values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [key, encrypt(clean)],
    );
  } else {
    await sql('delete from settings where key = $1', [key]);
  }
  cache = null;
}

/** For the admin screen: where each value comes from, shown masked. */
export async function settingsOverview() {
  const values = await stored();
  return KEYS.map((key) => {
    const fromDb = values[key];
    const value = fromDb || process.env[key]?.trim() || '';
    const masked = !value ? '' : SETTINGS[key].secret ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
    return { key, ...SETTINGS[key], masked, source: fromDb ? 'admin' : value ? 'host' : null };
  });
}

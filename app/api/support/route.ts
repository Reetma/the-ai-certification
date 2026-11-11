import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/tickets';

export const dynamic = 'force-dynamic';

const hits = new Map<string, number[]>();
function rateLimited(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) return NextResponse.json({ result: 'rate_limited' });
  // Honeypot: a field people never see, filled only by bots.
  if (body?.website) return NextResponse.json({ result: 'ok', reference: '' });
  const result = await createTicket({
    name: String(body?.name ?? ''),
    email: String(body?.email ?? ''),
    category: String(body?.category ?? ''),
    registration_ref: String(body?.registration_ref ?? ''),
    message: String(body?.message ?? ''),
    locale: String(body?.locale ?? ''),
  });
  return NextResponse.json(result.ok ? { result: 'ok', reference: result.reference } : { result: result.error });
}

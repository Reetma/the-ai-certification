import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { chatInstructions, chatToday } from '@/lib/chat';
import { setting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// The site assistant (the chat bubble). Streams the answer as plain text.

const MAX_TURNS = 20;
const MAX_CHARS = 1500;

const hits = new Map<string, number[]>();
function rateLimited(ip: string, limit = 30, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}

export async function POST(req: NextRequest) {
  const apiKey = await setting('ANTHROPIC_API_KEY');
  if (!apiKey) return NextResponse.json({ error: 'disabled' }, { status: 503 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const raw: unknown[] = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const messages: Anthropic.Beta.BetaMessageParam[] = raw
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      !!m && typeof m === 'object' && ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') && typeof (m as { content?: unknown }).content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  // The conversation must start with the visitor and end with their new message.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return NextResponse.json({ error: 'empty' }, { status: 400 });

  const client = new Anthropic({ apiKey });
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5',
    // Short chat answers; also caps the cost of a public endpoint.
    max_tokens: 4096,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: chatInstructions(), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: await chatToday() },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') controller.enqueue(encoder.encode(event.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') controller.enqueue(encoder.encode('\n\n[Je ne peux pas répondre à cette question.]'));
      } catch (error) {
        console.error('[chat]', error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
        controller.enqueue(encoder.encode('\n\n[…]'));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

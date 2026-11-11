// Browser helper for the /api/school endpoint.
export async function api<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch('/api/school', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

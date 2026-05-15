function decodeBase64Url(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (padded.length % 4)) % 4);
  return atob(padded + padding);
}

export function requireServiceRole(req: Request): Response | null {
  const auth = req.headers.get('authorization') ?? '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return new Response(JSON.stringify({ error: 'missing bearer' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const parts = match[1].split('.');
  if (parts.length !== 3) {
    return new Response(JSON.stringify({ error: 'malformed token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  try {
    const claims = JSON.parse(decodeBase64Url(parts[1])) as { role?: string };
    if (claims.role !== 'service_role') {
      return new Response(
        JSON.stringify({ error: 'service-role required' }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      );
    }
    return null;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
}

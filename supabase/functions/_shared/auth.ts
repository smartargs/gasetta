// Defense-in-depth role check for ingest/summarize.
//
// `verify_jwt = true` on the function only validates the JWT signature, not
// the role. A logged-in user's `authenticated`-role JWT (which anyone can
// obtain by signing up via /auth/v1/signup) would otherwise pass and trigger
// the function — costing us GitHub API quota and OpenAI tokens.
//
// Both ingest and summarize are admin/cron-only. They should only run when
// invoked with a service-role JWT. We don't need to re-verify the signature
// here — the gateway already did that — we just decode the payload and
// inspect the `role` claim.

function decodeBase64Url(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (padded.length % 4)) % 4);
  return atob(padded + padding);
}

/**
 * Returns null if the caller is service-role; otherwise returns a Response
 * the caller should return immediately (401 or 403). Designed to be the
 * first line of the function handler.
 */
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

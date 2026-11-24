// Runs on the server whenever a page or API route throws. The error is saved
// so the morning email can tell Rob about it before a golfer has to.
// Plain fetch (no client library) so it works in every server runtime, and it
// never throws: logging an error must not cause another one.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string },
) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    const e = err as { message?: string; digest?: string; stack?: string }
    const message = String(e?.message ?? err).slice(0, 500)
    if (/NEXT_REDIRECT|NEXT_NOT_FOUND/.test(message)) return
    await fetch(`${url}/rest/v1/error_log`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        message,
        route: String(context?.routePath ?? '').slice(0, 200),
        // Path only: query strings can carry tokens and are never stored
        path: String(request?.path ?? '').split('?')[0].slice(0, 200),
        method: String(request?.method ?? '').slice(0, 10),
        kind: String(context?.routeType ?? '').slice(0, 20),
        stack: String(e?.stack ?? '').split('\n').slice(0, 6).join('\n').slice(0, 1200),
      }),
    })
  } catch {
    // ignore
  }
}

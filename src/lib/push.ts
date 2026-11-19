import http2 from 'http2'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Push notifications to the iPhone app through Apple (APNs).
 * Needs APNS_KEY (the .p8 key text), APNS_KEY_ID and APNS_TEAM_ID in the
 * environment; without them every send is skipped quietly, so the site works
 * the same before the Apple account is ready. Android (Firebase) comes later.
 */

const BUNDLE_ID = 'com.tmstatsgolf.app'
let cachedJwt: { token: string; at: number } | null = null

function apnsJwt(): string | null {
  const key = process.env.APNS_KEY?.replace(/\\n/g, '\n')
  const kid = process.env.APNS_KEY_ID
  const iss = process.env.APNS_TEAM_ID
  if (!key || !kid || !iss) return null
  // Apple wants a fresh token at most hourly and at least every 20 minutes apart
  if (cachedJwt && Date.now() - cachedJwt.at < 45 * 60 * 1000) return cachedJwt.token
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64({ alg: 'ES256', kid })}.${b64({ iss, iat: Math.floor(Date.now() / 1000) })}`
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  cachedJwt = { token: `${unsigned}.${sig}`, at: Date.now() }
  return cachedJwt.token
}

export interface PushMessage {
  title: string
  body: string
  url?: string        // page to open when tapped, e.g. /qualifying/abc
}

/** Send one notification to one iPhone. Returns 'ok', 'gone' (token dead) or 'failed'. */
function sendApns(host: string, jwt: string, token: string, msg: PushMessage): Promise<'ok' | 'gone' | 'failed'> {
  return new Promise(resolve => {
    let client: http2.ClientHttp2Session
    try { client = http2.connect(`https://${host}`) } catch { resolve('failed'); return }
    client.on('error', () => resolve('failed'))
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    })
    let status = 0
    let body = ''
    req.on('response', h => { status = Number(h[':status']) })
    req.on('data', d => { body += d })
    req.on('end', () => {
      client.close()
      if (status === 200) resolve('ok')
      else if (status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(body)) resolve('gone')
      else resolve('failed')
    })
    req.on('error', () => { client.close(); resolve('failed') })
    req.setTimeout(10000, () => { req.close(); client.close(); resolve('failed') })
    req.end(JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: 'default' }, url: msg.url ?? '/dashboard' }))
  })
}

/** Notify everyone in `userIds` on every phone they have allowed notifications on. Never throws. */
export async function pushToUsers(userIds: string[], msg: PushMessage): Promise<number> {
  try {
    const jwt = apnsJwt()
    if (!jwt || userIds.length === 0) return 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data: rows } = await service.from('push_tokens').select('id, token, platform').in('user_id', [...new Set(userIds)])
    let sent = 0
    for (const row of (rows ?? []) as { id: string; token: string; platform: string }[]) {
      if (row.platform !== 'ios') continue
      // Store builds use production; builds run from Xcode use the sandbox
      let result = await sendApns('api.push.apple.com', jwt, row.token, msg)
      if (result === 'gone') result = await sendApns('api.sandbox.push.apple.com', jwt, row.token, msg)
      if (result === 'ok') sent++
      else if (result === 'gone') await service.from('push_tokens').delete().eq('id', row.id)
    }
    return sent
  } catch {
    return 0
  }
}

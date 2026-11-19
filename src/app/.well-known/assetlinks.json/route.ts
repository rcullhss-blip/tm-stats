import { NextResponse } from 'next/server'

// Digital Asset Links: tells Android that the TM Stats app in Google Play and
// this website belong together, so the app opens the site full screen with no
// browser bar. The signing fingerprints come from the environment so they can
// be added (upload key, then Google's app signing key) without a code change.
export const dynamic = 'force-dynamic'

export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME || 'com.tmstatsgolf.app'
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS || '')
    .split(',').map(s => s.trim().toUpperCase()).filter(s => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s))
  const body = fingerprints.length === 0 ? [] : [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: fingerprints },
  }]
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}

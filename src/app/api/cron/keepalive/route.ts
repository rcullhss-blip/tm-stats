import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
  // Verify this is being called by Vercel cron (not a random person)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    // Simple lightweight query — just counts users, keeps Supabase active
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({ ok: true, userCount: count, ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

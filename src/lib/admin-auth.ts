import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  const ok = profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  return ok ? user : null
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

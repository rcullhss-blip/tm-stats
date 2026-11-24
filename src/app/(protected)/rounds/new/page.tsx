export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewRoundClient from './NewRoundClient'
import { hasPro, hasElite } from '@/lib/plan'
import { isAdminEmail } from '@/lib/admin-email'

export default async function NewRoundPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, email')
    .eq('id', user.id)
    .single()

  const isPro = hasPro(profile?.subscription_status)

  let freeRoundsLeft: number | null = null
  if (!isPro) {
    const { count } = await supabase
      .from('rounds')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    freeRoundsLeft = Math.max(0, 5 - (count ?? 0))
    if ((count ?? 0) >= 5) {
      redirect('/upgrade?reason=round_limit')
    }
  }

  // Course memory — recently played courses for one-tap setup + par prefill
  const { data: recentRounds } = await supabase
    .from('rounds')
    .select('id, course_name, holes')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  const seen = new Set<string>()
  const recentCourses: { name: string; holes: number; lastRoundId: string }[] = []
  for (const r of recentRounds ?? []) {
    const key = r.course_name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    recentCourses.push({ name: r.course_name, holes: r.holes, lastRoundId: r.id })
    if (recentCourses.length >= 5) break
  }

  // Voice entry costs money per recording, so it is switched on for the admin
  // account only while it is being tested.
  const voiceEnabled = isAdminEmail(user.email)

  // Elite: advanced shot tracking (where each shot finished)
  const advancedEnabled = hasElite(profile?.subscription_status)

  return <NewRoundClient recentCourses={recentCourses} voiceEnabled={voiceEnabled} advancedEnabled={advancedEnabled} freeRoundsLeft={freeRoundsLeft} />
}

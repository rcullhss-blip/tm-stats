'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeSkillLevel, type SkillLevel } from '@/lib/sg-engine'
import { tidyPlace } from '@/lib/leaderboards'
import { validateGoal, type GoalMetric } from '@/lib/goal'
import { makeSlug, parseProfileInfo } from '@/lib/recruit-profile'

export async function saveProfile(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim() || null
  const handicapRaw = formData.get('handicap') as string
  const handicap = handicapRaw !== '' ? parseFloat(handicapRaw) : null
  const feedbackLevel = formData.get('feedback_level') as string
  const coachPersona = formData.get('coach_persona') as string
  const playerContext = (formData.get('player_context') as string)?.trim() || null

  // Get current handicap before updating so we can log changes
  const { data: currentProfile } = await supabase
    .from('users')
    .select('handicap')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('users')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ name, handicap, feedback_level: feedbackLevel as 'simple' | 'intermediate' | 'advanced', coach_persona: coachPersona, player_context: playerContext } as any)
    .eq('id', user.id)

  if (error) return { error: error.message }

  // Log handicap to history if it changed (silently ignore if table doesn't exist yet)
  if (handicap !== null && handicap !== currentProfile?.handicap) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('handicap_history').insert({
        user_id: user.id,
        handicap,
        date: new Date().toISOString().split('T')[0],
      })
    } catch {
      // Table may not exist yet — ignore
    }
  }

  revalidatePath('/profile')
  revalidatePath('/stats')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function saveSGBaseline(level: SkillLevel | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Only ever store a level the engine knows
  const clean = level === null ? null : normalizeSkillLevel(level)
  if (level !== null && !clean) return

  await supabase
    .from('users')
    .update({ sg_baseline: clean })
    .eq('id', user.id)

  revalidatePath('/profile')
  revalidatePath('/stats')
}

export async function saveLeaderboardSettings(input: { country: string; region: string; optIn: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const country = tidyPlace(input.country)
  const region = tidyPlace(input.region)
  // No country, no boards to be on
  if (input.optIn && !country) return { error: 'Pick your country to go on the leaderboards' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('users')
    .update({ country, region, leaderboard_opt_in: input.optIn === true })
    .eq('id', user.id)
  if (error) return { error: 'Could not save. Try again.' }

  revalidatePath('/profile')
  revalidatePath('/leaderboards')
  return { error: null }
}

export async function saveGoal(input: { metric: GoalMetric; target: number; by: string; start: number | null } | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const today = new Date().toISOString().slice(0, 10)
  let goal: Record<string, unknown> | null = null
  if (input) {
    const problem = validateGoal(input, today)
    if (problem) return { error: problem }
    goal = {
      metric: input.metric,
      target: input.target,
      by: input.by,
      start: typeof input.start === 'number' && Number.isFinite(input.start) ? Math.round(input.start * 10) / 10 : null,
      setAt: today,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('users').update({ sg_goal: goal }).eq('id', user.id)
  if (error) return { error: 'Could not save. Try again.' }
  revalidatePath('/stats')
  return { error: null }
}

export async function saveRecruitingProfile(input: { isPublic: boolean; gradYear: number | null; homeClub: string; bio: string; contact: string; showPractice?: boolean; hiddenRounds?: string[] }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in', slug: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: me } = await sb.from('users').select('name, profile_slug').eq('id', user.id).single()
  if (input.isPublic && !me?.name?.trim()) return { error: 'Add your name in Settings first, so the profile has a name on it', slug: null }

  const info = parseProfileInfo({ gradYear: input.gradYear, homeClub: input.homeClub, bio: input.bio, contact: input.contact, showPractice: input.showPractice, hiddenRounds: input.hiddenRounds })

  // The address is made once, the first time the profile is switched on, and
  // then never changes, so a link already sent to a coach keeps working.
  let slug: string | null = me?.profile_slug ?? null
  if (input.isPublic && !slug) {
    for (let attempt = 0; attempt < 5 && !slug; attempt++) {
      const candidate = makeSlug(me?.name)
      const { error } = await sb.from('users').update({ profile_slug: candidate }).eq('id', user.id)
      if (!error) slug = candidate
    }
    if (!slug) return { error: 'Could not create your link. Try again.', slug: null }
  }

  const { error } = await sb.from('users').update({ profile_public: input.isPublic === true, profile_info: info }).eq('id', user.id)
  if (error) return { error: 'Could not save. Try again.', slug: null }

  revalidatePath('/profile')
  return { error: null, slug }
}

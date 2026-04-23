'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SkillLevel } from '@/lib/sg-engine'

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

  await supabase
    .from('users')
    .update({ sg_baseline: level })
    .eq('id', user.id)

  revalidatePath('/profile')
  revalidatePath('/stats')
}

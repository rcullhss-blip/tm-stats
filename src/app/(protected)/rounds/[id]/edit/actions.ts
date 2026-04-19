'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveRoundEdits(roundId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership
  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('id', roundId)
    .eq('user_id', user.id)
    .single()
  if (!round) return { error: 'Round not found' }

  // Update round header
  const date = formData.get('date') as string
  const courseName = (formData.get('course_name') as string).trim()
  const roundType = formData.get('round_type') as string
  const notes = (formData.get('notes') as string).trim() || null
  const mood = (formData.get('mood') as string) || null
  const energyLevel = (formData.get('energy_level') as string) || null

  await supabase
    .from('rounds')
    .update({
      date,
      course_name: courseName,
      round_type: roundType as 'practice' | 'competition' | 'tournament',
      notes,
      mood: mood as 'tough' | 'average' | 'good' | 'great' | null,
      energy_level: energyLevel as 'fresh' | 'normal' | 'tired' | 'niggly' | null,
    })
    .eq('id', roundId)

  // Update each hole
  const { data: holes } = await supabase
    .from('holes')
    .select('id, hole_number')
    .eq('round_id', roundId)

  if (holes) {
    for (const hole of holes) {
      const n = hole.hole_number
      const par = parseInt(formData.get(`hole_${n}_par`) as string) as 3 | 4 | 5
      const score = parseInt(formData.get(`hole_${n}_score`) as string)
      const firRaw = formData.get(`hole_${n}_fir`) as string
      const girRaw = formData.get(`hole_${n}_gir`) as string
      const putts = parseInt(formData.get(`hole_${n}_putts`) as string)
      const udRaw = formData.get(`hole_${n}_ud`) as string
      const ssRaw = formData.get(`hole_${n}_ss`) as string

      const fir = par === 3 ? null : firRaw === 'true' ? true : firRaw === 'false' ? false : null
      const gir = girRaw === 'true' ? true : girRaw === 'false' ? false : null
      const upAndDown = udRaw === 'true' ? true : udRaw === 'false' ? false : null
      const sandSave = ssRaw === 'true' ? true : ssRaw === 'false' ? false : null

      await supabase
        .from('holes')
        .update({ par, score, fir, gir, putts: isNaN(putts) ? null : putts, up_and_down: upAndDown, sand_save: sandSave })
        .eq('id', hole.id)
    }

    // Recalculate totals
    const { data: updatedHoles } = await supabase
      .from('holes')
      .select('par, score')
      .eq('round_id', roundId)

    if (updatedHoles) {
      const parTotal = updatedHoles.reduce((s, h) => s + h.par, 0)
      const scoreTotal = updatedHoles.reduce((s, h) => s + h.score, 0)
      await supabase
        .from('rounds')
        .update({ par_total: parTotal, score_total: scoreTotal })
        .eq('id', roundId)
    }
  }

  revalidatePath(`/rounds/${roundId}`)
  revalidatePath('/rounds')
  revalidatePath('/dashboard')
  redirect(`/rounds/${roundId}`)
}

export async function deleteRound(roundId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Delete holes first, then round
  await supabase.from('holes').delete().eq('round_id', roundId)
  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/rounds')
  revalidatePath('/dashboard')
  redirect('/rounds')
}

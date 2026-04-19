'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const handicap = formData.get('handicap') as string

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  if (!data.session) {
    return redirect('/signup?error=Check+your+email+to+confirm+your+account')
  }

  // Create user profile
  if (data.user) {
    await supabase.from('users').upsert({
      id: data.user.id,
      email,
      name: name || null,
      handicap: handicap ? parseFloat(handicap) : null,
      subscription_status: 'free',
    }, { onConflict: 'id' })
  }

  redirect('/dashboard')
}

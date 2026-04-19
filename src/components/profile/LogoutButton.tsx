'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full py-4 rounded-xl font-semibold text-sm transition-opacity"
      style={{
        backgroundColor: '#1A1D27',
        color: '#EF4444',
        border: '1px solid #2E3247',
        minHeight: '56px',
      }}
    >
      Log out
    </button>
  )
}

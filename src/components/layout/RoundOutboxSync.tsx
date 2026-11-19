'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { flushOutbox, readOutbox } from '@/lib/round-outbox'

/** Uploads rounds saved with no signal, as soon as there is signal again. Shows a small note while any wait. */
export default function RoundOutboxSync() {
  const router = useRouter()
  const [waiting, setWaiting] = useState(0)

  useEffect(() => {
    let alive = true
    async function go() {
      setWaiting(readOutbox().length)
      if (readOutbox().length === 0) return
      const n = await flushOutbox()
      if (!alive) return
      setWaiting(readOutbox().length)
      if (n > 0) router.refresh()
    }
    go()
    const timer = setInterval(go, 30000)
    window.addEventListener('online', go)
    document.addEventListener('visibilitychange', go)
    return () => { alive = false; clearInterval(timer); window.removeEventListener('online', go); document.removeEventListener('visibilitychange', go) }
  }, [router])

  if (waiting === 0) return null
  return (
    <div className="px-4 pt-3 max-w-lg mx-auto">
      <div className="px-4 py-2 rounded-xl text-xs" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B40', color: '#F59E0B' }}>
        {waiting === 1 ? '1 round is' : `${waiting} rounds are`} saved on this phone and will upload by itself when you have signal.
      </div>
    </div>
  )
}

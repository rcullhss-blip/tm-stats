'use client'

import { useState, useTransition } from 'react'
import { deleteRound } from '@/app/(protected)/rounds/[id]/edit/actions'

export default function DeleteRoundButton({ roundId, courseName }: { roundId: string; courseName: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => { await deleteRound(roundId) })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="w-full py-3 rounded-xl text-sm font-medium"
        style={{ backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF444430' }}
      >
        Delete round
      </button>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base font-semibold mb-1 text-center" style={{ color: '#F0F0F0' }}>
              Delete this round?
            </p>
            <p className="text-sm text-center mb-6" style={{ color: '#9A9DB0' }}>
              {courseName} — this cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#EF4444', color: '#F0F0F0', opacity: pending ? 0.7 : 1 }}
              >
                {pending ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

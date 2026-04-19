'use client'

import { useTransition } from 'react'
import { SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import { saveSGBaseline } from '@/app/(protected)/profile/actions'

interface Props {
  currentLevel: SkillLevel
  savedBaseline: string | null
  handicap: number | null
}

const ALL_LEVELS: SkillLevel[] = ['tour', 'scratch', 'low', 'mid', 'high', 'beginner']

export default function SGBaselinePicker({ currentLevel, savedBaseline, handicap }: Props) {
  const [pending, startTransition] = useTransition()

  const availableLevels: SkillLevel[] = ALL_LEVELS

  function handleSelect(level: SkillLevel) {
    const newBaseline = level === savedBaseline ? null : level
    startTransition(() => saveSGBaseline(newBaseline))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: '#9A9DB0' }}>SG comparison baseline</p>
        {savedBaseline && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => saveSGBaseline(null))}
            className="text-xs"
            style={{ color: '#9A9DB0' }}
          >
            Reset to auto
          </button>
        )}
      </div>
      <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
        {savedBaseline
          ? `Manually set to ${SKILL_LEVEL_LABELS[savedBaseline as SkillLevel] ?? savedBaseline}`
          : `Auto: ${SKILL_LEVEL_LABELS[currentLevel]} (from your handicap)`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {availableLevels.map(level => {
          const isActive = savedBaseline ? level === savedBaseline : level === currentLevel
          const isTour = level === 'tour'
          return (
            <button
              key={level}
              type="button"
              disabled={pending}
              onClick={() => handleSelect(level)}
              className="px-3 py-2.5 rounded-xl text-sm font-medium text-left"
              style={{
                backgroundColor: isActive
                  ? isTour ? '#22C55E20' : '#CC222220'
                  : '#22263A',
                color: isActive
                  ? isTour ? '#22C55E' : '#CC2222'
                  : '#9A9DB0',
                border: `1px solid ${isActive
                  ? isTour ? '#22C55E60' : '#CC222260'
                  : '#2E3247'}`,
                opacity: pending ? 0.5 : 1,
              }}
            >
              {isTour && (
                <span className="block text-xs mb-0.5" style={{ color: isActive ? '#22C55E' : '#4A4D60' }}>
                  Elite / Tour
                </span>
              )}
              {SKILL_LEVEL_LABELS[level]}
            </button>
          )
        })}
      </div>
      {!savedBaseline && (
        <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>
          Tap a level to override. Tap again to go back to auto.
        </p>
      )}
    </div>
  )
}

'use client'

import { useActionState } from 'react'
import { saveProfile } from '@/app/(protected)/profile/actions'

const COACH_OPTIONS = [
  { value: 'club_pro', label: 'Club Pro', desc: 'Friendly, practical — general game improvement' },
  { value: 'fundamentals', label: 'Fundamentals Coach', desc: 'Direct, basics-first — core technique' },
  { value: 'technical', label: 'Technical Analyst', desc: 'Detailed, cause → effect — deep mechanics' },
  { value: 'short_game', label: 'Short Game Specialist', desc: 'Inside 100 yards — scoring zone focus' },
  { value: 'ball_flight', label: 'Ball Flight Coach', desc: 'Start line, face angle, path, dispersion' },
  { value: 'encourager', label: 'Encourager', desc: 'Positive framing, confidence-led — mindset' },
  { value: 'straight_talker', label: 'Straight Talker', desc: 'Blunt, direct — accountability only' },
]

const FEEDBACK_OPTIONS = [
  { value: 'simple', label: 'Simple', desc: 'Plain English, key points only' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Stats + actionable tips' },
  { value: 'advanced', label: 'Advanced', desc: 'Deep analysis, detailed' },
]

interface Props {
  name: string | null
  handicap: number | null
  feedbackLevel: string
  coachPersona: string
  playerContext: string | null
}

export default function ProfileEditForm({ name, handicap, feedbackLevel, coachPersona, playerContext }: Props) {
  const [state, action, pending] = useActionState(saveProfile, null)

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#22C55E20', color: '#22C55E' }}>
          Profile saved
        </p>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={name ?? ''}
          placeholder="Your name"
          className="w-full px-4 py-3 rounded-xl outline-none text-base"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', color: '#F0F0F0' }}
        />
      </div>

      {/* Handicap */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Handicap</label>
        <input
          type="number"
          name="handicap"
          defaultValue={handicap ?? ''}
          placeholder="e.g. 14.2"
          step="0.1"
          min="-10"
          max="54"
          className="w-full px-4 py-3 rounded-xl outline-none text-base"
          style={{
            backgroundColor: '#1A1D27',
            border: '1px solid #2E3247',
            color: '#F0F0F0',
            fontFamily: 'var(--font-dm-mono)',
          }}
        />
        <p className="text-xs mt-1" style={{ color: '#4A4D60' }}>Sets your SG comparison baseline automatically</p>
      </div>

      {/* Feedback level */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>AI feedback depth</label>
        <div className="space-y-2">
          {FEEDBACK_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
              style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
            >
              <input
                type="radio"
                name="feedback_level"
                value={opt.value}
                defaultChecked={feedbackLevel === opt.value}
                className="accent-red-600"
                style={{ width: '18px', height: '18px', flexShrink: 0 }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: '#F0F0F0' }}>{opt.label}</p>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Coach persona */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#9A9DB0' }}>Coaching mode</label>
        <p className="text-xs mb-3" style={{ color: '#4A4D60' }}>Elite-level coaching perspectives, adapted to your stats</p>
        <div className="space-y-2">
          {COACH_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
              style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
            >
              <input
                type="radio"
                name="coach_persona"
                value={opt.value}
                defaultChecked={coachPersona === opt.value}
                className="accent-red-600"
                style={{ width: '18px', height: '18px', flexShrink: 0 }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: '#F0F0F0' }}>{opt.label}</p>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Player context */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#9A9DB0' }}>Your game context</label>
        <p className="text-xs mb-2" style={{ color: '#4A4D60' }}>Tell your AI coach about your game — what you&apos;re working on, tendencies, anything relevant. This personalises every coaching response.</p>
        <textarea
          name="player_context"
          defaultValue={playerContext ?? ''}
          rows={4}
          placeholder="e.g. I'm working on keeping my trail elbow tucked on the downswing. I tend to get quick when under pressure. Playing off 14, aiming to get to 10 by end of season."
          className="w-full px-4 py-3 rounded-xl outline-none text-sm"
          style={{
            backgroundColor: '#1A1D27',
            border: '1px solid #2E3247',
            color: '#F0F0F0',
            resize: 'vertical',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-4 rounded-xl font-semibold text-base"
        style={{
          backgroundColor: pending ? '#7a1414' : '#CC2222',
          color: '#F0F0F0',
          minHeight: '56px',
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

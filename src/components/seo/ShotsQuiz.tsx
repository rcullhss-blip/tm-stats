'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BANDS } from '@/lib/seo-stats'
import {
  FAIRWAY_OPTIONS, GREEN_OPTIONS, PUTT_OPTIONS, UP_DOWN_OPTIONS, AREA_ADVICE, LEVEL_MARGIN,
  plainLabel, scoreQuiz, type QuizAnswers, type QuizOption,
} from '@/lib/quiz'

// Public "where are you losing shots?" quiz. One question per screen, one tap
// each, and the answer appears straight away. No account, nothing saved.

type Key = keyof QuizAnswers

const STEPS: { key: Key; question: string; help: string; options: { label: string; value: string | number }[] }[] = [
  {
    key: 'band',
    question: 'What is your handicap?',
    help: 'This picks who you are compared with.',
    options: BANDS.map(b => ({ label: b.slug === 'scratch' ? 'Scratch or better' : plainLabel(b.range), value: b.slug })),
  },
  {
    key: 'fairways',
    question: 'How many fairways do you hit in a normal round?',
    help: 'Out of the 14 holes where you hit a tee shot on a par 4 or 5.',
    options: FAIRWAY_OPTIONS,
  },
  {
    key: 'greens',
    question: 'How many greens do you hit in regulation?',
    help: 'On the green with two putts left for par. Out of 18.',
    options: GREEN_OPTIONS,
  },
  {
    key: 'putts',
    question: 'How many putts do you take in a round?',
    help: 'For 18 holes. A rough number is fine.',
    options: PUTT_OPTIONS,
  },
  {
    key: 'upDown',
    question: 'When you miss a green, how often do you get up and down?',
    help: 'A chip and one putt. Think of your last 10 missed greens.',
    options: UP_DOWN_OPTIONS.map((o: QuizOption) => ({ label: `${o.label} in 10`, value: o.value })),
  },
]

const card = { backgroundColor: '#1A1D27', border: '1px solid #2E3247' } as const
const mono = { fontFamily: 'var(--font-dm-mono)' } as const
const heading = { fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' } as const

function shotsText(n: number): string {
  const abs = Math.abs(n).toFixed(1).replace(/\.0$/, '')
  return `${abs} ${abs === '1' ? 'shot' : 'shots'}`
}

export default function ShotsQuiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({})

  const done = step >= STEPS.length
  const result = done ? scoreQuiz(answers as QuizAnswers) : null

  function choose(key: Key, value: string | number) {
    setAnswers(a => ({ ...a, [key]: value }))
    setStep(s => s + 1)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function restart() {
    setAnswers({})
    setStep(0)
  }

  if (!done) {
    const s = STEPS[step]
    return (
      <div className="rounded-2xl p-5" style={card}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#CC2222' }}>
            Question <span style={mono}>{step + 1}</span> of <span style={mono}>{STEPS.length}</span>
          </p>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="text-sm px-2" style={{ color: '#9A9DB0', minHeight: '44px' }}>
              Back
            </button>
          )}
        </div>
        <div className="flex gap-1 mb-5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= step ? '#CC2222' : '#2E3247' }} />
          ))}
        </div>
        <h2 className="text-xl font-bold mb-1 leading-snug" style={heading}>{s.question}</h2>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>{s.help}</p>
        <div className="flex flex-col gap-2">
          {s.options.map(o => {
            const picked = answers[s.key] === o.value
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => choose(s.key, o.value)}
                className="w-full text-left px-4 rounded-xl text-base font-semibold"
                style={{ minHeight: '52px', backgroundColor: '#22263A', color: '#F0F0F0', border: `1px solid ${picked ? '#CC2222' : '#2E3247'}` }}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-2xl p-5 text-center" style={card}>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>Something went missing in your answers.</p>
        <button type="button" onClick={restart} className="px-6 rounded-xl text-sm font-semibold" style={{ minHeight: '44px', backgroundColor: '#CC2222', color: '#F0F0F0' }}>
          Start again
        </button>
      </div>
    )
  }

  const { band, lines, worst, best } = result
  const bandName = plainLabel(band.label).toLowerCase()
  const advice = worst ? AREA_ADVICE[worst.area] : null
  const biggest = Math.max(1, ...lines.map(l => Math.abs(l.shots)))

  return (
    <div>
      <div className="rounded-2xl p-5 mb-4" style={{ ...card, border: '1px solid #CC222260' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Your result</p>
        {worst ? (
          <>
            <h2 className="text-2xl font-bold mb-2 leading-snug" style={heading}>
              {worst.name} is costing you about <span style={{ ...mono, color: '#EF4444' }}>{shotsText(worst.shots)}</span> a round.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
              That is against a typical {bandName}. You said {worst.yours}, and golfers at your level usually manage {worst.typical}.
              {best ? ` Your ${best.name.toLowerCase()} is a strength, worth about ${shotsText(best.shots)} a round the other way.` : ''}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2 leading-snug" style={heading}>
              Nothing stands out. You are level with a typical {bandName} across the board.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
              That usually means the shots are going somewhere these four numbers cannot see: a certain distance, a certain club, or the odd big number. That is the job Strokes Gained does.
            </p>
          </>
        )}
      </div>

      <div className="rounded-2xl p-5 mb-4" style={card}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#F0F0F0' }}>Shots per round against a typical {bandName}</p>
        <div className="flex flex-col gap-4">
          {lines.map(l => {
            const level = Math.abs(l.shots) < LEVEL_MARGIN
            const colour = level ? '#9A9DB0' : l.shots > 0 ? '#22C55E' : '#EF4444'
            const width = Math.max(4, Math.round((Math.abs(l.shots) / biggest) * 100))
            return (
              <div key={l.area}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{l.name}</p>
                  <p className="text-sm font-semibold" style={{ ...mono, color: colour }}>
                    {level ? 'Level' : `${l.shots > 0 ? '+' : '-'}${Math.abs(l.shots).toFixed(1)}`}
                  </p>
                </div>
                <div className="h-2 rounded-full mb-1" style={{ backgroundColor: '#22263A' }}>
                  <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: colour }} />
                </div>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>You: {l.yours}. Typical: {l.typical}.</p>
              </div>
            )
          })}
        </div>
      </div>

      {worst && advice && (
        <div className="rounded-2xl p-5 mb-4" style={card}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#F0F0F0' }}>What to do about it</p>
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#9A9DB0' }}>{advice.tip}</p>
          <Link href={`/golf-stats/${advice.statSlug}-${band.slug}`} className="text-sm" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>
            See the {advice.statName} benchmark for a {bandName}
          </Link>
        </div>
      )}

      <div className="rounded-2xl p-5 mb-4 text-center" style={card}>
        <p className="text-lg font-bold mb-2" style={heading}>Want the real answer, not the rough one?</p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#9A9DB0' }}>
          This quiz reads four numbers. Log one round shot by shot in TM Stats and you get Strokes Gained for every shot, so you see which distances and clubs the shots are going on. Your first breakdown is free.
        </p>
        <Link
          href="/signup"
          className="w-full flex items-center justify-center rounded-xl text-base font-semibold mb-2"
          style={{ minHeight: '52px', backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          Get my Strokes Gained free
        </Link>
        <p className="text-xs" style={{ color: '#9A9DB0' }}>No card needed. Five rounds free.</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={restart} className="px-1" style={{ color: '#9A9DB0', minHeight: '44px', textDecoration: 'underline' }}>
          Start again
        </button>
        <Link href="/strokes-gained-calculator" className="inline-flex items-center px-1" style={{ color: '#9A9DB0', textDecoration: 'underline', minHeight: '44px' }}>
          Try one hole in the calculator
        </Link>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import PracticeClient from '@/components/practice/PracticeClient'
import { CATEGORY_LABEL, PRACTICE_TESTS, practiceStreakWeeks, testProgress, testsFor, LEVEL_LABEL, type TestCategory, type TestResult } from '@/lib/practice-tests'
import { fmtScore, guideFor } from './practice-ui'

interface Props {
  initialTab: 'tests' | 'log'
  results: (TestResult & { test_key: string })[]
  sessionDates: string[]
  handicap: number | null
  suggestion: { category: TestCategory; why: string } | null
}

export default function PracticeHub({ initialTab, results, sessionDates, handicap, suggestion }: Props) {
  const [tab, setTab] = useState<'tests' | 'log'>(initialTab)
  const byTest = useMemo(() => {
    const m = new Map<string, TestResult[]>()
    for (const r of results) { if (!m.has(r.test_key)) m.set(r.test_key, []); m.get(r.test_key)!.push(r) }
    return m
  }, [results])

  const streak = practiceStreakWeeks([...results.map(r => r.taken_on), ...sessionDates])
  const monthStart = new Date().toISOString().slice(0, 8) + '01'
  const testsThisMonth = results.filter(r => r.taken_on >= monthStart).length
  const sessionsThisMonth = sessionDates.filter(d => d >= monthStart).length
  const newBests = PRACTICE_TESTS.filter(t => {
    const list = (byTest.get(t.key) ?? []).filter(r => r.taken_on >= monthStart)
    return list.length > 0 && testProgress(t, byTest.get(t.key) ?? []).bestOn! >= monthStart && (byTest.get(t.key) ?? []).length > 1
  }).length
  const suggested = suggestion ? testsFor(suggestion.category) : []

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Practice</h1>
      <p className="text-sm mb-5" style={{ color: '#9A9DB0' }}>Score your practice, then beat it next time.</p>

      <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
        {(['tests', 'log'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className="rounded-lg text-sm font-semibold" style={{ backgroundColor: tab === t ? '#CC2222' : 'transparent', color: tab === t ? '#F0F0F0' : '#9A9DB0', minHeight: '44px' }}>
            {t === 'tests' ? 'Tests' : 'Session log'}
          </button>
        ))}
      </div>

      {tab === 'log' ? <PracticeClient /> : (
        <>
          {/* This month */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { v: streak, l: streak === 1 ? 'week in a row' : 'weeks in a row' },
              { v: testsThisMonth + sessionsThisMonth, l: 'this month' },
              { v: newBests, l: newBests === 1 ? 'new best this month' : 'new bests this month' },
            ].map(x => (
              <div key={x.l} className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
                <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{x.v}</p>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>{x.l}</p>
              </div>
            ))}
          </div>

          {/* Suggested from the golfer's own rounds */}
          {suggestion && suggested.length > 0 && (
            <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: '#CC222212', border: '1px solid #CC222250' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#CC2222' }}>Suggested for you</p>
              <p className="text-sm mb-3" style={{ color: '#F0F0F0' }}>{CATEGORY_LABEL[suggestion.category]}: {suggestion.why}.</p>
              <div className="flex flex-wrap gap-2">
                {suggested.map(t => (
                  <Link key={t.key} href={`/practice/tests/${t.key}`} className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>{t.name} →</Link>
                ))}
              </div>
            </div>
          )}

          {(['putting', 'aroundGreen', 'approach', 'offTee'] as TestCategory[]).map(cat => (
            <div key={cat} className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>{CATEGORY_LABEL[cat]}</p>
              <div className="space-y-2">
                {testsFor(cat).map(t => {
                  const list = byTest.get(t.key) ?? []
                  const p = testProgress(t, list)
                  const guide = guideFor(t, handicap)
                  return (
                    <Link key={t.key} href={`/practice/tests/${t.key}`} className="block p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{t.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{p.taken === 0 ? t.short : `Best ${fmtScore(t, p.best)} · last ${fmtScore(t, p.last)} ${t.unit}${p.level ? ` · playing like a ${LEVEL_LABEL[p.level]}` : ''}`}</p>
                        </div>
                        {list.length >= 2 ? (
                          <div style={{ width: '72px', height: '32px' }} className="flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={list.slice(-10).map((r, i) => ({ i, s: r.score }))}>
                                <YAxis hide reversed={!t.higherIsBetter} domain={['dataMin', 'dataMax']} />
                                <Line type="monotone" dataKey="s" stroke="#22C55E" strokeWidth={2} dot={false} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <span className="text-xs flex-shrink-0" style={{ color: '#CC2222' }}>{p.taken === 0 ? 'Try it →' : 'Again →'}</span>
                        )}
                      </div>
                      {p.taken === 0 && <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>Guide for a {guide.label}: {fmtScore(t, guide.value)} {t.unit}</p>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="text-xs" style={{ color: '#4A4D60' }}>Guide scores by handicap are TM Stats&apos; rough guide, to give you something to aim at.</p>
        </>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/profile/LogoutButton'
import SGBaselinePicker from '@/components/profile/SGBaselinePicker'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import ManageBillingButton from '@/components/profile/ManageBillingButton'
import { handicapToSkillLevel, calculateRoundSG } from '@/lib/sg-engine'
import type { HoleRow, ShotEntry } from '@/lib/types'
import PromoRedeemForm from '@/components/profile/PromoRedeemForm'
import JoinTeamForm from '@/components/profile/JoinTeamForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('name, email, handicap, subscription_status, sg_baseline, feedback_level, coach_persona, promo_expires_at')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'

  // Check promo expiry and downgrade if needed
  if (isPro && profile?.promo_expires_at) {
    const expiresAt = new Date(profile.promo_expires_at)
    if (expiresAt < new Date()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('users')
        .update({ subscription_status: 'free', promo_expires_at: null })
        .eq('id', user.id)
      // Redirect to refresh
    }
  }

  // Team membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teamMembership } = await (supabase as any)
    .from('team_members')
    .select('team_id, teams(name)')
    .eq('user_id', user.id)
    .single()
  const currentTeamName = teamMembership?.teams?.name ?? null

  // Golf DNA — SG averages across last 10 full-tracking rounds
  let golfDNA: { strength: string; opportunity: string; strengthVal: string; opportunityVal: string } | null = null
  if (isPro) {
    const skillLevel = (profile?.sg_baseline as ReturnType<typeof handicapToSkillLevel> | null) ?? handicapToSkillLevel(profile?.handicap ?? null)
    const { data: fullRounds } = await supabase
      .from('rounds')
      .select('id')
      .eq('user_id', user.id)
      .eq('input_mode', 'full')
      .order('date', { ascending: false })
      .limit(10)

    if (fullRounds && fullRounds.length >= 2) {
      const roundIds = fullRounds.map(r => r.id)
      const { data: holesRaw } = await supabase.from('holes').select('*').in('round_id', roundIds)
      if (holesRaw && holesRaw.length > 0) {
        const totals = { offTee: 0, approach: 0, aroundGreen: 0, putt: 0 }
        let count = 0
        for (const r of fullRounds) {
          const holes = (holesRaw as HoleRow[]).filter(h => h.round_id === r.id)
          if (holes.length === 0) continue
          const sg = calculateRoundSG(
            holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3|4|5, shots: h.shots as ShotEntry[]|null })),
            skillLevel
          )
          if (!sg) continue
          totals.offTee += sg.sgOffTee
          totals.approach += sg.sgApproach
          totals.aroundGreen += sg.sgAroundGreen
          totals.putt += sg.sgPutt
          count++
        }
        if (count >= 2) {
          const avgs = {
            offTee: totals.offTee / count,
            approach: totals.approach / count,
            aroundGreen: totals.aroundGreen / count,
            putt: totals.putt / count,
          }
          const labels: Record<string, string> = { offTee: 'Driving', approach: 'Approach play', aroundGreen: 'Short game', putt: 'Putting' }
          const sorted = Object.entries(avgs).sort((a, b) => b[1] - a[1])
          const best = sorted[0]
          const worst = sorted[sorted.length - 1]
          golfDNA = {
            strength: labels[best[0]],
            strengthVal: (best[1] > 0 ? '+' : '') + best[1].toFixed(2),
            opportunity: labels[worst[0]],
            opportunityVal: (worst[1] > 0 ? '+' : '') + worst[1].toFixed(2),
          }
        }
      }
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Profile
      </h1>

      {/* Account info */}
      <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
        <div className="flex items-center gap-4 mb-1">
          <div
            className="flex items-center justify-center rounded-full text-lg font-bold"
            style={{
              backgroundColor: '#CC2222',
              color: '#F0F0F0',
              width: '52px',
              height: '52px',
              flexShrink: 0,
            }}
          >
            {(profile?.name ?? profile?.email ?? 'G')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#F0F0F0' }}>
              {profile?.name ?? 'Golfer'}
            </p>
            <p className="text-sm" style={{ color: '#9A9DB0' }}>
              {profile?.email ?? user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid #2E3247' }}>
          <span className="text-sm" style={{ color: '#9A9DB0' }}>Plan</span>
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: isPro ? '#22C55E20' : '#22263A',
              color: isPro ? '#22C55E' : '#9A9DB0',
            }}
          >
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
      </div>

      {/* Subscription status */}
      {!isPro ? (
        <div
          className="p-4 rounded-xl mb-4"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222230' }}
        >
          <p className="font-semibold text-sm mb-1" style={{ color: '#F0F0F0' }}>Go Pro</p>
          <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
            Unlimited rounds, full Strokes Gained, AI coaching from your chosen coach.
          </p>
          <a
            href="/upgrade"
            className="block text-center py-3 rounded-lg text-sm font-semibold mb-4"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
          >
            See Pro plans →
          </a>
          <PromoRedeemForm />
        </div>
      ) : (
        <div className="mb-4">
          <ManageBillingButton />
          {profile?.promo_expires_at && (
            <p className="text-xs mt-2 text-center" style={{ color: '#9A9DB0' }}>
              Promo access expires {new Date(profile.promo_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Edit form */}
      <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#F0F0F0' }}>Settings</p>
        <ProfileEditForm
          name={profile?.name ?? null}
          handicap={profile?.handicap ?? null}
          feedbackLevel={profile?.feedback_level ?? 'intermediate'}
          coachPersona={profile?.coach_persona ?? 'club_pro'}
        />
      </div>

      {/* Join a team */}
      {profile?.subscription_status !== 'team' && (
        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
          <JoinTeamForm currentTeamName={currentTeamName} />
        </div>
      )}

      {/* SG Baseline override */}
      <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: '#F0F0F0' }}>Strokes Gained baseline</p>
        <SGBaselinePicker
          currentLevel={handicapToSkillLevel(profile?.handicap ?? null)}
          savedBaseline={profile?.sg_baseline ?? null}
          handicap={profile?.handicap ?? null}
        />
      </div>

      {/* Golf DNA */}
      {golfDNA && (
        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#F0F0F0' }}>Golf DNA</p>
          <p className="text-xs mb-3" style={{ color: '#4A4D60' }}>Based on your last 10 full-tracking rounds</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #22C55E30' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#22C55E' }}>Strength</p>
              <p className="text-sm font-bold mb-0.5" style={{ color: '#F0F0F0' }}>{golfDNA.strength}</p>
              <p className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>{golfDNA.strengthVal} SG avg</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #CC222230' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#CC2222' }}>Opportunity</p>
              <p className="text-sm font-bold mb-0.5" style={{ color: '#F0F0F0' }}>{golfDNA.opportunity}</p>
              <p className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#CC2222' }}>{golfDNA.opportunityVal} SG avg</p>
            </div>
          </div>
        </div>
      )}

      <LogoutButton />
    </div>
  )
}

import UpgradeClient from './UpgradeClient'
import { priceFor } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export default function UpgradePage() {
  // Elite can only be bought once its Stripe prices are set up. Until then the
  // page sells Pro only and tells Pro members Elite is on its way.
  const eliteOpen = !!priceFor('elite', 'monthly') && !!priceFor('elite', 'yearly')
  return <UpgradeClient eliteOpen={eliteOpen} />
}

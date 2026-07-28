import { SkelBar, SkelCard, SkelPage } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <SkelPage>
      <div className="mb-6">
        <SkelBar w={180} h={28} className="mb-2" />
        <SkelBar w={120} h={14} />
      </div>
      <SkelCard>
        <SkelBar w={100} h={12} className="mb-3" />
        <SkelBar w="70%" h={20} />
      </SkelCard>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[0, 1].map((i) => (
          <SkelCard key={i} className="mb-0">
            <SkelBar w={60} h={12} className="mb-3" />
            <SkelBar w={80} h={28} />
          </SkelCard>
        ))}
      </div>
      <SkelCard>
        <SkelBar w={140} h={14} className="mb-4" />
        {[0, 1, 2].map((i) => (
          <SkelBar key={i} w="100%" h={18} className="mb-3" />
        ))}
      </SkelCard>
    </SkelPage>
  )
}

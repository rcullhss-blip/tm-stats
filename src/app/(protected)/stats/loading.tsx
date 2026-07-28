import { SkelBar, SkelCard, SkelPage } from '@/components/ui/Skeleton'

export default function StatsLoading() {
  return (
    <SkelPage>
      <SkelBar w={120} h={28} className="mb-4" />
      <div className="flex gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <SkelBar key={i} w={72} h={32} />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <SkelCard key={i}>
          <SkelBar w={140} h={14} className="mb-4" />
          <SkelBar w="100%" h={48} className="mb-3" />
          <SkelBar w="60%" h={14} />
        </SkelCard>
      ))}
    </SkelPage>
  )
}

import { SkelBar, SkelCard, SkelPage } from '@/components/ui/Skeleton'

export default function RoundDetailLoading() {
  return (
    <SkelPage>
      <SkelBar w={60} h={14} className="mb-4" />
      <div className="mb-6">
        <SkelBar w={200} h={26} className="mb-2" />
        <SkelBar w={130} h={14} />
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <SkelCard key={i} className="mb-0">
            <SkelBar w="100%" h={24} className="mb-2" />
            <SkelBar w="60%" h={10} />
          </SkelCard>
        ))}
      </div>
      <SkelCard>
        <SkelBar w={120} h={14} className="mb-4" />
        <SkelBar w="100%" h={80} />
      </SkelCard>
      <SkelCard>
        <SkelBar w={100} h={14} className="mb-4" />
        {[0, 1, 2].map((i) => (
          <SkelBar key={i} w="100%" h={18} className="mb-3" />
        ))}
      </SkelCard>
    </SkelPage>
  )
}

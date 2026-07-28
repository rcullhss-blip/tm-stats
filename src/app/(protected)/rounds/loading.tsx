import { SkelBar, SkelCard, SkelPage } from '@/components/ui/Skeleton'

export default function RoundsLoading() {
  return (
    <SkelPage>
      <div className="flex items-center justify-between mb-6">
        <SkelBar w={120} h={28} />
        <SkelBar w={80} h={36} />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <SkelCard key={i}>
          <div className="flex items-center justify-between">
            <div>
              <SkelBar w={140} h={18} className="mb-2" />
              <SkelBar w={90} h={12} />
            </div>
            <SkelBar w={48} h={28} />
          </div>
        </SkelCard>
      ))}
    </SkelPage>
  )
}

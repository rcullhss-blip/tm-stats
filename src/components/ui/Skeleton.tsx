// Skeleton primitives for route-level loading.tsx files.
// Matches the design system: dark surface (#1A1D27), raised placeholder (#22263A).

export function SkelBar({ w = '100%', h = 16, className = '' }: { w?: string | number; h?: number; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: h, backgroundColor: '#22263A' }}
    />
  )
}

export function SkelCard({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 mb-4 ${className}`}
      style={{ backgroundColor: '#1A1D27', border: '1px solid #22263A' }}
    >
      {children}
    </div>
  )
}

export function SkelPage({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-6 max-w-lg mx-auto">{children}</div>
}

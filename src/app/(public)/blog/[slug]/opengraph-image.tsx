import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/service'

export const alt = 'TM Stats blog post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post } = await (createServiceClient() as any).from('blog_posts').select('title, keyword').eq('slug', slug).single()
  const title: string = post?.title ?? 'Golf stats and Strokes Gained'
  const keyword: string = post?.keyword ?? ''
  const fontSize = title.length > 70 ? 52 : title.length > 45 ? 62 : 72

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, backgroundColor: '#0F1117', color: '#F0F0F0', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#CC2222' }} />
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>TM STATS BLOG</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {keyword && <div style={{ fontSize: 26, color: '#CC2222', textTransform: 'uppercase', letterSpacing: 3 }}>{keyword}</div>}
          <div style={{ fontSize, fontWeight: 800, lineHeight: 1.1, maxWidth: 1050 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, color: '#9A9DB0' }}>
          <span>By Rob Cull</span>
          <span style={{ color: '#CC2222', fontWeight: 700 }}>tmstatsgolf.com</span>
        </div>
      </div>
    ),
    size,
  )
}

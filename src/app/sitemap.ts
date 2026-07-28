import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { allSeoPages } from '@/lib/seo-stats'

const SITE = 'https://tmstatsgolf.com'

export const revalidate = 86400 // refresh daily so new blog posts appear

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/golf-stats`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/signup`, changeFrequency: 'monthly', priority: 0.9 },
  ]

  const seoPages: MetadataRoute.Sitemap = allSeoPages().map(p => ({
    url: `${SITE}/golf-stats/${p.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Blog posts — tolerate the table not existing yet
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts } = await (supabase as any)
      .from('blog_posts')
      .select('slug, published_at')
      .order('published_at', { ascending: false })
      .limit(500)
    blogPages = (posts ?? []).map((p: { slug: string; published_at: string }) => ({
      url: `${SITE}/blog/${p.slug}`,
      lastModified: p.published_at,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    // blog table missing — sitemap still works
  }

  return [...staticPages, ...seoPages, ...blogPages]
}

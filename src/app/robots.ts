import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/dashboard', '/rounds', '/stats', '/profile', '/mental', '/practice', '/coach'],
    },
    sitemap: 'https://tmstatsgolf.com/sitemap.xml',
  }
}

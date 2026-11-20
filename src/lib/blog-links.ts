// Internal links for blog posts, added when the page renders (the stored HTML is
// left alone). Each rule links the first mention of a phrase in body text to the
// one page we want ranking for it, so every post points search engines at the
// same target pages. Longer phrases come first so "strokes gained calculator"
// wins over "strokes gained".

type Rule = { pattern: RegExp; href: string }

const RULES: Rule[] = [
  { pattern: /\bstrokes gained calculator\b/i, href: '/strokes-gained-calculator' },
  { pattern: /\bgolf stats (?:tracker|app)\b/i, href: '/' },
  { pattern: /\bstrokes gained\b/i, href: '/strokes-gained' },
  { pattern: /\bputts per round\b/i, href: '/blog/average-putts-per-round-by-handicap' },
  { pattern: /\bgreens in regulation\b/i, href: '/blog/greens-in-regulation-by-handicap-explained' },
  { pattern: /\bbreak(?:ing)? 90\b/i, href: '/blog/how-to-break-90-in-golf' },
  { pattern: /\bbreak(?:ing)? 100\b/i, href: '/blog/how-to-break-100-in-golf' },
  { pattern: /\bcourse management\b/i, href: '/blog/golf-course-management-tips-that-save-shots' },
  { pattern: /\bpre-shot routine\b/i, href: '/blog/golf-pre-shot-routine-that-holds-up-under-pressure' },
  { pattern: /\bgolf stats\b/i, href: '/golf-stats' },
]

const MAX_LINKS = 5
const LINK_STYLE = 'color:#F0F0F0;text-decoration:underline;'

export function addInternalLinks(html: string, currentPath: string): string {
  const used = new Set<string>([currentPath])
  let added = 0
  let skipDepth = 0 // inside <a>, <h1>-<h6>: never link there

  return html.split(/(<[^>]+>)/g).map(part => {
    if (part.startsWith('<')) {
      const m = part.match(/^<(\/?)(a|h[1-6])\b/i)
      if (m) skipDepth = Math.max(0, skipDepth + (m[1] ? -1 : 1))
      if (/^<a\b/i.test(part)) {
        const href = part.match(/href="([^"]+)"/i)?.[1]?.replace(/^https?:\/\/(www\.)?tmstatsgolf\.com/, '')
        if (href) used.add(href || '/')
      }
      return part
    }
    if (skipDepth > 0 || added >= MAX_LINKS || !part.trim()) return part
    let text = part
    for (const rule of RULES) {
      if (added >= MAX_LINKS) break
      if (used.has(rule.href)) continue
      const hit = text.match(rule.pattern)
      if (!hit || hit.index === undefined) continue
      // Don't nest inside a link we just added to this same text node.
      const before = text.slice(0, hit.index)
      if ((before.match(/<a /g) || []).length > (before.match(/<\/a>/g) || []).length) continue
      if (/<a [^>]*>[^<]*$/.test(before)) continue
      text = `${before}<a href="${rule.href}" style="${LINK_STYLE}">${hit[0]}</a>${text.slice(hit.index + hit[0].length)}`
      used.add(rule.href)
      added++
    }
    return text
  }).join('')
}

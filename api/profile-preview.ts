/**
 * The card a pasted profile link turns into.
 *
 * The app is a single-page bundle, so every URL serves the same index.html with
 * the same title — which means a link to somebody's profile previews in iMessage
 * or Discord as "Popcorn Pal" and nothing else. Crawlers are routed here instead
 * (see vercel.json), and get a small page whose only job is its <head>.
 *
 * Real browsers never reach this: the rewrite matches on User-Agent. The meta
 * refresh is there for the case where one does anyway.
 */

type PreviewRequest = {
  url?: string
  query?: Record<string, string | string[] | undefined>
  headers: Record<string, string | string[] | undefined>
}

type PreviewResponse = {
  setHeader(name: string, value: string): void
  status(code: number): PreviewResponse
  send(body: string): void
}

type PreviewProfile = {
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function originOf(req: PreviewRequest): string {
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host)
  const proto = first(req.headers['x-forwarded-proto']) || 'https'
  return `${proto}://${host}`
}

async function fetchProfile(username: string): Promise<PreviewProfile | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  const url =
    `${SUPABASE_URL}/rest/v1/profiles` +
    `?select=username,full_name,bio,avatar_url&username=eq.${encodeURIComponent(username)}&limit=1`
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!response.ok) return null
  const rows = (await response.json()) as PreviewProfile[]
  return rows[0] ?? null
}

export default async function handler(req: PreviewRequest, res: PreviewResponse) {
  const fromQuery = first(req.query?.username)
  const fromPath = decodeURIComponent(
    (req.url ?? '').split('?')[0].replace(/^\/profile\//, '')
  )
  const username = (fromQuery || fromPath).replace(/[^A-Za-z0-9_]/g, '').slice(0, 30)
  const origin = originOf(req)
  const canonical = `${origin}/profile/${encodeURIComponent(username)}`

  let profile: PreviewProfile | null = null
  try {
    if (username) profile = await fetchProfile(username)
  } catch {
    // A preview is decoration; a failed lookup falls back to the generic card
    // rather than showing the sharer an error page.
  }

  const title = profile
    ? `@${profile.username} on PopcornPal`
    : 'PopcornPal'
  const description = profile
    ? profile.bio?.trim() ||
      `${profile.full_name?.trim() || `@${profile.username}`} — their films, shows, games and books, and the top tens to argue with.`
    : 'Track and share your movies, shows, games, and books with friends.'
  const image =
    profile?.avatar_url && /^https:\/\//.test(profile.avatar_url)
      ? profile.avatar_url
      : `${origin}/pwa-512x512.png`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Crawlers re-fetch often and a profile changes slowly; let the edge hold it
  // briefly and keep serving the old card while it refreshes.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
  res.status(profile ? 200 : 404).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="PopcornPal" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(canonical)}" />
  </head>
  <body>
    <p><a href="${escapeHtml(canonical)}">${escapeHtml(title)}</a></p>
  </body>
</html>`)
}

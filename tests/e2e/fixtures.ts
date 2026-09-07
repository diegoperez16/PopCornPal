import type { BrowserContext, Page } from '@playwright/test'
export const USER_ID = '10000000-0000-4000-8000-000000000001'
const FRIEND_ID = '10000000-0000-4000-8000-000000000002'
export const profile = {
  id: USER_ID,
  username: 'alex',
  bio: 'Here for the stories that stay with you.',
  avatar_url: null,
  created_at: '2026-01-01T12:00:00Z',
}
const friends = [
  {
    ...profile,
    id: FRIEND_ID,
    username: 'maria',
    bio: 'One more movie, always.',
  },
  {
    ...profile,
    id: '10000000-0000-4000-8000-000000000003',
    username: 'jules',
    bio: 'Books, films & beautifully strange worlds.',
  },
]
const titles = [
  ['The Grand Budapest Hotel', 'movie', 2014, 9.2, '#98666c', '#f1d8b9'],
  ['Dune: Part Two', 'movie', 2024, 9.0, '#6f4131', '#ecb765'],
  ['Past Lives', 'movie', 2023, 8.5, '#364d46', '#b5c6a0'],
  ['The Bear', 'show', 2022, 8.8, '#254e64', '#cbd4d2'],
  ['Interstellar', 'movie', 2014, 9.4, '#333c47', '#dbdad1'],
  ['The Midnight Library', 'book', 2020, 8.2, '#272e57', '#d3aa75'],
] as const
export function poster(index: number) {
  const [title, , , , bg, accent] = titles[index % titles.length]
  const words = title.split(' ')
  const mid = Math.ceil(words.length / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#151719"/></linearGradient></defs><rect width="342" height="513" fill="url(#a)"/><circle cx="245" cy="160" r="105" fill="${accent}" opacity=".6"/><circle cx="245" cy="160" r="122" fill="none" stroke="${accent}" opacity=".3"/><path d="M0 360 170 170 342 390V513H0Z" fill="${bg}"/><path d="M0 412 240 300 342 390V513H0Z" fill="#181d21" opacity=".8"/><text x="26" y="40" fill="${accent}" font-family="sans-serif" font-size="10" letter-spacing="3">THE STORIES THAT STAY</text><text x="26" y="418" fill="#f2e2c8" font-family="Georgia,serif" font-size="26">${words.slice(0, mid).join(' ')}</text><text x="26" y="451" fill="#f2e2c8" font-family="Georgia,serif" font-size="26">${words.slice(mid).join(' ')}</text><text x="26" y="489" fill="${accent}" font-family="sans-serif" font-size="9" letter-spacing="2">POPCORN PAL · SAMPLE ARTWORK</text></svg>`
}
export const entries = titles.map(([title, media_type, year, rating], i) => ({
  id: `entry-${i}`,
  user_id: USER_ID,
  title,
  media_type,
  year,
  rating,
  status: 'logged',
  notes: i === 0 ? 'A tiny, beautiful world. Every frame is a postcard.' : null,
  completed_date: null,
  cover_image_url: `https://image.tmdb.org/t/p/w342/fixture-${i}.jpg`,
  genre: null,
  created_at: `2026-08-${29 - i}T12:00:00Z`,
  updated_at: `2026-08-${29 - i}T12:00:00Z`,
}))
const authUser = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'alex@example.com',
  app_metadata: { provider: 'email' },
  user_metadata: { username: 'alex' },
  created_at: '2026-01-01T12:00:00Z',
}
const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: USER_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture-signature`
const authSession = {
  access_token: jwt,
  refresh_token: 'fixture-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: authUser,
}

export async function mockBackend(
  context: BrowserContext,
  { signedIn = true }: { signedIn?: boolean } = {}
) {
  let library = structuredClone(entries)
  const writes: { table: string; method: string; body: unknown }[] = []
  let posts = [
    {
      id: 'post-1',
      user_id: FRIEND_ID,
      username: 'maria',
      avatar_url: null,
      content:
        'Some movies feel like a place you’ve been. Rewatched this tonight and somehow loved it even more. What’s your comfort movie?',
      media_title: entries[0].title,
      media_type: 'movie',
      media_rating: 9.2,
      media_cover_url: entries[0].cover_image_url,
      likes_count: 12,
      comments_count: 2,
      is_liked: false,
      created_at: new Date(Date.now() - 42 * 60000).toISOString(),
    },
    {
      id: 'post-2',
      user_id: friends[1].id,
      username: 'jules',
      avatar_url: null,
      content:
        'Movie night idea: everyone brings a film they think nobody else has seen. No trailers. Just trust. 🍿',
      media_title: null,
      media_type: null,
      media_rating: null,
      media_cover_url: null,
      likes_count: 8,
      comments_count: 0,
      is_liked: false,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  ]
  await context.addInitScript(
    ({ authSession, signedIn }) => {
      if (!sessionStorage.getItem('fixture-initialized')) {
        if (signedIn)
          localStorage.setItem(
            'sb-preview-auth-token',
            JSON.stringify(authSession)
          )
        localStorage.setItem('popcorn_welcome_v', '3')
        sessionStorage.setItem('fixture-initialized', 'true')
      }
    },
    { authSession, signedIn }
  )
  await context.route('https://image.tmdb.org/**', async (route) => {
    const index = Number(
      route
        .request()
        .url()
        .match(/fixture-(\d+)/)?.[1] ?? 0
    )
    await route.fulfill({ contentType: 'image/svg+xml', body: poster(index) })
  })
  await context.route('https://api.themoviedb.org/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('query') === 'network-error')
      return route.fulfill({ status: 503, json: { error: 'Unavailable' } })
    if (url.pathname.includes('/season/'))
      return route.fulfill({
        json: {
          episodes: [
            { episode_number: 1, name: 'System', still_path: '/fixture-3.jpg' },
            { episode_number: 2, name: 'Hands', still_path: '/fixture-3.jpg' },
          ],
        },
      })
    if (/\/tv\/\d+$/.test(url.pathname))
      return route.fulfill({
        json: {
          seasons: [{ season_number: 1, name: 'Season 1', episode_count: 2 }],
        },
      })
    const show = url.pathname.includes('/tv')
    const results = (
      show
        ? entries.filter((e) => e.media_type === 'show')
        : entries.filter((e) => e.media_type === 'movie')
    ).map((e) => ({
      id: Number(e.id.split('-')[1]) + 100,
      title: e.title,
      name: e.title,
      poster_path: `/fixture-${e.id.split('-')[1]}.jpg`,
      release_date: `${e.year}-01-01`,
      first_air_date: `${e.year}-01-01`,
    }))
    return route.fulfill({ json: { results } })
  })
  await context.route('https://preview.supabase.co/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method()
    const table = url.pathname.split('/').pop()!
    if (url.pathname.includes('/auth/v1/')) {
      if (table === 'logout') return route.fulfill({ status: 204 })
      if (table === 'recover') return route.fulfill({ json: {} })
      if (table === 'signup')
        return route.fulfill({ json: { user: authUser, session: null } })
      return route.fulfill({ json: table === 'user' ? authUser : authSession })
    }
    if (table === 'get_feed') return route.fulfill({ json: posts })
    const single = request.headers().accept?.includes('object+json')
    if (method !== 'GET' && method !== 'HEAD') {
      const body = request.postDataJSON()
      writes.push({ table, method, body })
      if (table === 'media_entries') {
        if (method === 'POST')
          library.push(
            ...(Array.isArray(body) ? body : [body]).map((e, i) => ({
              ...entries[0],
              ...e,
              id: `saved-${writes.length}-${i}`,
            }))
          )
        if (method === 'PATCH')
          library = library.map((e) =>
            `eq.${e.id}` === url.searchParams.get('id') ? { ...e, ...body } : e
          )
        if (method === 'DELETE')
          library = library.filter(
            (e) => `eq.${e.id}` !== url.searchParams.get('id')
          )
      }
      if (table === 'posts' && method === 'POST')
        posts = [
          {
            ...posts[1],
            id: `post-${writes.length + 10}`,
            user_id: USER_ID,
            username: 'alex',
            content: body.content,
            created_at: new Date().toISOString(),
          },
          ...posts,
        ]
      return route.fulfill({
        status: single ? 200 : 201,
        json: single ? { id: `saved-${writes.length}` } : [],
      })
    }
    if (table === 'profiles') {
      if (
        url.searchParams.has('username') &&
        !url.searchParams.get('username')?.includes('alex')
      )
        return route.fulfill({ json: single ? null : [] })
      return route.fulfill({
        json: single
          ? profile
          : url.searchParams.has('id') &&
              url.searchParams.get('id')?.startsWith('eq.')
            ? [profile]
            : friends,
      })
    }
    if (table === 'media_entries') {
      let data = library
      for (const field of ['id', 'title', 'media_type', 'status'] as const) {
        const filter = url.searchParams.get(field)
        if (filter?.startsWith('eq.'))
          data = data.filter((e) => String(e[field]) === filter.slice(3))
      }
      return route.fulfill({ json: single ? (data[0] ?? null) : data })
    }
    if (table === 'user_stats')
      return route.fulfill({
        json: {
          id: USER_ID,
          movies_count: 4,
          shows_count: 1,
          games_count: 0,
          books_count: 1,
          avg_rating: 8.9,
        },
      })
    if (table === 'post_comments')
      return route.fulfill({
        json: [
          {
            id: 'comment-1',
            post_id: 'post-1',
            user_id: friends[1].id,
            content: 'This is absolutely on my comfort-watch list.',
            image_url: null,
            parent_comment_id: null,
            created_at: new Date().toISOString(),
            profiles: friends[1],
          },
        ],
      })
    if (table === 'follows')
      return route.fulfill({
        headers: { 'content-range': '0-1/2' },
        json: url.searchParams.get('select')?.includes('following:')
          ? friends.map((friend) => ({
              following_id: friend.id,
              following: friend,
            }))
          : [],
      })
    return route.fulfill({ json: single ? null : [] })
  })
  return { writes, getLibrary: () => library }
}
export async function navigateWheel(page: Page, label: string) {
  await page
    .getByRole('button', { name: 'Open navigation', exact: true })
    .click()
  await page
    .getByRole('dialog', { name: 'Popcorn Pal navigation' })
    .getByRole('link', { name: label, exact: true })
    .click()
}

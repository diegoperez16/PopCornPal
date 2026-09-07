// Supabase Edge Function — sort-house
//
// Deploy:  supabase functions deploy sort-house
// Secrets: supabase secrets set ANTHROPIC_API_KEY=...
//
// Reads the caller's shelf and asks a model which Hogwarts house it suggests,
// and why. The reason is the point: arithmetic can say "83% of your ratings are
// extreme", but only a model can notice that someone's shelf is all films that
// end on a question mark.
//
// Two rules this function keeps:
//   1. It never trusts the client for whose shelf to read. The caller's JWT
//      decides, so nobody can sort — or read — somebody else's library.
//   2. Notes are private by default and only included when the caller opts in
//      for this request.
//
// Any failure returns a non-2xx and the app falls back to its local heuristic,
// so sorting still works offline, without a key, or if the API is down.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HOUSES = ['gryffindor', 'ravenclaw', 'hufflepuff', 'slytherin'] as const
type House = (typeof HOUSES)[number]

const SYSTEM = `You sort people into Hogwarts houses by their taste in film, television, games and books.

You are given someone's shelf: what they logged, how they rated it out of 10, and which titles they refused to rate at all (a "dumpster" — reserved for things too bad to score).

Judge taste and rating behaviour, not plot. Look at what the shelf says about the person: what they seek out, how generously or harshly they score, whether they rate in confident whole numbers or careful decimals, whether they commit to extremes or sit in the middle.

- gryffindor: bold, rates from the gut, loves and hates loudly, no lukewarm
- ravenclaw: curious and precise, reads widely, rates carefully, argues in decimals
- hufflepuff: warm and generous, broad taste, finds something to love in most things
- slytherin: exacting, high standards, unimpressed easily, harsh when it is deserved

Write the reason in second person, one or two sentences, warm and specific. Refer to their actual titles or numbers. Do not flatter, do not hedge, and never mention that you are an AI.`

type Entry = {
  title: string
  media_type: string
  rating: number | null
  dumpstered: boolean | null
  notes: string | null
}

function describeShelf(entries: Entry[], includeNotes: boolean): string {
  return entries
    .slice(0, 60)
    .map((entry) => {
      const verdict = entry.dumpstered
        ? 'refused to rate it'
        : entry.rating !== null
          ? `${entry.rating}/10`
          : 'unrated'
      const note =
        includeNotes && entry.notes?.trim()
          ? ` — they wrote: "${entry.notes.trim().slice(0, 200)}"`
          : ''
      return `- ${entry.title} (${entry.media_type}): ${verdict}${note}`
    })
    .join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    // No key configured is a normal state, not a crash: the app falls back.
    if (!apiKey) return json({ error: 'sorting-unavailable' }, 503)

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401)
    }

    // The token decides whose shelf gets read — never the request body.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: auth, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !auth?.user) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as {
      includeNotes?: boolean
    }
    const includeNotes = body.includeNotes === true

    const { data: entries, error: shelfError } = await supabase
      .from('media_entries')
      .select('title, media_type, rating, dumpstered, notes')
      .eq('user_id', auth.user.id)
      .order('updated_at', { ascending: false })
      .limit(60)

    if (shelfError) return json({ error: 'shelf-unavailable' }, 502)
    if (!entries || entries.length < 5) {
      return json({ error: 'shelf-too-thin' }, 422)
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM,
        // A tool call is the cheapest way to get a shape back we can trust
        // rather than parsing prose.
        tools: [
          {
            name: 'sort',
            description: 'Assign the house and explain the choice.',
            input_schema: {
              type: 'object',
              properties: {
                house: { type: 'string', enum: HOUSES },
                because: {
                  type: 'string',
                  description:
                    'One or two sentences, second person, referring to their actual shelf.',
                },
              },
              required: ['house', 'because'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'sort' },
        messages: [
          {
            role: 'user',
            content: `Sort this shelf.\n\n${describeShelf(entries as Entry[], includeNotes)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('anthropic error', response.status, await response.text())
      return json({ error: 'sorting-failed' }, 502)
    }

    const payload = await response.json()
    const call = payload.content?.find(
      (block: { type: string }) => block.type === 'tool_use'
    )
    const house = call?.input?.house
    const because = call?.input?.because

    // Never hand back a house the app does not know about.
    if (!HOUSES.includes(house) || typeof because !== 'string' || !because.trim()) {
      return json({ error: 'sorting-failed' }, 502)
    }

    return json({ house: house as House, because: because.trim() })
  } catch (error) {
    console.error('sort-house crashed', error)
    return json({ error: 'sorting-failed' }, 500)
  }
})

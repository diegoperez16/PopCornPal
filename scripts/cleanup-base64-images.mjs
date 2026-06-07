#!/usr/bin/env node
/**
 * One-time cleanup: re-host base64 images inlined in posts.image_url.
 *
 * A number of posts store the whole image as a `data:<mime>;base64,...` URI
 * directly in posts.image_url (multi-MB each). That bloats every feed page —
 * get_feed ships those bytes inline. This script decodes each blob, uploads it
 * to the `post-images` Storage bucket (same convention as src/lib/postImages.ts),
 * and rewrites image_url to the resulting public URL.
 *
 * SAFETY:
 *   - Dry-run by default. It only writes when you pass --apply.
 *   - Processes one post at a time (selecting all base64 rows at once hits the
 *     statement timeout because the column is so large).
 *   - Per-post try/catch: one bad row never aborts the run.
 *
 * USAGE:
 *   # 1. Dry run — see exactly what it would touch, write nothing:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-base64-images.mjs
 *
 *   # 2. For real:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-base64-images.mjs --apply
 *
 * The service-role key is required because this updates posts across all users
 * (bypassing RLS). Get it from Dashboard → Project Settings → API → service_role.
 * NEVER commit it or put it in a VITE_* var (those ship to the browser).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')
const BUCKET = 'post-images'

// ─── Resolve credentials ────────────────────────────────────────────────────
// URL comes from .env (VITE_SUPABASE_URL); service key must be passed in the
// environment and is never read from any VITE_* value.
function readEnvFile(path) {
  try {
    const out = {}
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return out
  } catch {
    return {}
  }
}

const envFile = readEnvFile(resolve(__dirname, '..', '.env'))
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || envFile.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('✗ Missing Supabase URL (set VITE_SUPABASE_URL in .env or SUPABASE_URL in env).')
  process.exit(1)
}
if (!SERVICE_KEY) {
  console.error('✗ Missing SUPABASE_SERVICE_ROLE_KEY.')
  console.error('  Get it from Dashboard → Project Settings → API → service_role, then:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-base64-images.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Helpers ────────────────────────────────────────────────────────────────
const EXT_BY_MIME = {
  'image/gif': 'gif',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

function parseDataUri(uri) {
  // data:<mime>;base64,<payload>
  const m = uri.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/)
  if (!m) return null
  const mime = (m[1] || 'application/octet-stream').toLowerCase()
  const isBase64 = !!m[2]
  if (!isBase64) return null // only handling base64 payloads
  const buffer = Buffer.from(m[3], 'base64')
  return { mime, buffer }
}

const fmtBytes = (n) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${APPLY ? '⚙️  APPLY MODE — will upload and rewrite rows' : '🔍 DRY RUN — no writes (pass --apply to execute)'}`)
  console.log(`   project: ${SUPABASE_URL}`)
  console.log(`   bucket:  ${BUCKET}\n`)

  // 1. Get every post id (tiny payload). We deliberately do NOT select image_url
  //    here — pulling all the big columns at once times out.
  const { data: ids, error: idsErr } = await supabase
    .from('posts')
    .select('id, user_id')
    .order('created_at', { ascending: true })
  if (idsErr) {
    console.error('✗ Failed to list posts:', idsErr.message)
    process.exit(1)
  }
  console.log(`Scanning ${ids.length} posts (fetching image_url one at a time)…\n`)

  let inlineCount = 0
  let inlineBytes = 0
  let migrated = 0
  let failed = 0
  const failures = []

  for (const { id, user_id } of ids) {
    // 2. Fetch this single post's image_url (one row — never times out).
    const { data: row, error: rowErr } = await supabase
      .from('posts')
      .select('image_url')
      .eq('id', id)
      .single()
    if (rowErr) {
      console.warn(`  ! ${id} — could not read image_url: ${rowErr.message}`)
      continue
    }
    const url = row?.image_url
    if (!url || !url.startsWith('data:')) continue // already a URL, or no image

    const parsed = parseDataUri(url)
    if (!parsed) {
      console.warn(`  ! ${id} — image_url is data: but not parseable base64, skipping`)
      continue
    }

    inlineCount++
    inlineBytes += parsed.buffer.length
    const ext = EXT_BY_MIME[parsed.mime] || 'bin'
    const objectPath = `${user_id}/${crypto.randomUUID()}.${ext}`

    if (!APPLY) {
      console.log(`  • ${id}  ${parsed.mime.padEnd(10)} ${fmtBytes(parsed.buffer.length).padStart(10)}  →  ${BUCKET}/${objectPath}`)
      continue
    }

    try {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, parsed.buffer, { contentType: parsed.mime, upsert: false })
      if (upErr) throw new Error(`upload: ${upErr.message}`)

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
      const publicUrl = pub?.publicUrl
      if (!publicUrl) throw new Error('no public URL returned')

      const { error: updErr } = await supabase
        .from('posts')
        .update({ image_url: publicUrl })
        .eq('id', id)
      if (updErr) throw new Error(`update: ${updErr.message} (uploaded blob orphaned at ${objectPath})`)

      migrated++
      console.log(`  ✓ ${id}  ${fmtBytes(parsed.buffer.length).padStart(10)}  →  ${publicUrl}`)
    } catch (e) {
      failed++
      failures.push({ id, error: e.message })
      console.error(`  ✗ ${id} — ${e.message}`)
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`base64 posts found: ${inlineCount}`)
  console.log(`total inlined size: ${fmtBytes(inlineBytes)}`)
  if (APPLY) {
    console.log(`migrated:           ${migrated}`)
    console.log(`failed:             ${failed}`)
    if (failures.length) {
      console.log('\nFailures (safe to re-run — migrated rows are skipped on the next pass):')
      for (const f of failures) console.log(`  ${f.id}: ${f.error}`)
    }
  } else {
    console.log(`\nNothing was written. Re-run with --apply to migrate these ${inlineCount} posts.`)
  }
  console.log(`${'─'.repeat(60)}\n`)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})

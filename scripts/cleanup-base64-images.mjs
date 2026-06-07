#!/usr/bin/env node
/**
 * One-time cleanup: re-host base64 images that were inlined into database
 * columns because the project had no Storage buckets.
 *
 * Covers every base64 source in the app:
 *   posts.image_url       -> post-images bucket
 *   profiles.avatar_url   -> avatars bucket      (renders on EVERY page)
 *   profiles.bg_url       -> backgrounds bucket
 *
 * For each row whose column holds a `data:<mime>;base64,...` URI, it decodes
 * the blob, uploads it to the matching bucket (path: <owner-id>/<uuid>.<ext>,
 * the same convention as src/lib/postImages.ts), and rewrites the column to
 * the public URL. The image bytes are unchanged, so everything renders
 * identically — it just streams from the CDN instead of riding inside the JSON.
 *
 * SAFETY:
 *   - Dry-run by default. Writes only with --apply.
 *   - Processes one row at a time (selecting all base64 rows at once hits the
 *     statement timeout — the columns are huge).
 *   - The DB update only runs AFTER a successful upload, so a failed upload
 *     never corrupts a row. Per-row try/catch; one bad row never aborts.
 *   - Re-runnable: rows already converted to URLs are skipped.
 *
 * USAGE (key is read from .env.local / .env, never the command line):
 *   node scripts/cleanup-base64-images.mjs            # dry run
 *   node scripts/cleanup-base64-images.mjs --apply    # for real
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')

// What to clean: (table, column) -> bucket. ownerCol names the column used as
// the storage folder so a user's files are grouped under their id.
const TARGETS = [
  { table: 'posts',    urlCol: 'image_url',  ownerCol: 'user_id', bucket: 'post-images' },
  { table: 'profiles', urlCol: 'avatar_url', ownerCol: 'id',      bucket: 'avatars' },
  { table: 'profiles', urlCol: 'bg_url',     ownerCol: 'id',      bucket: 'backgrounds' },
]

// ─── Credentials (env or gitignored .env.local / .env; never hardcoded) ──────
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
const envLocal = readEnvFile(resolve(__dirname, '..', '.env.local'))
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || envLocal.VITE_SUPABASE_URL || envFile.VITE_SUPABASE_URL
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY || envFile.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (put the latter in .env.local).')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Helpers ────────────────────────────────────────────────────────────────
const EXT_BY_MIME = {
  'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg',
  'image/jpg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif',
}
function parseDataUri(uri) {
  const m = uri.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/)
  if (!m || !m[2]) return null
  return { mime: (m[1] || 'application/octet-stream').toLowerCase(), buffer: Buffer.from(m[3], 'base64') }
}
const fmtBytes = (n) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`

// ─── Process one (table, column) target ─────────────────────────────────────
async function processTarget(t, totals) {
  console.log(`\n▸ ${t.table}.${t.urlCol}  →  bucket "${t.bucket}"`)
  const { data: rows, error } = await supabase
    .from(t.table)
    .select(`id, ${t.ownerCol}`)
  if (error) {
    console.error(`  ✗ could not list ${t.table}: ${error.message}`)
    return
  }

  for (const row of rows) {
    // Fetch this row's big column alone (one row never times out).
    const { data: one, error: oneErr } = await supabase
      .from(t.table).select(t.urlCol).eq('id', row.id).single()
    if (oneErr) { console.warn(`  ! ${row.id} read failed: ${oneErr.message}`); continue }

    const url = one?.[t.urlCol]
    if (!url || !url.startsWith('data:')) continue
    const parsed = parseDataUri(url)
    if (!parsed) { console.warn(`  ! ${row.id} unparseable data URI, skipping`); continue }

    totals.count++
    totals.bytes += parsed.buffer.length
    const ext = EXT_BY_MIME[parsed.mime] || 'bin'
    const owner = row[t.ownerCol] || 'unknown'
    const objectPath = `${owner}/${crypto.randomUUID()}.${ext}`

    if (!APPLY) {
      console.log(`  • ${row.id}  ${parsed.mime.padEnd(10)} ${fmtBytes(parsed.buffer.length).padStart(10)}  →  ${t.bucket}/${objectPath}`)
      continue
    }
    try {
      const { error: upErr } = await supabase.storage
        .from(t.bucket).upload(objectPath, parsed.buffer, { contentType: parsed.mime, upsert: false })
      if (upErr) throw new Error(`upload: ${upErr.message}`)
      const { data: pub } = supabase.storage.from(t.bucket).getPublicUrl(objectPath)
      if (!pub?.publicUrl) throw new Error('no public URL')
      const { error: updErr } = await supabase
        .from(t.table).update({ [t.urlCol]: pub.publicUrl }).eq('id', row.id)
      if (updErr) throw new Error(`update: ${updErr.message} (blob orphaned at ${objectPath})`)
      totals.migrated++
      console.log(`  ✓ ${row.id}  ${fmtBytes(parsed.buffer.length).padStart(10)}  →  ${pub.publicUrl}`)
    } catch (e) {
      totals.failed++
      totals.failures.push({ row: row.id, target: `${t.table}.${t.urlCol}`, error: e.message })
      console.error(`  ✗ ${row.id} — ${e.message}`)
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${APPLY ? '⚙️  APPLY MODE — uploading and rewriting rows' : '🔍 DRY RUN — no writes (pass --apply to execute)'}`)
  console.log(`   project: ${SUPABASE_URL}`)

  const totals = { count: 0, bytes: 0, migrated: 0, failed: 0, failures: [] }
  for (const t of TARGETS) await processTarget(t, totals)

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`base64 values found: ${totals.count}`)
  console.log(`total inlined size:  ${fmtBytes(totals.bytes)}`)
  if (APPLY) {
    console.log(`migrated:            ${totals.migrated}`)
    console.log(`failed:              ${totals.failed}`)
    if (totals.failures.length) {
      console.log('\nFailures (safe to re-run — migrated rows are skipped):')
      for (const f of totals.failures) console.log(`  ${f.target} ${f.row}: ${f.error}`)
    }
  } else {
    console.log(`\nNothing written. Re-run with --apply to migrate these ${totals.count} values.`)
  }
  console.log(`${'─'.repeat(60)}\n`)
}
main().catch((e) => { console.error('Fatal:', e); process.exit(1) })

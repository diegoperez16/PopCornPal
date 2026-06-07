import { supabase } from './supabase'

const EXT_BY_MIME: Record<string, string> = {
  'image/gif': 'gif',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

function dataUriToBlob(dataUri: string): { blob: Blob; mime: string } | null {
  const match = dataUri.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/)
  if (!match) return null
  const mime = (match[1] || 'image/png').toLowerCase()
  const payload = match[3]
  if (match[2]) {
    // base64
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { blob: new Blob([bytes], { type: mime }), mime }
  }
  // URL-encoded text payload
  return { blob: new Blob([decodeURIComponent(payload)], { type: mime }), mime }
}

/**
 * Persist a profile image to Storage and return a public URL.
 *
 * Accepts whatever the editor produces:
 *   - a `data:` URI (cropped avatar canvas, or an uploaded file read as base64)
 *     → decoded and uploaded to `bucket`, returns the public CDN URL
 *   - an existing http(s) URL (Giphy/Tenor/direct link the user pasted)
 *     → returned unchanged (nothing to upload)
 *   - null/empty → returned as null
 *
 * This is the boundary that keeps base64 blobs out of the database: callers can
 * hand it the editor value verbatim and store the result.
 */
export async function persistProfileImage(
  userId: string,
  bucket: 'avatars' | 'backgrounds',
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null
  if (!value.startsWith('data:')) return value // already a URL — leave it

  const decoded = dataUriToBlob(value)
  if (!decoded) return value
  const ext = EXT_BY_MIME[decoded.mime] || 'png'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decoded.blob, { contentType: decoded.mime })
  if (error) throw error

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

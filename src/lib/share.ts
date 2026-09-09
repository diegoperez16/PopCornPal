/**
 * Handing someone a link to a profile.
 *
 * On a phone this is the system share sheet, which is where people expect to
 * find their group chat. Everywhere else — and whenever the sheet is missing or
 * refuses — it falls back to the clipboard, so the button always does
 * something. The caller gets back what actually happened, because "Link
 * copied" is a lie if the share sheet handled it.
 */
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed'

export function profileShareUrl(username: string): string {
  return `${window.location.origin}/profile/${username}`
}

export async function shareLink({
  url,
  title,
  text,
}: {
  url: string
  title?: string
  text?: string
}): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title, text })
      return 'shared'
    } catch (error) {
      // Backing out of the sheet is a decision, not a failure: falling back to
      // the clipboard here would copy a link the person just declined to send.
      if ((error as Error)?.name === 'AbortError') return 'dismissed'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

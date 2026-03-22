export interface Comment {
  id: string
  user_id: string
  content: string
  image_url: string | null
  created_at: string
  updated_at?: string | null
  parent_comment_id: string | null
  profiles: {
    username: string
    avatar_url: string | null
    avatar_crop?: { x: number; y: number; scale: number } | null
  }
  replies?: Comment[]
  likes_count?: number
  is_liked?: boolean
}

export const wasEdited = (created_at: string, updated_at?: string | null): boolean => {
  if (!updated_at) return false
  return Math.abs(new Date(updated_at).getTime() - new Date(created_at).getTime()) > 5000
}

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

export const findImageLink = (text: string): { foundLink: string; renderableUrl: string } | null => {
  const words = text.split(/\s+/)

  for (const w of words) {
    if (w.match(/^https?:\/\/.*\.(gif|webp|jpg|jpeg|png|bmp|avif)(\?.*)?$/i)) {
      return { foundLink: w, renderableUrl: w }
    }
    if (w.includes('giphy.com/media')) {
      return { foundLink: w, renderableUrl: w }
    }
    const giphyMatch = w.match(/giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)$/)
    if (giphyMatch) {
      const id = giphyMatch[1]
      return {
        foundLink: w,
        renderableUrl: `https://media.giphy.com/media/${id}/giphy.gif`,
      }
    }
  }
  return null
}

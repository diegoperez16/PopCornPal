import React from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'

/** Render text with @mentions as clickable profile links */
export function renderMentionText(text: string): React.ReactNode {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)
  return parts.map((part, i) => {
    if (/^@[a-zA-Z0-9_]+$/.test(part)) {
      return React.createElement(
        Link,
        { key: i, to: `/profile/${part.slice(1)}`, className: 'text-blue-400 hover:text-blue-300 font-medium' },
        part
      )
    }
    return part
  })
}

/** Extract unique @usernames from text */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) ?? []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

/** Look up user IDs for mentioned usernames and insert mention notifications */
export async function sendMentionNotifications(
  content: string,
  fromUserId: string,
  relatedId: string
): Promise<void> {
  const usernames = extractMentions(content)
  if (usernames.length === 0) return

  const { data: mentionedUsers } = await supabase
    .from('profiles')
    .select('id')
    .in('username', usernames)

  if (!mentionedUsers || mentionedUsers.length === 0) return

  const notifications = mentionedUsers
    .filter(u => u.id !== fromUserId)
    .map(u => ({
      user_id: u.id,
      type: 'mention',
      from_user_id: fromUserId,
      related_id: relatedId,
    }))

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }
}

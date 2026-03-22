import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

type MentionUser = {
  username: string
  avatar_url: string | null
}

export type MentionState = {
  isOpen: boolean
  query: string
  users: MentionUser[]
  loading: boolean
  triggerIndex: number
  selectedIndex: number
}

const CLOSED: MentionState = {
  isOpen: false,
  query: '',
  users: [],
  loading: false,
  triggerIndex: -1,
  selectedIndex: 0,
}

export function useMentionAutocomplete() {
  const [mention, setMention] = useState<MentionState>(CLOSED)
  const mentionRef = useRef(mention)
  mentionRef.current = mention
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTextChange = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos)
    // Find the last @ before cursor with no space after it
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/)

    if (!atMatch) {
      setMention(m => m.isOpen ? { ...m, isOpen: false } : m)
      return
    }

    const query = atMatch[1]
    const triggerIndex = textBeforeCursor.length - atMatch[0].length

    setMention(m => ({ ...m, isOpen: true, query, triggerIndex, selectedIndex: 0, loading: true }))

    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .ilike('username', `${query}%`)
        .limit(6)
      setMention(m => ({ ...m, users: data ?? [], loading: false }))
    }, 150)
  }, [])

  /** Returns the new text string after inserting the selected username */
  const selectUser = useCallback((text: string, username: string) => {
    const { triggerIndex, query } = mentionRef.current
    const before = text.slice(0, triggerIndex)
    const after = text.slice(triggerIndex + query.length + 1) // +1 for '@'
    const newText = `${before}@${username} ${after}`
    setMention(CLOSED)
    return newText
  }, [])

  const close = useCallback(() => setMention(CLOSED), [])

  const moveUp = useCallback(() =>
    setMention(m => ({ ...m, selectedIndex: Math.max(0, m.selectedIndex - 1) })),
  [])

  const moveDown = useCallback(() =>
    setMention(m => ({ ...m, selectedIndex: Math.min(m.users.length - 1, m.selectedIndex + 1) })),
  [])

  return { mention, handleTextChange, selectUser, close, moveUp, moveDown }
}

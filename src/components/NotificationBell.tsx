import { useCallback, useState, useEffect } from 'react'
import { Bell, Heart, MessageCircle, UserPlus, Megaphone, Check, AtSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import UserAvatar from './UserAvatar'
import Sheet from './Sheet'
import PalMark from './brand/PalMark'
import { useAuthStore } from '../store/authStore'

type AppNotification = {
  id: string
  type: 'like' | 'comment' | 'reply' | 'follow' | 'system' | 'mention'
  from_user_id: string
  related_id: string | null
  /** The comment a comment/reply refers to; null on older rows. */
  comment_id?: string | null
  read: boolean
  created_at: string
  from_profile: {
    username: string
    avatar_url: string | null
    avatar_crop?: { x: number; y: number; scale: number } | null
  } | null
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function notificationText(n: AppNotification): string {
  const username = n.from_profile?.username ?? 'Someone'
  switch (n.type) {
    case 'like':    return `@${username} liked your post`
    case 'comment': return `@${username} commented on your post`
    case 'reply':   return `@${username} replied to your comment`
    case 'follow':  return `@${username} started following you`
    case 'mention': return `@${username} mentioned you`
    case 'system':  return n.from_profile ? `@${username}: system update` : 'System update'
    default:        return 'New notification'
  }
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  const cls = 'mt-0.5 shrink-0'
  switch (type) {
    case 'like':    return <Heart size={16} className={`${cls} text-accent-soft`} />
    case 'comment': return <MessageCircle size={16} className={`${cls} text-muted`} />
    case 'reply':   return <MessageCircle size={16} className={`${cls} text-muted`} />
    case 'follow':  return <UserPlus size={16} className={`${cls} text-ok`} />
    case 'mention': return <AtSign size={16} className={`${cls} text-butter-300`} />
    case 'system':  return <Megaphone size={16} className={`${cls} text-butter-400`} />
    default:        return <Bell size={16} className={`${cls} text-muted`} />
  }
}

export default function NotificationBell() {
  const user = useAuthStore(state => state.user)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('notifications')
      .select(`*, from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url, avatar_crop)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) return
      return
    }

    const notifs = (data ?? []) as AppNotification[]
    setNotifications(notifs)
    setUnreadCount(notifs.filter(n => !n.read).length)
  }, [user])

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    const subscribe = () => supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchNotifications() }
      )
      .subscribe()

    let channel = subscribe()

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      fetchNotifications()
      const state = channel.state
      if (state === 'closed' || state === 'errored') {
        supabase.removeChannel(channel)
        channel = subscribe()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchNotifications, user])

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleNotifClick = (n: AppNotification) => {
    if (!n.read) markRead(n.id)
    if (n.related_id && (n.type === 'like' || n.type === 'comment' || n.type === 'reply')) {
      // related_id is the post. Landing on the feed and leaving people to hunt
      // for it defeats the notification — say which post, and for a comment or
      // reply open the thread so the thing being replied to is on screen.
      const wantsThread = n.type === 'comment' || n.type === 'reply'
      const params = new URLSearchParams({ post: n.related_id })
      if (wantsThread) params.set('comments', '1')
      // Older notifications predate comment_id and simply open the thread.
      if (wantsThread && n.comment_id) params.set('comment', n.comment_id)
      navigate(`/feed?${params}`)
    } else if (n.type === 'follow' && n.from_profile) {
      navigate(`/profile/${n.from_profile.username}`)
    }
    setOpen(false)
  }

  if (!user) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="app-icon-button relative"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-on">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <Sheet
          size="narrow"
          onClose={() => setOpen(false)}
          header={
            <div className="flex items-center justify-between gap-2 pt-1">
              <h2 className="text-lg font-semibold tracking-tight text-gray-50">Notifications</h2>
              {unreadCount > 0 && (
                <button type="button" className="app-button-ghost app-button-sm" onClick={markAllRead}>
                  <Check size={16} /> Mark all read
                </button>
              )}
            </div>
          }
          bodyClassName="!px-0"
        >
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <PalMark size={48} />
              <p className="text-sm text-muted">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotifClick(n)}
                className={`flex min-h-14 w-full items-start gap-3 border-b border-line-soft px-5 py-3 text-left last:border-0 hover:bg-surface-strong ${
                  !n.read ? 'bg-surface-sunken' : ''
                }`}
              >
                <span className="app-avatar h-10 w-10 text-sm">
                  <UserAvatar avatarUrl={n.from_profile?.avatar_url} avatarCrop={n.from_profile?.avatar_crop} username={n.from_profile?.username ?? '?'} />
                  {!n.from_profile?.avatar_url && (n.from_profile?.username?.[0] ?? '?').toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-1.5">
                    <NotifIcon type={n.type} />
                    <span className="text-sm leading-snug text-gray-200">{notificationText(n)}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted">{timeAgo(n.created_at)}</span>
                </span>
                {!n.read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                )}
              </button>
            ))
          )}
        </Sheet>
      )}
    </>
  )
}

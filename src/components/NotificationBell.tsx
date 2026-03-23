import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, Heart, MessageCircle, UserPlus, Megaphone, Check, AtSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import UserAvatar from './UserAvatar'
import { useAuthStore } from '../store/authStore'

type AppNotification = {
  id: string
  type: 'like' | 'comment' | 'reply' | 'follow' | 'system' | 'mention'
  from_user_id: string
  related_id: string | null
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
  const cls = 'w-4 h-4'
  switch (type) {
    case 'like':    return <Heart className={`${cls} text-red-400`} />
    case 'comment': return <MessageCircle className={`${cls} text-blue-400`} />
    case 'reply':   return <MessageCircle className={`${cls} text-purple-400`} />
    case 'follow':  return <UserPlus className={`${cls} text-green-400`} />
    case 'mention': return <AtSign className={`${cls} text-cyan-400`} />
    case 'system':  return <Megaphone className={`${cls} text-yellow-400`} />
    default:        return <Bell className={`${cls} text-gray-400`} />
  }
}

export default function NotificationBell({ dropUp = false }: { dropUp?: boolean }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    const interval = setInterval(fetchNotifications, 30000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotifications()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const fetchNotifications = async () => {
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
  }

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
      navigate('/feed')
    } else if (n.type === 'follow' && n.from_profile) {
      navigate(`/profile/${n.from_profile.username}`)
    }
    setOpen(false)
  }

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`relative transition-colors ${
          dropUp
            ? 'p-1 text-gray-500 hover:text-white'
            : 'p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800'
        } ${open && dropUp ? 'text-white' : ''}`}
        aria-label="Notifications"
      >
        <Bell className={dropUp ? 'w-6 h-6' : 'w-5 h-5'} strokeWidth={open && dropUp ? 2.5 : 2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel — full-screen sheet on mobile nav, dropdown on desktop */}
      {open && dropUp ? createPortal(
        /* Mobile: full-screen bottom sheet — rendered via portal to escape backdrop-filter stacking context */
        <div className="fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-150">
          {/* Backdrop */}
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
          {/* Sheet */}
          <div className="bg-gray-900 border-t border-gray-700 rounded-t-3xl flex flex-col h-[75vh] animate-in slide-in-from-bottom-4 duration-200 safe-area-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-700" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0">
              <span className="font-bold text-white text-base">Notifications</span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-gray-800 active:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0 ${
                      !n.read ? 'bg-gray-800/40' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                      <UserAvatar avatarUrl={n.from_profile?.avatar_url} avatarCrop={n.from_profile?.avatar_crop} username={n.from_profile?.username ?? '?'} />
                      {!n.from_profile?.avatar_url && (n.from_profile?.username?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5">
                        <NotifIcon type={n.type} />
                        <p className="text-sm text-gray-200 leading-snug">{notificationText(n)}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : open ? (
        /* Desktop: dropdown */
        <div className="absolute right-0 mt-2 w-80 max-h-[480px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-[200] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <span className="font-bold text-white text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0 ${
                    !n.read ? 'bg-gray-800/40' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    <UserAvatar avatarUrl={n.from_profile?.avatar_url} avatarCrop={n.from_profile?.avatar_crop} username={n.from_profile?.username ?? '?'} />
                    {!n.from_profile?.avatar_url && (n.from_profile?.username?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <NotifIcon type={n.type} />
                      <p className="text-sm text-gray-200 leading-snug">{notificationText(n)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

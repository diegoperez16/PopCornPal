import { useEffect, useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

type Notification = {
  id: string
  type: string
  from_user_id: string
  read: boolean
  created_at: string
  from_profile: {
    username: string
    avatar_url: string | null
  }
}

type NotificationWithFollow = Notification & {
  is_following_back: boolean
}

export default function NotificationBanner() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<NotificationWithFollow[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    try {
      // Get unread follow notifications
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('type', 'follow')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        // If notifications table doesn't exist yet, silently fail
        if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
          console.log('Notifications table not set up yet. Run notifications-schema.sql in Supabase.')
          return
        }
        throw error
      }

      // Check if we're following them back
      const notificationsWithFollowStatus = await Promise.all(
        (data || []).map(async (notif: any) => {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', notif.from_user_id)
            .maybeSingle()

          return {
            ...notif,
            is_following_back: !!followData,
          }
        })
      )

      setNotifications(notificationsWithFollowStatus as NotificationWithFollow[])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleFollowBack = async (fromUserId: string, notificationId: string) => {
    if (!user) return

    try {
      // Follow back
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: fromUserId })

      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_following_back: true, read: true } : n
      ))
    } catch (error) {
      console.error('Error following back:', error)
    }
  }

  const handleDismiss = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      setNotifications(notifications.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }

  const handleDismissAll = async () => {
    try {
      const notificationIds = notifications.map(n => n.id)
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds)

      setNotifications([])
      setVisible(false)
    } catch (error) {
      console.error('Error dismissing all:', error)
    }
  }

  if (!visible || notifications.length === 0) return null

  return (
    <div className="fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="app-panel rounded-2xl p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <span className="app-avatar h-10 w-10 text-sm">
              {notif.from_profile.username.charAt(0).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm text-gray-200">
                <span className="font-semibold text-gray-50">@{notif.from_profile.username}</span>
                {' '}started following you
              </p>

              {!notif.is_following_back ? (
                <button
                  type="button"
                  onClick={() => handleFollowBack(notif.from_user_id, notif.id)}
                  className="app-button-primary app-button-sm"
                >
                  <UserPlus size={16} />
                  Follow Back
                </button>
              ) : (
                <p className="text-xs text-muted">You're following each other</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(notif.id)}
              className="app-icon-button -mr-2 -mt-2"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}

      {notifications.length > 1 && (
        <button
          type="button"
          onClick={handleDismissAll}
          className="app-button-secondary w-full"
        >
          Dismiss All
        </button>
      )}
    </div>
  )
}

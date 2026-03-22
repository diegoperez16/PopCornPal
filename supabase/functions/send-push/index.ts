// Supabase Edge Function — send-push
//
// Deploy:  supabase functions deploy send-push
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
//
// Triggered by the DB trigger on notifications INSERT (see push-subscriptions-migration.sql),
// or called manually: POST /functions/v1/send-push { user_id, notification_id }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore — web-push ships CJS; ESM CDN repackages it
import webpush from 'https://esm.sh/web-push@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function notificationText(type: string, username: string): { body: string; url: string } {
  switch (type) {
    case 'like':    return { body: `@${username} liked your post`,           url: '/feed' }
    case 'comment': return { body: `@${username} commented on your post`,    url: '/feed' }
    case 'reply':   return { body: `@${username} replied to your comment`,   url: '/feed' }
    case 'follow':  return { body: `@${username} started following you`,     url: `/profile/${username}` }
    default:        return { body: 'You have a new notification',            url: '/activity' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, notification_id } = await req.json() as {
      user_id: string
      notification_id: string
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch notification + sender profile
    const { data: notif, error: nErr } = await supabase
      .from('notifications')
      .select('*, from_profile:profiles!notifications_from_user_id_fkey(username)')
      .eq('id', notification_id)
      .single()

    if (nErr || !notif) {
      return new Response('Notification not found', { status: 404, headers: corsHeaders })
    }

    // Fetch all push subscriptions for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (!subs?.length) {
      return new Response('No subscriptions', { status: 200, headers: corsHeaders })
    }

    const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

    webpush.setVapidDetails(
      'mailto:hello@popcornpal.app', // change to your contact email
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    const username = (notif.from_profile as { username: string } | null)?.username ?? 'Someone'
    const { body, url } = notificationText(notif.type as string, username)

    const payload = JSON.stringify({
      title: 'PopcornPal',
      body,
      url,
      type: notif.type,
    })

    // Send to all subscriptions; silently remove expired ones
    await Promise.allSettled(
      subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 410 || status === 404) {
            // Subscription expired — remove it
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      })
    )

    return new Response('OK', { status: 200, headers: corsHeaders })
  } catch (err) {
    console.error('[send-push]', err)
    return new Response('Internal error', { status: 500, headers: corsHeaders })
  }
})

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { feedKeys } from '../../lib/queryClient'
import { sendMentionNotifications } from '../../lib/mentions'
import type { Post } from '../../store/socialStore'
import type { Comment } from '../../components/feed/feedTypes'

const PAGE_SIZE = 20

// ─── Feed ───────────────────────────────────────────────────────────────────

async function fetchFeedPage(userId: string, offset: number): Promise<{ posts: Post[]; hasMore: boolean }> {
  await supabase.auth.getSession()

  // 1. Try optimised RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_feed', {
    p_user_id: userId,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  })

  if (!rpcError && rpcData) {
    const posts: Post[] = (rpcData as any[]).map(p => ({
      id: p.id,
      user_id: p.user_id,
      content: p.content,
      media_entry_id: p.media_entry_id,
      image_url: p.image_url,
      created_at: p.created_at,
      updated_at: p.updated_at ?? null,
      profiles: { username: p.username, avatar_url: p.avatar_url },
      media_entries: p.media_title
        ? { title: p.media_title, media_type: p.media_type, rating: p.media_rating, cover_image_url: p.media_cover_url }
        : undefined,
      likes_count: parseInt(p.likes_count) || 0,
      comments_count: parseInt(p.comments_count) || 0,
      is_liked: p.is_liked,
    }))
    return { posts, hasMore: rpcData.length === PAGE_SIZE }
  }

  // Skip fallback on network errors
  const isNetworkError = rpcError && (
    rpcError.message?.toLowerCase().includes('abort') ||
    rpcError.message?.toLowerCase().includes('fetch') ||
    rpcError.message?.toLowerCase().includes('network') ||
    rpcError.message?.toLowerCase().includes('failed')
  )
  if (isNetworkError) {
    console.warn('fetchFeedPage: network error, skipping fallback')
    return { posts: [], hasMore: false }
  }

  // 2. Fallback to standard query
  console.warn('RPC fetch failed, using fallback query', rpcError)

  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  const followingIds = followingData?.map(f => f.following_id) ?? []
  const limitedIds = followingIds.length > 50 ? followingIds.slice(0, 50) : followingIds

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (username, avatar_url),
      media_entries:media_entry_id (title, media_type, rating, cover_image_url),
      likes_count:post_likes(count),
      comments_count:post_comments(count)
    `)
    .in('user_id', [...limitedIds, userId])
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) throw error
  if (!data || data.length === 0) return { posts: [], hasMore: false }

  const postIds = data.map((p: any) => p.id)
  const { data: userLikes } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)

  const likedSet = new Set(userLikes?.map((l: any) => l.post_id))

  const posts: Post[] = data.map((post: any) => ({
    ...post,
    likes_count: post.likes_count?.[0]?.count ?? 0,
    comments_count: post.comments_count?.[0]?.count ?? 0,
    is_liked: likedSet.has(post.id),
  }))

  return { posts, hasMore: data.length === PAGE_SIZE }
}

export function useFeed(userId: string) {
  return useInfiniteQuery({
    queryKey: feedKeys.list(userId),
    queryFn: ({ pageParam }) => fetchFeedPage(userId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

// ─── Comments ───────────────────────────────────────────────────────────────

async function fetchComments(postId: string): Promise<{ rootComments: Comment[]; commentsMap: Map<string, Comment> }> {
  await supabase.auth.getSession()

  const { data, error } = await supabase
    .from('post_comments')
    .select(`*, profiles:user_id (username, avatar_url)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const commentsMap = new Map<string, Comment>()
  const rootComments: Comment[] = []

  ;(data ?? []).forEach((comment: any) => {
    commentsMap.set(comment.id, { ...comment, replies: [] })
  })

  ;(data ?? []).forEach((comment: any) => {
    const commentObj = commentsMap.get(comment.id)!
    if (comment.parent_comment_id) {
      const parent = commentsMap.get(comment.parent_comment_id)
      if (parent) {
        parent.replies = parent.replies || []
        parent.replies.push(commentObj)
      }
    } else {
      rootComments.push(commentObj)
    }
  })

  // Fetch comment likes — non-fatal if table doesn't exist yet
  if (data && data.length > 0) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const currentUserId = sessionData?.session?.user?.id

      const commentIds = data.map((c: any) => c.id)
      const allLikesPromise = supabase.from('comment_likes').select('comment_id').in('comment_id', commentIds)
      const userLikesPromise = currentUserId
        ? supabase.from('comment_likes').select('comment_id').eq('user_id', currentUserId).in('comment_id', commentIds)
        : Promise.resolve({ data: [], error: null })

      const [allLikesRes, userLikesRes] = await Promise.all([allLikesPromise, userLikesPromise])

      if (!allLikesRes.error && !userLikesRes.error) {
        const likedSet = new Set(userLikesRes.data?.map((l: any) => l.comment_id))
        const likeCounts = new Map<string, number>()
        allLikesRes.data?.forEach((l: any) => {
          likeCounts.set(l.comment_id, (likeCounts.get(l.comment_id) ?? 0) + 1)
        })
        commentsMap.forEach((c) => {
          c.likes_count = likeCounts.get(c.id) ?? 0
          c.is_liked = likedSet.has(c.id)
        })
      }
    } catch {
      // comment_likes table may not exist yet — skip silently
    }
  }

  return { rootComments, commentsMap }
}

export function useComments(postId: string | null) {
  return useQuery({
    queryKey: feedKeys.comments(postId ?? ''),
    queryFn: () => fetchComments(postId!),
    enabled: !!postId,
    staleTime: 60 * 1000,
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useToggleLike(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
        if (error) throw error
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.list(userId) })
      const previousData = queryClient.getQueryData(feedKeys.list(userId))

      queryClient.setQueryData(feedKeys.list(userId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: Post) =>
              p.id === postId
                ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
                : p
            ),
          })),
        }
      })

      return { previousData }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(feedKeys.list(userId), context.previousData)
      }
    },
  })
}

export function useCreatePost(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variables: { content: string; media_entry_id: string | null; image_url: string | null }) => {
      const { data, error } = await supabase.from('posts').insert({ user_id: userId, ...variables }).select('id').single()
      if (error) throw error
      if (data?.id && variables.content) {
        sendMentionNotifications(variables.content, userId, data.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(userId) })
    },
  })
}

export function useDeletePost(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(userId) })
    },
  })
}

export function useCreateComment(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variables: {
      postId: string
      content: string
      parent_comment_id: string | null
      image_url: string | null
    }) => {
      const { error } = await supabase.from('post_comments').insert({
        post_id: variables.postId,
        user_id: userId,
        content: variables.content,
        parent_comment_id: variables.parent_comment_id,
        image_url: variables.image_url,
      })
      if (error) throw error
      if (variables.content) {
        sendMentionNotifications(variables.content, userId, variables.postId)
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
      // Optimistically bump comment count in feed cache
      queryClient.setQueryData(feedKeys.list(userId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: Post) =>
              p.id === variables.postId ? { ...p, comments_count: p.comments_count + 1 } : p
            ),
          })),
        }
      })
    },
  })
}

export function useDeleteComment(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
      // Decrement comment count in feed cache
      queryClient.setQueryData(feedKeys.list(userId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: Post) =>
              p.id === variables.postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
            ),
          })),
        }
      })
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, content, userId }: { commentId: string; postId: string; content: string; userId: string }) => {
      const { error } = await supabase
        .from('post_comments')
        .update({ content })
        .eq('id', commentId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
    },
  })
}

export function useToggleCommentLike(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; postId: string; isLiked: boolean }) => {
      if (isLiked) {
        const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
        if (error) throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
    },
  })
}

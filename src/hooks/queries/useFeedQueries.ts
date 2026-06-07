import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { feedKeys, mediaKeys } from '../../lib/queryClient'
import { executeQueuedMutationOrRun } from '../../lib/offlineMutationQueue'
import { useAuthStore } from '../../store/authStore'
import {
  createComment as createCommentMutation,
  createPost as createPostMutation,
  deleteComment as deleteCommentMutation,
  deletePost as deletePostMutation,
  toggleCommentLike as toggleCommentLikeMutation,
  togglePostLike as togglePostLikeMutation,
  updateComment as updateCommentMutation,
} from '../../lib/userMutations'
import type { Post } from '../../store/socialStore'
import type { Comment } from '../../components/feed/feedTypes'
import type { MediaEntry } from './useMediaQueries'

const PAGE_SIZE = 20

type CommentsTree = {
  rootComments: Comment[]
  commentsMap: Map<string, Comment>
}

function cloneComment(comment: Comment): Comment {
  return {
    ...comment,
    profiles: { ...comment.profiles },
    replies: comment.replies?.map(cloneComment) ?? [],
  }
}

function cloneCommentsTree(tree: CommentsTree): CommentsTree {
  const rootComments = tree.rootComments.map(cloneComment)
  const commentsMap = new Map<string, Comment>()

  const register = (comments: Comment[]) => {
    comments.forEach((comment) => {
      commentsMap.set(comment.id, comment)
      if (comment.replies?.length) {
        register(comment.replies)
      }
    })
  }

  register(rootComments)
  return { rootComments, commentsMap }
}

function appendOptimisticComment(
  tree: CommentsTree | undefined,
  comment: Comment
): CommentsTree {
  const nextTree = tree
    ? cloneCommentsTree(tree)
    : { rootComments: [], commentsMap: new Map<string, Comment>() }

  if (comment.parent_comment_id) {
    const parent = nextTree.commentsMap.get(comment.parent_comment_id)
    if (parent) {
      parent.replies = [...(parent.replies ?? []), comment]
    } else {
      nextTree.rootComments.push(comment)
    }
  } else {
    nextTree.rootComments.push(comment)
  }

  nextTree.commentsMap.set(comment.id, comment)
  return nextTree
}

// ─── Single post fetch (for realtime prepend) ───────────────────────────────

export async function fetchSinglePost(postId: string, currentUserId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (username, avatar_url, avatar_crop),
      media_entries:media_entry_id (title, media_type, rating, cover_image_url),
      likes:post_likes(count),
      comments:post_comments(count)
    `)
    .eq('id', postId)
    .single()

  if (error || !data) return null

  const { data: likeData } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', currentUserId)
    .eq('post_id', postId)
    .maybeSingle()

  return {
    ...data,
    likes_count: (data as any).likes?.[0]?.count ?? 0,
    comments_count: (data as any).comments?.[0]?.count ?? 0,
    is_liked: !!likeData,
  } as Post
}

// ─── Feed ───────────────────────────────────────────────────────────────────

async function fetchFeedPage(userId: string, offset: number): Promise<{ posts: Post[]; hasMore: boolean }> {
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
      profiles: { username: p.username, avatar_url: p.avatar_url, avatar_crop: p.avatar_crop ?? null },
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
    throw rpcError
  }

  // 2. Fallback to standard query
  console.warn('RPC fetch failed, using fallback query', rpcError)

  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  const followingIds = followingData?.map(f => f.following_id) ?? []

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (username, avatar_url, avatar_crop),
      media_entries:media_entry_id (title, media_type, rating, cover_image_url),
      likes:post_likes(count),
      comments:post_comments(count)
    `)
    .in('user_id', [...followingIds, userId])
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
    likes_count: post.likes?.[0]?.count ?? 0,
    comments_count: post.comments?.[0]?.count ?? 0,
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
  })
}

// ─── Comments ───────────────────────────────────────────────────────────────

export async function fetchCommentsTree(
  postId: string,
  currentUserId: string | null
): Promise<CommentsTree> {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`*, profiles:user_id (username, avatar_url, avatar_crop)`)
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

export function useComments(postId: string | null, currentUserId: string | null) {
  return useQuery({
    queryKey: feedKeys.comments(postId ?? ''),
    queryFn: () => fetchCommentsTree(postId!, currentUserId),
    enabled: !!postId,
    staleTime: 2 * 60 * 1000,
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useToggleLike(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      return executeQueuedMutationOrRun(
        {
          kind: 'toggle-post-like',
          payload: { userId, postId, isLiked },
        },
        () => togglePostLikeMutation({ userId, postId, isLiked })
      )
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
      return executeQueuedMutationOrRun(
        {
          kind: 'create-post',
          payload: {
            userId,
            content: variables.content,
            media_entry_id: variables.media_entry_id,
            image_url: variables.image_url,
          },
        },
        () =>
          createPostMutation({
            userId,
            content: variables.content,
            media_entry_id: variables.media_entry_id,
            image_url: variables.image_url,
          })
      )
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.list(userId) })
      const previousData = queryClient.getQueryData(feedKeys.list(userId))
      const profile = useAuthStore.getState().profile
      const mediaEntries = queryClient.getQueryData<MediaEntry[]>(mediaKeys.entries(userId)) ?? []
      const selectedMediaEntry = variables.media_entry_id
        ? mediaEntries.find((entry) => entry.id === variables.media_entry_id)
        : undefined

      const optimisticPost: Post = {
        id: `offline-post-${crypto.randomUUID()}`,
        user_id: userId,
        content: variables.content,
        media_entry_id: variables.media_entry_id,
        image_url: variables.image_url,
        created_at: new Date().toISOString(),
        updated_at: null,
        profiles: {
          username: profile?.username ?? 'you',
          avatar_url: profile?.avatar_url ?? null,
          avatar_crop: profile?.avatar_crop ?? null,
        },
        media_entries: selectedMediaEntry
          ? {
              title: selectedMediaEntry.title,
              media_type: selectedMediaEntry.media_type,
              rating: selectedMediaEntry.rating,
              cover_image_url: selectedMediaEntry.cover_image_url ?? null,
            }
          : undefined,
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
      }

      queryClient.setQueryData(feedKeys.list(userId), (old: any) => {
        if (!old?.pages?.length) {
          return {
            pages: [{ posts: [optimisticPost], hasMore: false }],
            pageParams: [0],
          }
        }

        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              posts: [optimisticPost, ...old.pages[0].posts],
            },
            ...old.pages.slice(1),
          ],
        }
      })

      return { previousData }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(feedKeys.list(userId), context.previousData)
      }
    },
    onSuccess: (result) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: feedKeys.list(userId) })
      }
    },
  })
}

export function useDeletePost(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (postId: string) => {
      return executeQueuedMutationOrRun(
        {
          kind: 'delete-post',
          payload: { userId, postId },
        },
        () => deletePostMutation(userId, postId)
      )
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.list(userId) })
      const previousData = queryClient.getQueryData(feedKeys.list(userId))

      queryClient.setQueryData(feedKeys.list(userId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((post: Post) => post.id !== postId),
          })),
        }
      })

      return { previousData }
    },
    onError: (_error, _postId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(feedKeys.list(userId), context.previousData)
      }
    },
    onSuccess: (result) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: feedKeys.list(userId) })
      }
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
      return executeQueuedMutationOrRun(
        {
          kind: 'create-comment',
          payload: {
            userId,
            postId: variables.postId,
            content: variables.content,
            parent_comment_id: variables.parent_comment_id,
            image_url: variables.image_url,
          },
        },
        () =>
          createCommentMutation({
            userId,
            postId: variables.postId,
            content: variables.content,
            parent_comment_id: variables.parent_comment_id,
            image_url: variables.image_url,
          })
      )
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.comments(variables.postId) })
      await queryClient.cancelQueries({ queryKey: feedKeys.list(userId) })
      const previousComments = queryClient.getQueryData<CommentsTree>(feedKeys.comments(variables.postId))
      const previousFeed = queryClient.getQueryData(feedKeys.list(userId))
      const profile = useAuthStore.getState().profile
      const optimisticComment: Comment = {
        id: `offline-comment-${crypto.randomUUID()}`,
        user_id: userId,
        content: variables.content,
        image_url: variables.image_url,
        created_at: new Date().toISOString(),
        updated_at: null,
        parent_comment_id: variables.parent_comment_id,
        profiles: {
          username: profile?.username ?? 'you',
          avatar_url: profile?.avatar_url ?? null,
          avatar_crop: profile?.avatar_crop ?? null,
        },
        replies: [],
        likes_count: 0,
        is_liked: false,
      }

      queryClient.setQueryData(
        feedKeys.comments(variables.postId),
        (old: CommentsTree | undefined) => appendOptimisticComment(old, optimisticComment)
      )

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

      return { previousComments, previousFeed }
    },
    onError: (_error, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(feedKeys.comments(variables.postId), context.previousComments)
      } else {
        queryClient.removeQueries({ queryKey: feedKeys.comments(variables.postId), exact: true })
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(feedKeys.list(userId), context.previousFeed)
      } else {
        queryClient.removeQueries({ queryKey: feedKeys.list(userId), exact: true })
      }
    },
    onSuccess: (result, variables) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
      }
    },
  })
}

export function useDeleteComment(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      return executeQueuedMutationOrRun(
        {
          kind: 'delete-comment',
          payload: { userId, commentId },
        },
        () => deleteCommentMutation(userId, commentId)
      )
    },
    onSuccess: (result, variables) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
      }
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
      return executeQueuedMutationOrRun(
        {
          kind: 'update-comment',
          payload: { commentId, userId, content },
        },
        () => updateCommentMutation({ commentId, userId, content })
      )
    },
    onSuccess: (result, variables) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
      }
    },
  })
}

export function useToggleCommentLike(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; postId: string; isLiked: boolean }) => {
      return executeQueuedMutationOrRun(
        {
          kind: 'toggle-comment-like',
          payload: { userId, commentId, isLiked },
        },
        () => toggleCommentLikeMutation({ userId, commentId, isLiked })
      )
    },
    onSuccess: (result, variables) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) })
      }
    },
  })
}

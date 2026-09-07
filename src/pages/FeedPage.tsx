import { createDraftStorage } from '../lib/draftStorage'
import { useCallback, useEffect, useState, useLayoutEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/authStore'
import { type Post, useSocialStore } from '../store/socialStore'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUp, RefreshCw, WifiOff, Clapperboard, Plus, Users, ArrowRight } from 'lucide-react'

import { supabase } from '../lib/supabase'
import { type InfiniteData, useQueryClient } from '@tanstack/react-query'
import { feedKeys } from '../lib/queryClient'
import {
  useFeed,
  useToggleLike,
  useDeletePost,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
  useToggleCommentLike,
  useComments,
  fetchCommentsTree,
  fetchSinglePost,
  buildRealtimeComment,
  appendCommentToTree,
  removeCommentFromTree,
  setCommentLikeInTree,
  type CommentsTree,
} from '../hooks/queries/useFeedQueries'
import GifPicker from '../components/GifPicker'
import FeedSkeleton from '../components/FeedSkeleton'
import CommentComposer from '../components/feed/CommentComposer'
import CommentThread from '../components/feed/CommentThread'
import FeedComposer from '../components/feed/FeedComposer'
import FeedPostCard from '../components/feed/FeedPostCard'
import ThreadModal from '../components/feed/ThreadModal'
import { type Comment } from '../components/feed/feedTypes'
import { uploadPostImage } from '../lib/postImages'

type FeedPageChunk = {
  posts: Post[]
  hasMore: boolean
}

type FeedCache = InfiniteData<FeedPageChunk, number>

type OpenThreadEvent = Event & {
  detail: {
    comment: Comment
    postId: string
  }
}

type PostInsertPayload = { new?: { id?: string; user_id?: string } }
type PostDeletePayload = { old?: { id?: string } }
type PostLikeInsertPayload = { new?: { post_id?: string; user_id?: string } }
type PostLikeDeletePayload = { old?: { post_id?: string; user_id?: string } }
type CommentInsertPayload = {
  new?: {
    id?: string
    post_id?: string
    user_id?: string
    content?: string
    image_url?: string | null
    parent_comment_id?: string | null
    created_at?: string
    updated_at?: string | null
  }
}
type CommentDeletePayload = { old?: { id?: string; post_id?: string } }
type CommentLikeInsertPayload = { new?: { comment_id?: string; user_id?: string } }
type CommentLikeDeletePayload = { old?: { comment_id?: string; user_id?: string } }
type FollowChangePayload = {
  new?: { following_id?: string }
  old?: { following_id?: string }
}


export default function FeedPage() {
  const { user, profile } = useAuthStore(useShallow(s => ({ user: s.user, profile: s.profile })))
  const {
    feedScrollPos,
    setFeedScrollPos,
    feedVisibleCount: visiblePostsCount,
    setFeedVisibleCount: setVisiblePostsCount,
  } = useSocialStore(useShallow(s => ({
    feedScrollPos: s.feedScrollPos,
    setFeedScrollPos: s.setFeedScrollPos,
    feedVisibleCount: s.feedVisibleCount,
    setFeedVisibleCount: s.setFeedVisibleCount,
  })))

  const navigate = useNavigate()
  const storage = useMemo(() => createDraftStorage(user?.id ?? ''), [user?.id])
  const queryClient = useQueryClient()

  // Feed data from TQ
  const {
    data: feedData,
    isLoading: feedIsLoading,
    isError: feedIsError,
    refetch: refetchFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed(user?.id ?? '')

  const posts = feedData?.pages.flatMap(p => p.posts) ?? []
  const hasMore = !!hasNextPage

  const initialLoading = feedIsLoading && posts.length === 0

  // Active comments (only one post expanded at a time)
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const { data: activeComments = { rootComments: [], commentsMap: new Map() } } = useComments(expandedComments, user?.id ?? null)

  // Mutations
  const { mutate: doToggleLike } = useToggleLike(user?.id ?? '')
  const { mutate: deletePost } = useDeletePost(user?.id ?? '')
  const { mutateAsync: createComment, isPending: postingComment } = useCreateComment(user?.id ?? '')
  const { mutate: deleteComment } = useDeleteComment(user?.id ?? '')
  const { mutateAsync: updateComment } = useUpdateComment()
  const { mutate: toggleCommentLike } = useToggleCommentLike(user?.id ?? '')

  const [refreshing] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyImageUrl, setReplyImageUrl] = useState('')
  const [uploadedReplyImage, setUploadedReplyImage] = useState<string | null>(null)
  const [uploadingReplyImage, setUploadingReplyImage] = useState(false)
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [threadModalComment, setThreadModalComment] = useState<Comment | null>(null)
  const [threadModalPostId, setThreadModalPostId] = useState<string | null>(null)
  const [showModalReplyGifPicker, setShowModalReplyGifPicker] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // 1. Restore scroll position on mount
  useLayoutEffect(() => {
    if (feedScrollPos > 0) {
      window.scrollTo(0, feedScrollPos)
    }
  }, [feedScrollPos])

  // 2. Save scroll position ONLY on unmount
  useLayoutEffect(() => {
    return () => {
      setFeedScrollPos(window.scrollY)
    }
  }, [setFeedScrollPos])

  // Restore reply drafts on mount (top-level comment drafts are owned by CommentComposer)
  useEffect(() => {
    const savedReply = storage.getItem('popcorn_reply_draft')
    if (savedReply) setReplyText(savedReply)
    const savedReplyTo = storage.getItem('popcorn_reply_to')
    if (savedReplyTo) setReplyingTo(savedReplyTo)
    const savedReplyImgUrl = storage.getItem('popcorn_reply_img_url')
    if (savedReplyImgUrl) setReplyImageUrl(savedReplyImgUrl)
    const savedReplyUpload = storage.getItem('popcorn_reply_upload')
    if (savedReplyUpload) setUploadedReplyImage(savedReplyUpload)
  }, [storage])

  // Save Reply Draft
  useEffect(() => {
    storage.setItem('popcorn_reply_draft', replyText)
    if (replyingTo) storage.setItem('popcorn_reply_to', replyingTo)
    else storage.removeItem('popcorn_reply_to')
    if (replyImageUrl) storage.setItem('popcorn_reply_img_url', replyImageUrl)
    else storage.removeItem('popcorn_reply_img_url')
    if (uploadedReplyImage) {
      try { storage.setItem('popcorn_reply_upload', uploadedReplyImage) } catch { console.warn('Image too large to persist') }
    } else storage.removeItem('popcorn_reply_upload')
  }, [replyText, replyingTo, replyImageUrl, uploadedReplyImage, storage])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }

    let scrollRaf: number | null = null
    const handleScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        setShowScrollTop(window.scrollY > 400)
        scrollRaf = null
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    const handleOpenThread: EventListener = async (event) => {
      const { comment, postId } = (event as OpenThreadEvent).detail
      setThreadModalComment(comment)
      setThreadModalPostId(postId)
      if (navigator.onLine) {
        const result = await queryClient.fetchQuery({
          queryKey: feedKeys.comments(postId),
          queryFn: () => fetchCommentsTree(postId, user?.id ?? null),
        })
        if (result?.commentsMap) {
          const freshComment = result.commentsMap.get(comment.id)
          if (freshComment) setThreadModalComment(freshComment)
        }
      }
    }
    window.addEventListener('openThread', handleOpenThread)

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('openThread', handleOpenThread)
    }
  }, [user, navigate, queryClient])

  // Realtime: update the feed cache without full refetches. Keep the followed-user
  // set in memory so new post events don't perform an extra follows lookup.
  useEffect(() => {
    if (!user) return

    let followedUserIds = new Set<string>([user.id])
    let isActive = true

    const syncFollowedUserIds = async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (!isActive || error) return

      followedUserIds = new Set<string>([
        user.id,
        ...(data?.map((follow) => follow.following_id) ?? []),
      ])
    }

    void syncFollowedUserIds()

    const handleInsert = async (payload: PostInsertPayload) => {
      const row = payload.new
      if (!row?.id || !row?.user_id) return
      // Own posts are already prepended by the createPost mutation
      if (row.user_id === user.id) return

      if (!followedUserIds.has(row.user_id)) return

      const post = await fetchSinglePost(row.id, user.id)
      if (!post) return

      queryClient.setQueryData<FeedCache>(feedKeys.list(user.id), (old) => {
        if (!old?.pages?.length) return old
        // Deduplicate
        if (old.pages[0].posts.some((existingPost) => existingPost.id === post.id)) return old
        return {
          ...old,
          pages: [
            { ...old.pages[0], posts: [post, ...old.pages[0].posts] },
            ...old.pages.slice(1),
          ],
        }
      })
    }

    const handleDelete = (payload: PostDeletePayload) => {
      const deletedId = payload.old?.id
      if (!deletedId) return
      queryClient.setQueryData<FeedCache>(feedKeys.list(user.id), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.filter((post) => post.id !== deletedId),
          })),
        }
      })
    }

    const handleLikeInsert = (payload: PostLikeInsertPayload) => {
      const postId = payload.new?.post_id
      if (!postId || payload.new?.user_id === user.id) return // own likes handled optimistically
      queryClient.setQueryData<FeedCache>(feedKeys.list(user.id), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId ? { ...post, likes_count: post.likes_count + 1 } : post
            ),
          })),
        }
      })
    }

    const handleLikeDelete = (payload: PostLikeDeletePayload) => {
      const postId = payload.old?.post_id
      const likedUserId = payload.old?.user_id

      // Without REPLICA IDENTITY FULL on post_likes, payload.old only has {id}.
      // Fall back to invalidating the feed so counts stay correct.
      if (!postId) {
        queryClient.invalidateQueries({ queryKey: feedKeys.list(user.id) })
        return
      }

      if (likedUserId === user.id) return // own unlikes handled optimistically
      queryClient.setQueryData<FeedCache>(feedKeys.list(user.id), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId
                ? { ...post, likes_count: Math.max(0, post.likes_count - 1) }
                : post
            ),
          })),
        }
      })
    }

    const handleCommentInsert = async (payload: CommentInsertPayload) => {
      const row = payload.new
      const postId = row?.post_id
      const commentUserId = row?.user_id
      // Own comments are already handled optimistically by useCreateComment
      if (!postId || commentUserId === user.id) return

      // Bump the comments_count on the feed card.
      queryClient.setQueryData<FeedCache>(feedKeys.list(user.id), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post
            ),
          })),
        }
      })

      // If this post's thread is open, insert the new comment/reply live (not just
      // the count). Skip the profile fetch entirely when the thread isn't cached.
      const openThread = queryClient.getQueryData<CommentsTree>(feedKeys.comments(postId))
      if (!openThread || !row?.id || openThread.commentsMap.has(row.id)) return
      const comment = await buildRealtimeComment({
        id: row.id,
        user_id: commentUserId!,
        post_id: postId,
        content: row.content ?? '',
        image_url: row.image_url ?? null,
        parent_comment_id: row.parent_comment_id ?? null,
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? null,
      })
      queryClient.setQueryData<CommentsTree>(feedKeys.comments(postId), (old) =>
        old ? appendCommentToTree(old, comment) : old
      )
    }

    const handleCommentDelete = (payload: CommentDeletePayload) => {
      const postId = payload.old?.post_id
      const commentId = payload.old?.id
      if (!postId) {
        // No REPLICA IDENTITY FULL — can't determine which post, just invalidate
        queryClient.invalidateQueries({ queryKey: feedKeys.list(user.id) })
        return
      }
      queryClient.setQueryData<FeedCache>(feedKeys.list(user.id), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId
                ? { ...post, comments_count: Math.max(0, post.comments_count - 1) }
                : post
            ),
          })),
        }
      })

      // Remove it from the open thread too, if cached.
      if (commentId) {
        queryClient.setQueryData<CommentsTree>(feedKeys.comments(postId), (old) =>
          old ? removeCommentFromTree(old, commentId) : old
        )
      }
    }

    // Comment likes (#2): update likes_count / is_liked in whichever open thread
    // holds the comment. Own likes are handled by the toggle mutation, so skip them.
    const applyCommentLike = (commentId: string, delta: number) => {
      const threads = queryClient.getQueryCache().findAll({ queryKey: ['feed', 'comments'] })
      for (const cache of threads) {
        const tree = cache.state.data as CommentsTree | undefined
        if (tree?.commentsMap.has(commentId)) {
          queryClient.setQueryData(cache.queryKey, setCommentLikeInTree(tree, commentId, delta))
          break
        }
      }
    }

    const handleCommentLikeInsert = (payload: CommentLikeInsertPayload) => {
      const commentId = payload.new?.comment_id
      if (!commentId || payload.new?.user_id === user.id) return
      applyCommentLike(commentId, 1)
    }

    const handleCommentLikeDelete = (payload: CommentLikeDeletePayload) => {
      const commentId = payload.old?.comment_id
      if (!commentId || payload.old?.user_id === user.id) return
      applyCommentLike(commentId, -1)
    }

    const subscribeChannel = () => supabase
      .channel(`feed-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, handleInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, handleDelete)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, handleLikeInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_likes' }, handleLikeDelete)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, handleCommentInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_comments' }, handleCommentDelete)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comment_likes' }, handleCommentLikeInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comment_likes' }, handleCommentLikeDelete)
      .subscribe((status, err) => {
        if (err) console.error('[Feed] realtime error:', err)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Invalidate so the user isn't stuck with stale data
          queryClient.invalidateQueries({ queryKey: feedKeys.list(user.id) })
        }
      })

    const subscribeFollowsChannel = () => supabase
      .channel(`feed-follows-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'follows', filter: `follower_id=eq.${user.id}` },
        (payload: FollowChangePayload) => {
          const followingId = payload.new?.following_id
          if (followingId) followedUserIds.add(followingId)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'follows', filter: `follower_id=eq.${user.id}` },
        (payload: FollowChangePayload) => {
          const followingId = payload.old?.following_id
          if (followingId) {
            followedUserIds.delete(followingId)
          } else {
            void syncFollowedUserIds()
          }
        }
      )
      .subscribe()

    let channel = subscribeChannel()
    let followsChannel = subscribeFollowsChannel()

    // Resubscribe on visibility restore — WebSocket may have been dropped while backgrounded
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const state = channel.state
      if (state === 'closed' || state === 'errored') {
        supabase.removeChannel(channel)
        channel = subscribeChannel()
      }
      const followsState = followsChannel.state
      if (followsState === 'closed' || followsState === 'errored') {
        supabase.removeChannel(followsChannel)
        followsChannel = subscribeFollowsChannel()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isActive = false
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
      supabase.removeChannel(followsChannel)
    }
  }, [user, queryClient])

  const fetchFeed = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true)
      await fetchNextPage()
      setLoadingMore(false)
    }
  }, [fetchNextPage])

  // Legacy compat: fetchComments for ThreadModal onFetchComments prop
  const fetchComments = useCallback(async (postId: string) => {
    return queryClient.fetchQuery({
      queryKey: feedKeys.comments(postId),
      queryFn: () => fetchCommentsTree(postId, user?.id ?? null),
    })
  }, [queryClient, user?.id])

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this comment?')) return
    deleteComment({ commentId, postId })
  }

  const handleUpdateComment = async (commentId: string, postId: string) => {
    if (!user || !editText.trim()) return
    try {
      await updateComment({ commentId, postId, content: editText.trim(), userId: user.id })
      setEditingCommentId(null)
      setEditText('')
    } catch {
      alert('Failed to update comment')
    }
  }

  const handleLike = useCallback((postId: string, isLiked: boolean) => {
    if (!user) return
    doToggleLike({ postId, isLiked })
  }, [doToggleLike, user])

  const handleReply = async (postId: string, parentCommentId: string) => {
    const text = replyText
    const imgUrl = uploadedReplyImage || replyImageUrl
    if (!user || !text.trim()) return

    try {
      await createComment({
        postId,
        content: text.trim(),
        parent_comment_id: parentCommentId,
        image_url: imgUrl || null,
      })

      setReplyText('')
      setReplyingTo(null)
      setReplyImageUrl('')
      setUploadedReplyImage(null)
      storage.removeItem('popcorn_reply_draft')
      storage.removeItem('popcorn_reply_to')
      storage.removeItem('popcorn_reply_img_url')
      storage.removeItem('popcorn_reply_upload')
    } catch (error) {
      console.error('Error creating comment:', error)
      alert('Failed to post comment. Your draft is saved.')
    }
  }

  const handleCommentLike = async (commentId: string, postId: string) => {
    if (!user) return
    // Find current like status from activeComments
    const findInTree = (list: Comment[]): Comment | null => {
      for (const c of list) {
        if (c.id === commentId) return c
        if (c.replies?.length) { const found = findInTree(c.replies); if (found) return found }
      }
      return null
    }
    const comment = findInTree(activeComments.rootComments)
    const isLiked = comment?.is_liked ?? false
    toggleCommentLike({ commentId, postId, isLiked })
  }

  const handleReplyImageUpload = async (file: File) => {
    if (!user) return
    try {
      setUploadingReplyImage(true)
      setUploadedReplyImage(await uploadPostImage(user.id, file))
    } catch (error) {
      console.error('Error uploading reply image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingReplyImage(false)
    }
  }

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    alert('Link copied to clipboard!')
  }, [])

  const handleShare = useCallback(async (post: Post) => {
    const url = window.location.origin + '/feed'
    const text = `Check out this post by @${post.profiles.username} on PopcornPal!`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PopcornPal Post', text, url })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') copyToClipboard(url)
      }
    } else {
      copyToClipboard(url)
    }
  }, [copyToClipboard])

  const handleDeletePost = useCallback((postId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this post?')) return
    deletePost(postId, {
      onError: () => alert('Failed to delete post'),
    })
  }, [deletePost, user])

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments((current) => {
      if (current === postId) return null
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) })
      return postId
    })
  }, [queryClient])

  // Build a comments map for ThreadModal compatibility (keyed by postId)
  const commentsForModal: Record<string, Comment[]> = expandedComments
    ? { [expandedComments]: activeComments.rootComments }
    : {}

  if (initialLoading && posts.length === 0) {
    return <FeedSkeleton />
  }

  if (feedIsError && posts.length === 0) {
    return (
      <div className="min-h-screen bg-[#101113] text-white flex flex-col items-center justify-center gap-4 pb-20">
        <RefreshCw className="w-8 h-8 text-gray-500" />
        <p className="text-gray-400 text-sm">Something went wrong.</p>
        <button
          onClick={() => refetchFeed()}
          className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-full transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="app-page bg-[#101113] text-white">
      {/* Loading Bar */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-800">
          <div className="h-full bg-gradient-to-r from-red-500 to-pink-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
        </div>
      )}

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center text-xs text-red-200 flex items-center justify-center gap-2 safe-area-top">
          <WifiOff className="w-3 h-3" />
          You are offline. Some features may be unavailable.
        </div>
      )}


<div className="max-w-3xl mx-auto px-5 py-7 sm:py-10">
        <header className="mb-7">
          <p className="app-kicker mb-3">The good stuff is better together</p>
          <div className="flex items-end justify-between gap-4"><h1 className="app-title">Your front row<span className="text-[#ff8175]">.</span></h1><Link to="/people" className="app-icon-button" aria-label="Find your people"><Users size={20} /></Link></div>
          <p className="app-muted mt-3 text-sm leading-relaxed">A little less endless scrolling.<br className="sm:hidden" /> A few more stories worth sharing.</p>
        </header>
        <section className="feed-ticket mb-7 flex items-center gap-4 rounded-2xl p-5">
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#c4a980]/25 text-[#dcc59e]"><Clapperboard size={27} strokeWidth={1.3} /></div>
          <div className="flex-1"><p className="app-kicker text-[#cbb895]">Fresh out of the credits?</p><h2 className="font-serif text-xl text-[#ede0c9] mt-1.5">Make the movie night last.</h2><p className="text-xs text-[#b7afa3] mt-2">Log it. Rate it. Start a conversation.</p></div>
          <Link to="/add" aria-label="Log a title" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfc59f] text-[#33271e]"><Plus size={22} /></Link>
        </section>
        {user ? <FeedComposer userId={user.id} profile={profile} /> : null}

        {/* Feed section label */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5 mt-8"><h2 className="text-lg font-semibold tracking-tight">Around your circle</h2><span className="text-[10px] tracking-wide text-gray-400">THE LATEST</span></div>

        {/* Feed */}
        {posts.length === 0 ? (
          <div className="app-panel text-center rounded-2xl px-6 py-12">
            <Users className="mx-auto mb-4 text-[#e4c398]" size={30} strokeWidth={1.3} />
            <h3 className="text-xl font-semibold mb-3">Every great story needs an audience.</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">Find your friends, share a favorite, and let the conversation begin.</p>
            <Link to="/people" className="app-button-primary mt-6">Find your people <ArrowRight size={16} /></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.slice(0, visiblePostsCount).map((post, index) => (
              <FeedPostCard
                key={post.id}
                post={post}
                index={index}
                currentUserId={user?.id}
                isExpanded={expandedComments === post.id}
                onDeletePost={handleDeletePost}
                onLikePost={handleLike}
                onToggleComments={toggleComments}
                onSharePost={handleShare}
                expandedContent={expandedComments === post.id ? (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-3 expand-down">
                    {activeComments.rootComments.length > 0 && (
                      <div className="space-y-3 mb-4 fade-in">
                        {activeComments.rootComments.map((comment) => (
                          <CommentThread
                            key={comment.id}
                            comment={comment}
                            postId={post.id}
                            depth={0}
                            onReply={(commentId) => setReplyingTo(commentId)}
                            replyingTo={replyingTo}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            onSubmitReply={handleReply}
                            postingComment={postingComment}
                            replyImageUrl={replyImageUrl}
                            setReplyImageUrl={setReplyImageUrl}
                            onUploadReplyImage={handleReplyImageUpload}
                            uploadingReplyImage={uploadingReplyImage}
                            setShowReplyGifPicker={setShowReplyGifPicker}
                            currentUserId={user?.id}
                            onDelete={handleDeleteComment}
                            onEdit={(c) => {
                              setEditingCommentId(c.id)
                              setEditText(c.content)
                            }}
                            isEditing={editingCommentId === comment.id}
                            editText={editText}
                            setEditText={setEditText}
                            onUpdate={handleUpdateComment}
                            onCancelEdit={() => { setEditingCommentId(null); setEditText('') }}
                            onLike={(commentId) => handleCommentLike(commentId, post.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    {user && <CommentComposer postId={post.id} userId={user.id} />}
                  </div>
                ) : undefined}
              />
            ))}
          </div>
        )}

        {/* View More / Load More Buttons */}
        {!initialLoading && posts.length > 0 && (
          <>
            {visiblePostsCount < posts.length && (
              <div className="text-center py-6">
                <button
                  onClick={() => setVisiblePostsCount(visiblePostsCount + 10)}
                  className="bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 hover:border-gray-600 text-gray-300 font-medium px-8 py-2.5 rounded-full transition-all active:scale-95 text-sm"
                >
                  Show more
                </button>
              </div>
            )}
            {visiblePostsCount >= posts.length && hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={() => fetchFeed(true)}
                  disabled={loadingMore || isFetchingNextPage}
                  className="bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 hover:border-gray-600 text-gray-300 font-medium px-8 py-2.5 rounded-full transition-all active:scale-95 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {(loadingMore || isFetchingNextPage) ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-red-500 rounded-full animate-spin" />
                      Loading…
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* GIF Pickers */}
      {showReplyGifPicker && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowReplyGifPicker(false)}>
          <GifPicker onSelect={(gifUrl) => { setUploadedReplyImage(gifUrl); setReplyImageUrl(''); setShowReplyGifPicker(false) }} onClose={() => setShowReplyGifPicker(false)} />
        </div>
      )}

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-24 right-4 md:bottom-8 md:right-8 p-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-full shadow-lg shadow-red-500/30 z-40 hover:scale-110 transition-all duration-300 ${
          showScrollTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-16 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Thread Modal */}
      {threadModalComment && threadModalPostId && (
        <ThreadModal
          comment={threadModalComment}
          postId={threadModalPostId}
          replyingTo={replyingTo}
          replyText={replyText}
          setReplyText={setReplyText}
          replyImageUrl={replyImageUrl}
          setReplyImageUrl={setReplyImageUrl}
          uploadingReplyImage={uploadingReplyImage}
          postingComment={postingComment}
          editingCommentId={editingCommentId}
          setEditingCommentId={setEditingCommentId}
          editText={editText}
          setEditText={setEditText}
          currentUserId={user?.id}
          allComments={commentsForModal}
          showModalReplyGifPicker={showModalReplyGifPicker}
          setShowModalReplyGifPicker={setShowModalReplyGifPicker}
          onClose={() => { setThreadModalComment(null); setThreadModalPostId(null) }}
          onSetReplyingTo={setReplyingTo}
          onSetComment={setThreadModalComment}
          onSubmitComment={handleReply}
          onDeleteComment={handleDeleteComment}
          onUpdateComment={handleUpdateComment}
          onFetchComments={fetchComments}
          onUploadReplyImage={handleReplyImageUpload}
          onLikeComment={handleCommentLike}
        />
      )}
    </div>
  )
}

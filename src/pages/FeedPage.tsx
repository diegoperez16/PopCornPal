import { useCallback, useEffect, useState, useLayoutEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/authStore'
import { type Post, useSocialStore } from '../store/socialStore'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, Image as ImageIcon, RefreshCw, WifiOff, X } from 'lucide-react'

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
} from '../hooks/queries/useFeedQueries'
import { useMediaEntries } from '../hooks/queries/useMediaQueries'
import GifPicker from '../components/GifPicker'
import FeedSkeleton from '../components/FeedSkeleton'
import CommentThread from '../components/feed/CommentThread'
import FeedComposer from '../components/feed/FeedComposer'
import FeedPostCard from '../components/feed/FeedPostCard'
import ThreadModal from '../components/feed/ThreadModal'
import { type Comment, findImageLink } from '../components/feed/feedTypes'
import { useMentionAutocomplete } from '../hooks/useMentionAutocomplete'
import MentionDropdown from '../components/MentionDropdown'
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
type CommentInsertPayload = { new?: { post_id?: string; user_id?: string } }
type CommentDeletePayload = { old?: { post_id?: string } }
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

  // Media entries for media selector
  const { data: entries = [] } = useMediaEntries(user?.id ?? '')

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
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [commentImageUrl, setCommentImageUrl] = useState('')
  const [uploadedCommentImage, setUploadedCommentImage] = useState<string | null>(null)
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false)
  const [replyImageUrl, setReplyImageUrl] = useState('')
  const [uploadedReplyImage, setUploadedReplyImage] = useState<string | null>(null)
  const [uploadingReplyImage, setUploadingReplyImage] = useState(false)
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false)
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [threadModalComment, setThreadModalComment] = useState<Comment | null>(null)
  const [threadModalPostId, setThreadModalPostId] = useState<string | null>(null)
  const [showModalReplyGifPicker, setShowModalReplyGifPicker] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Mention autocomplete for each input
  const commentMention = useMentionAutocomplete()

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

  // Restore all drafts on mount
  useEffect(() => {
    const savedComment = localStorage.getItem('popcorn_comment_draft')
    if (savedComment) setCommentText(savedComment)
    const savedCommentImgUrl = localStorage.getItem('popcorn_comment_img_url')
    if (savedCommentImgUrl) setCommentImageUrl(savedCommentImgUrl)
    const savedCommentUpload = localStorage.getItem('popcorn_comment_upload')
    if (savedCommentUpload) setUploadedCommentImage(savedCommentUpload)
    const savedReply = localStorage.getItem('popcorn_reply_draft')
    if (savedReply) setReplyText(savedReply)
    const savedReplyTo = localStorage.getItem('popcorn_reply_to')
    if (savedReplyTo) setReplyingTo(savedReplyTo)
    const savedReplyImgUrl = localStorage.getItem('popcorn_reply_img_url')
    if (savedReplyImgUrl) setReplyImageUrl(savedReplyImgUrl)
    const savedReplyUpload = localStorage.getItem('popcorn_reply_upload')
    if (savedReplyUpload) setUploadedReplyImage(savedReplyUpload)
  }, [])

  // Save Comment Draft
  useEffect(() => {
    localStorage.setItem('popcorn_comment_draft', commentText)
    if (commentImageUrl) localStorage.setItem('popcorn_comment_img_url', commentImageUrl)
    else localStorage.removeItem('popcorn_comment_img_url')
    if (uploadedCommentImage) {
      try { localStorage.setItem('popcorn_comment_upload', uploadedCommentImage) } catch { console.warn('Image too large to persist') }
    } else localStorage.removeItem('popcorn_comment_upload')
  }, [commentText, commentImageUrl, uploadedCommentImage])

  // Save Reply Draft
  useEffect(() => {
    localStorage.setItem('popcorn_reply_draft', replyText)
    if (replyingTo) localStorage.setItem('popcorn_reply_to', replyingTo)
    else localStorage.removeItem('popcorn_reply_to')
    if (replyImageUrl) localStorage.setItem('popcorn_reply_img_url', replyImageUrl)
    else localStorage.removeItem('popcorn_reply_img_url')
    if (uploadedReplyImage) {
      try { localStorage.setItem('popcorn_reply_upload', uploadedReplyImage) } catch { console.warn('Image too large to persist') }
    } else localStorage.removeItem('popcorn_reply_upload')
  }, [replyText, replyingTo, replyImageUrl, uploadedReplyImage])

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

    const handleCommentInsert = (payload: CommentInsertPayload) => {
      const postId = payload.new?.post_id
      const commentUserId = payload.new?.user_id
      // Own comments are already handled optimistically by useCreateComment
      if (!postId || commentUserId === user.id) return
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
    }

    const handleCommentDelete = (payload: CommentDeletePayload) => {
      const postId = payload.old?.post_id
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
    }

    const subscribeChannel = () => supabase
      .channel(`feed-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, handleInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, handleDelete)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, handleLikeInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_likes' }, handleLikeDelete)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, handleCommentInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_comments' }, handleCommentDelete)
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
      staleTime: 0,
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

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    commentMention.handleTextChange(value, e.target.selectionStart ?? value.length)
    if (!commentImageUrl && !uploadedCommentImage) {
      const result = findImageLink(value)
      if (result) {
        setCommentImageUrl(result.renderableUrl)
        setCommentText(value.replace(result.foundLink, '').trim())
        return
      }
    }
    setCommentText(value)
  }

  const handleLike = useCallback((postId: string, isLiked: boolean) => {
    if (!user) return
    doToggleLike({ postId, isLiked })
  }, [doToggleLike, user])

  const handleComment = async (postId: string, parentCommentId: string | null = null) => {
    const text = parentCommentId ? replyText : commentText
    const imgUrl = parentCommentId ? (uploadedReplyImage || replyImageUrl) : (uploadedCommentImage || commentImageUrl)
    if (!user || !text.trim()) return

    try {
      await createComment({
        postId,
        content: text.trim(),
        parent_comment_id: parentCommentId,
        image_url: imgUrl || null,
      })

      if (parentCommentId) {
        setReplyText('')
        setReplyingTo(null)
        setReplyImageUrl('')
        setUploadedReplyImage(null)
        localStorage.removeItem('popcorn_reply_draft')
        localStorage.removeItem('popcorn_reply_to')
        localStorage.removeItem('popcorn_reply_img_url')
        localStorage.removeItem('popcorn_reply_upload')
        return
      }

      setCommentText('')
      setCommentImageUrl('')
      setUploadedCommentImage(null)
      localStorage.removeItem('popcorn_comment_draft')
      localStorage.removeItem('popcorn_comment_img_url')
      localStorage.removeItem('popcorn_comment_upload')
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

  const handleCommentImageUpload = async (file: File) => {
    if (!user) return
    try {
      setUploadingCommentImage(true)
      setUploadedCommentImage(await uploadPostImage(user.id, file))
    } catch (error) {
      console.error('Error uploading comment image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingCommentImage(false)
    }
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center justify-center gap-4 pb-20">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
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


<div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {user ? <FeedComposer userId={user.id} profile={profile} entries={entries} /> : null}

        {/* Feed section label */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-gray-700 font-semibold uppercase tracking-widest">Your Feed</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-gray-500 mb-2">Nothing here yet</p>
            <p className="text-gray-600">Follow people or create your first post above.</p>
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
                            onSubmitReply={handleComment}
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
                    <div className="mt-3 pl-3 border-l-2 border-gray-700/50">
                      <div className="flex items-end gap-2 bg-gray-900/50 border border-gray-600 rounded-3xl p-2 relative transition-all focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                        <MentionDropdown
                          users={commentMention.mention.users}
                          loading={commentMention.mention.loading}
                          query={commentMention.mention.query}
                          selectedIndex={commentMention.mention.selectedIndex}
                          onSelect={(username) => setCommentText(commentMention.selectUser(commentText, username))}
                        />
                        <div className="flex-1 min-w-0">
                          <textarea
                            value={commentText}
                            onChange={handleCommentChange}
                            onKeyDown={(e) => {
                              if (commentMention.mention.isOpen) {
                                if (e.key === 'ArrowUp') { e.preventDefault(); commentMention.moveUp(); return }
                                if (e.key === 'ArrowDown') { e.preventDefault(); commentMention.moveDown(); return }
                                if (e.key === 'Enter' && commentMention.mention.users.length > 0) {
                                  e.preventDefault()
                                  setCommentText(commentMention.selectUser(commentText, commentMention.mention.users[commentMention.mention.selectedIndex].username))
                                  return
                                }
                                if (e.key === 'Escape') { commentMention.close(); return }
                              }
                              if (e.key === 'Enter' && !e.shiftKey && !postingComment && commentText.trim()) {
                                e.preventDefault()
                                handleComment(post.id, null)
                              }
                            }}
                            placeholder="Write a comment..."
                            rows={1}
                            className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
                          />
                        </div>
                        <div className="flex items-center gap-1 pb-1">
                          <label htmlFor={`comment-image-${post.id}`} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full cursor-pointer transition-colors" title="Upload Image">
                            <ImageIcon className="w-4 h-4" />
                            <input type="file" accept="image/*,image/gif" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCommentImageUpload(file) }} className="hidden" id={`comment-image-${post.id}`} />
                          </label>
                          <button onClick={() => setShowCommentGifPicker(true)} className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-full transition-colors font-bold text-[10px]" title="Add GIF">
                            <span className="border border-current rounded px-1">GIF</span>
                          </button>
                          <button
                            onClick={() => handleComment(post.id, null)}
                            disabled={(!commentText.trim() && !commentImageUrl && !uploadedCommentImage && !uploadingCommentImage) || postingComment}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {(commentImageUrl || uploadedCommentImage || uploadingCommentImage) && (
                        <div className="mt-2 ml-2">
                          {uploadingCommentImage ? (
                            <div className="text-xs text-gray-400 flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                              Uploading image...
                            </div>
                          ) : (
                            <div className="relative inline-block group">
                              <img loading="lazy" decoding="async" src={uploadedCommentImage || commentImageUrl} alt="Comment attachment" className="h-20 rounded-lg border border-gray-700" />
                              <button
                                onClick={() => { setUploadedCommentImage(null); setCommentImageUrl('') }}
                                className="absolute -top-1 -right-1 p-0.5 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
      {showCommentGifPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowCommentGifPicker(false)}>
          <GifPicker onSelect={(gifUrl) => { setUploadedCommentImage(gifUrl); setCommentImageUrl(''); setShowCommentGifPicker(false) }} onClose={() => setShowCommentGifPicker(false)} />
        </div>
      )}
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
          onSubmitComment={handleComment}
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

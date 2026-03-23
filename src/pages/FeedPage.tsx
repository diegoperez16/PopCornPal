import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import UserAvatar from '../components/UserAvatar'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/authStore'
import { useSocialStore } from '../store/socialStore'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, User, Film, Tv, Gamepad2, Book, Clock, Image as ImageIcon, X, Trash2, ArrowUp, WifiOff, RefreshCw } from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { feedKeys } from '../lib/queryClient'
import {
  useFeed,
  useToggleLike,
  useCreatePost,
  useDeletePost,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
  useToggleCommentLike,
  useComments,
  fetchSinglePost,
} from '../hooks/queries/useFeedQueries'
import { useMediaEntries } from '../hooks/queries/useMediaQueries'
import GifPicker from '../components/GifPicker'
import FeedSkeleton from '../components/FeedSkeleton'
import CommentThread from '../components/feed/CommentThread'
import ThreadModal from '../components/feed/ThreadModal'
import MediaSelectorModal from '../components/feed/MediaSelectorModal'
import { type Comment, formatTimeAgo, findImageLink, wasEdited } from '../components/feed/feedTypes'
import { useMentionAutocomplete } from '../hooks/useMentionAutocomplete'
import MentionDropdown from '../components/MentionDropdown'
import { renderMentionText } from '../lib/mentions'


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
  const { data: activeComments = { rootComments: [], commentsMap: new Map() } } = useComments(expandedComments)

  // Mutations
  const { mutate: doToggleLike } = useToggleLike(user?.id ?? '')
  const { mutate: createPost, isPending: posting } = useCreatePost(user?.id ?? '')
  const { mutate: deletePost } = useDeletePost(user?.id ?? '')
  const { mutate: createComment, isPending: postingComment } = useCreateComment(user?.id ?? '')
  const { mutate: deleteComment } = useDeleteComment(user?.id ?? '')
  const { mutate: updateComment } = useUpdateComment()
  const { mutate: toggleCommentLike } = useToggleCommentLike(user?.id ?? '')

  const [refreshing] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [selectedMediaEntry, setSelectedMediaEntry] = useState<string | null>(null)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [commentImageUrl, setCommentImageUrl] = useState('')
  const [uploadedCommentImage, setUploadedCommentImage] = useState<string | null>(null)
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false)
  const [replyImageUrl, setReplyImageUrl] = useState('')
  const [uploadedReplyImage, setUploadedReplyImage] = useState<string | null>(null)
  const [uploadingReplyImage, setUploadingReplyImage] = useState(false)
  const [showPostGifPicker, setShowPostGifPicker] = useState(false)
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false)
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [threadModalComment, setThreadModalComment] = useState<Comment | null>(null)
  const [threadModalPostId, setThreadModalPostId] = useState<string | null>(null)
  const [showModalReplyGifPicker, setShowModalReplyGifPicker] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [mediaFilterType, setMediaFilterType] = useState<'all' | 'movie' | 'show' | 'game' | 'book'>('all')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Mention autocomplete for each input
  const postMention = useMentionAutocomplete()
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
    const savedPost = localStorage.getItem('popcorn_new_post_draft')
    if (savedPost) setNewPost(savedPost)
    const savedMedia = localStorage.getItem('popcorn_post_media')
    if (savedMedia) setSelectedMediaEntry(savedMedia)
    const savedImgUrl = localStorage.getItem('popcorn_post_img_url')
    if (savedImgUrl) setImageUrl(savedImgUrl)
    const savedUpload = localStorage.getItem('popcorn_post_upload')
    if (savedUpload) setUploadedImage(savedUpload)
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

  // Save Post Draft
  useEffect(() => {
    localStorage.setItem('popcorn_new_post_draft', newPost)
    if (selectedMediaEntry) localStorage.setItem('popcorn_post_media', selectedMediaEntry)
    else localStorage.removeItem('popcorn_post_media')
    if (imageUrl) localStorage.setItem('popcorn_post_img_url', imageUrl)
    else localStorage.removeItem('popcorn_post_img_url')
    if (uploadedImage) {
      try { localStorage.setItem('popcorn_post_upload', uploadedImage) } catch(e) { console.warn('Image too large to persist') }
    } else localStorage.removeItem('popcorn_post_upload')
  }, [newPost, selectedMediaEntry, imageUrl, uploadedImage])

  // Save Comment Draft
  useEffect(() => {
    localStorage.setItem('popcorn_comment_draft', commentText)
    if (commentImageUrl) localStorage.setItem('popcorn_comment_img_url', commentImageUrl)
    else localStorage.removeItem('popcorn_comment_img_url')
    if (uploadedCommentImage) {
      try { localStorage.setItem('popcorn_comment_upload', uploadedCommentImage) } catch(e) { console.warn('Image too large to persist') }
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
      try { localStorage.setItem('popcorn_reply_upload', uploadedReplyImage) } catch(e) { console.warn('Image too large to persist') }
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

    const handleOpenThread = async (event: any) => {
      const { comment, postId } = event.detail
      setThreadModalComment(comment)
      setThreadModalPostId(postId)
      if (navigator.onLine) {
        // Refetch comments so the thread modal has fresh data
        const result = await queryClient.fetchQuery({
          queryKey: feedKeys.comments(postId),
          queryFn: async () => {
            await supabase.auth.getSession()
            const { data, error } = await supabase
              .from('post_comments')
              .select(`*, profiles:user_id (username, avatar_url, avatar_crop)`)
              .eq('post_id', postId)
              .order('created_at', { ascending: true })
            if (error) throw error
            const commentsMap = new Map<string, Comment>()
            const rootComments: Comment[] = []
            ;(data ?? []).forEach((c: any) => commentsMap.set(c.id, { ...c, replies: [] }))
            ;(data ?? []).forEach((c: any) => {
              const obj = commentsMap.get(c.id)!
              if (c.parent_comment_id) {
                const parent = commentsMap.get(c.parent_comment_id)
                if (parent) { parent.replies = parent.replies || []; parent.replies.push(obj) }
              } else rootComments.push(obj)
            })
            return { rootComments, commentsMap }
          },
        })
        if (result?.commentsMap) {
          const freshComment = result.commentsMap.get(comment.id)
          if (freshComment) setThreadModalComment(freshComment)
        }
      }
    }
    window.addEventListener('openThread', handleOpenThread as EventListener)

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('openThread', handleOpenThread as EventListener)
    }
  }, [user?.id, navigate, queryClient])

  // Realtime: seamlessly update the feed cache without full refetches
  useEffect(() => {
    if (!user) return

    const handleInsert = async (payload: any) => {
      const row = payload.new
      if (!row?.id || !row?.user_id) return
      // Own posts are already prepended by the createPost mutation
      if (row.user_id === user.id) return

      // Only show posts from people we follow
      const { data: follow } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_id', row.user_id)
        .maybeSingle()
      if (!follow) return

      const post = await fetchSinglePost(row.id, user.id)
      if (!post) return

      queryClient.setQueryData(feedKeys.list(user.id), (old: any) => {
        if (!old?.pages?.length) return old
        // Deduplicate
        if (old.pages[0].posts.some((p: any) => p.id === post.id)) return old
        return {
          ...old,
          pages: [
            { ...old.pages[0], posts: [post, ...old.pages[0].posts] },
            ...old.pages.slice(1),
          ],
        }
      })
    }

    const handleDelete = (payload: any) => {
      const deletedId = payload.old?.id
      if (!deletedId) return
      queryClient.setQueryData(feedKeys.list(user.id), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: any) => p.id !== deletedId),
          })),
        }
      })
    }

    const handleLikeInsert = (payload: any) => {
      const postId = payload.new?.post_id
      if (!postId || payload.new?.user_id === user.id) return // own likes handled optimistically
      queryClient.setQueryData(feedKeys.list(user.id), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) =>
              p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
            ),
          })),
        }
      })
    }

    const handleLikeDelete = (payload: any) => {
      const postId = payload.old?.post_id
      const likedUserId = payload.old?.user_id

      // Without REPLICA IDENTITY FULL on post_likes, payload.old only has {id}.
      // Fall back to invalidating the feed so counts stay correct.
      if (!postId) {
        queryClient.invalidateQueries({ queryKey: feedKeys.list(user.id) })
        return
      }

      if (likedUserId === user.id) return // own unlikes handled optimistically
      queryClient.setQueryData(feedKeys.list(user.id), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) =>
              p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p
            ),
          })),
        }
      })
    }

    const channel = supabase
      .channel(`feed-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, handleInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, handleDelete)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, handleLikeInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_likes' }, handleLikeDelete)
      .subscribe((status, err) => {
        if (err) console.error('[Feed] realtime error:', err)
        else console.log('[Feed] realtime status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  const fetchFeed = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true)
      await fetchNextPage()
      setLoadingMore(false)
    }
  }

  // Legacy compat: fetchComments for ThreadModal onFetchComments prop
  const fetchComments = async (postId: string) => {
    const data = queryClient.getQueryData(feedKeys.comments(postId)) as { rootComments: Comment[]; commentsMap: Map<string, Comment> } | undefined
    queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) })
    return data ?? { rootComments: [], commentsMap: new Map() }
  }

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this comment?')) return
    deleteComment({ commentId, postId })
  }

  const handleUpdateComment = async (commentId: string, postId: string) => {
    if (!user || !editText.trim()) return
    updateComment({ commentId, postId, content: editText.trim(), userId: user.id }, {
      onSuccess: () => {
        setEditingCommentId(null)
        setEditText('')
      },
      onError: () => alert('Failed to update comment'),
    })
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

  const handleCreatePost = async () => {
    if (!user || !newPost.trim()) return
    createPost(
      { content: newPost.trim(), media_entry_id: selectedMediaEntry, image_url: uploadedImage || imageUrl.trim() || null },
      {
        onSuccess: () => {
          setNewPost('')
          setSelectedMediaEntry(null)
          setImageUrl('')
          setUploadedImage(null)
          setShowMediaSelector(false)
          localStorage.removeItem('popcorn_new_post_draft')
          localStorage.removeItem('popcorn_post_media')
          localStorage.removeItem('popcorn_post_img_url')
          localStorage.removeItem('popcorn_post_upload')
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
        onError: () => alert('Failed to post. Your draft is saved.'),
      }
    )
  }

  const handleLike = (postId: string) => {
    if (!user) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    doToggleLike({ postId, isLiked: post.is_liked })
  }

  const handleComment = async (postId: string, parentCommentId: string | null = null) => {
    const text = parentCommentId ? replyText : commentText
    const imgUrl = parentCommentId ? (uploadedReplyImage || replyImageUrl) : (uploadedCommentImage || commentImageUrl)
    if (!user || !text.trim()) return

    createComment(
      { postId, content: text.trim(), parent_comment_id: parentCommentId, image_url: imgUrl || null },
      {
        onSuccess: () => {
          if (parentCommentId) {
            setReplyText('')
            setReplyingTo(null)
            setReplyImageUrl('')
            setUploadedReplyImage(null)
            localStorage.removeItem('popcorn_reply_draft')
            localStorage.removeItem('popcorn_reply_to')
            localStorage.removeItem('popcorn_reply_img_url')
            localStorage.removeItem('popcorn_reply_upload')
          } else {
            setCommentText('')
            setCommentImageUrl('')
            setUploadedCommentImage(null)
            localStorage.removeItem('popcorn_comment_draft')
            localStorage.removeItem('popcorn_comment_img_url')
            localStorage.removeItem('popcorn_comment_upload')
          }
        },
      }
    )
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
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName)
      setUploadedCommentImage(publicUrl)
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
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName)
      setUploadedReplyImage(publicUrl)
    } catch (error) {
      console.error('Error uploading reply image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingReplyImage(false)
    }
  }

  const handleShare = async (post: { profiles: { username: string } }) => {
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
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Link copied to clipboard!')
  }

  const handleDeletePost = async (postId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this post?')) return
    deletePost(postId, {
      onError: () => alert('Failed to delete post'),
    })
  }

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    postMention.handleTextChange(value, e.target.selectionStart ?? value.length)
    if (!imageUrl && !uploadedImage) {
      const result = findImageLink(value)
      if (result) {
        setImageUrl(result.renderableUrl)
        setNewPost(value.replace(result.foundLink, '').trim())
        return
      }
    }
    setNewPost(value)
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'movie': return Film
      case 'show': return Tv
      case 'game': return Gamepad2
      case 'book': return Book
      default: return Film
    }
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            setUploadedImage(result)
            setImageUrl('')
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedImage(result)
      setImageUrl('')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
        {/* Create Post */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <UserAvatar avatarUrl={profile.avatar_url} avatarCrop={profile.avatar_crop} username={profile.username} />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="relative">
                <MentionDropdown
                  users={postMention.mention.users}
                  loading={postMention.mention.loading}
                  query={postMention.mention.query}
                  selectedIndex={postMention.mention.selectedIndex}
                  onSelect={(username) => setNewPost(postMention.selectUser(newPost, username))}
                  position="below"
                />
                <textarea
                  value={newPost}
                  onChange={handlePostChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (!postMention.mention.isOpen) return
                    if (e.key === 'ArrowUp') { e.preventDefault(); postMention.moveUp() }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); postMention.moveDown() }
                    else if (e.key === 'Enter' && postMention.mention.users.length > 0) {
                      e.preventDefault()
                      setNewPost(postMention.selectUser(newPost, postMention.mention.users[postMention.mention.selectedIndex].username))
                    }
                    else if (e.key === 'Escape') postMention.close()
                  }}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none text-lg min-h-[60px]"
                  rows={2}
                />
              </div>

              {selectedMediaEntry && (() => {
                const entry = entries.find(e => e.id === selectedMediaEntry)
                if (!entry) return null
                const Icon = getMediaIcon(entry.media_type)
                return (
                  <div className="mt-2 inline-flex items-center gap-2 bg-gray-900/80 border border-gray-600 rounded-lg p-2 pr-3 max-w-full">
                    {entry.cover_image_url ? (
                      <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="w-8 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-10 bg-gray-800 rounded flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <span className="text-sm text-gray-200 truncate font-medium">{entry.title}</span>
                    <button onClick={() => setSelectedMediaEntry(null)} className="text-gray-400 hover:text-white ml-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })()}

              {uploadedImage && (
                <div className="mt-3 relative inline-block">
                  <img loading="lazy" decoding="async" src={uploadedImage} alt="Upload preview" className="max-h-60 rounded-xl border border-gray-700" />
                  <button onClick={handleRemoveImage} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {imageUrl && (
                <div className="mt-3 relative inline-block">
                  <div className="flex items-center gap-2 bg-gray-900/80 p-3 rounded-xl border border-gray-700">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-300 truncate max-w-xs">{imageUrl}</span>
                    <button onClick={() => setImageUrl('')} className="text-gray-400 hover:text-white ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
                <div className="flex gap-1">
                  <button onClick={() => setShowMediaSelector(!showMediaSelector)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors" title="Add Media">
                    <Film className="w-5 h-5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="p-2 text-green-400 hover:bg-green-500/10 rounded-full transition-colors cursor-pointer" title="Upload Image">
                    <ImageIcon className="w-5 h-5" />
                  </label>
                  <button onClick={() => setShowPostGifPicker(true)} className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-full transition-colors flex items-center justify-center font-bold text-xs" title="Add GIF">
                    <span className="border border-current rounded px-1 py-0.5">GIF</span>
                  </button>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={(!newPost.trim() && !selectedMediaEntry && !uploadedImage && !imageUrl) || posting}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-1.5 rounded-full text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-red-500/20"
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed section label */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-gray-800" />
          <span className="text-[11px] text-gray-600 font-semibold uppercase tracking-widest">Your Feed</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-700 to-gray-800" />
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
              <div
                key={post.id}
                className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/60 rounded-2xl p-3 sm:p-4 fade-in hover:border-gray-600/80 hover:bg-gray-800/60 transition-all duration-200"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Post Header */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {post.profiles.avatar_url ? (
                      <UserAvatar avatarUrl={post.profiles.avatar_url} avatarCrop={post.profiles.avatar_crop} username={post.profiles.username} />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link to={`/profile/${post.profiles.username}`} className="font-semibold hover:text-red-400 transition-colors inline-block">
                      @{post.profiles.username}
                    </Link>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(post.created_at)}
                      {wasEdited(post.created_at, post.updated_at) && (
                        <span className="text-gray-600 italic">(edited)</span>
                      )}
                    </p>
                  </div>
                  {post.user_id === user?.id && (
                    <button onClick={() => handleDeletePost(post.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700/50 rounded-lg transition-colors" title="Delete post">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <p className="text-gray-200 leading-relaxed mb-2.5 whitespace-pre-wrap text-sm">{renderMentionText(post.content)}</p>

                {/* Image */}
                {post.image_url && (
                  <div className="mb-2.5 rounded-xl overflow-hidden">
                    <img src={post.image_url} alt="Post attachment" className="w-full max-h-[360px] object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                )}

                {/* Media Entry */}
                {post.media_entries && (
                  <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-2.5 mb-2.5 flex items-center gap-2.5 hover:border-gray-600/60 transition-colors">
                    {post.media_entries.cover_image_url && (
                      <div className="w-10 h-14 flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                        <img src={post.media_entries.cover_image_url} alt={post.media_entries.title} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      </div>
                    )}
                    {!post.media_entries.cover_image_url && (() => {
                      const Icon = getMediaIcon(post.media_entries!.media_type)
                      return <Icon className="w-5 h-5 text-red-400 flex-shrink-0" />
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{post.media_entries.title}</p>
                      <p className="text-sm text-gray-400 capitalize">{post.media_entries.media_type}</p>
                    </div>
                    {post.media_entries.rating && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-yellow-400">★</span>
                        <span className="font-semibold">{post.media_entries.rating}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-1 pt-2 border-t border-gray-800/80">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                      post.is_liked ? 'bg-red-500/15 text-red-400' : 'text-gray-500 hover:bg-gray-700/50 hover:text-gray-300'
                    }`}
                  >
                    <Heart className={`w-4 h-4 transition-all duration-200 ${post.is_liked ? 'fill-current heart-animate' : ''}`} />
                    {post.likes_count > 0 && <span>{post.likes_count}</span>}
                  </button>
                  <button
                    onClick={() => {
                      if (expandedComments === post.id) {
                        setExpandedComments(null)
                      } else {
                        setExpandedComments(post.id)
                        queryClient.invalidateQueries({ queryKey: feedKeys.comments(post.id) })
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                      expandedComments === post.id ? 'bg-blue-500/15 text-blue-400' : 'text-gray-500 hover:bg-gray-700/50 hover:text-gray-300'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count > 0 && <span>{post.comments_count}</span>}
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => handleShare(post)} className="p-1.5 text-gray-600 hover:text-gray-300 rounded-full hover:bg-gray-700/50 transition-colors active:scale-95">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments === post.id && (
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
                )}
              </div>
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
      {showPostGifPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowPostGifPicker(false)}>
          <GifPicker onSelect={(gifUrl) => { setUploadedImage(gifUrl); setImageUrl(''); setShowPostGifPicker(false) }} onClose={() => setShowPostGifPicker(false)} />
        </div>
      )}
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
      {showMediaSelector && (
        <MediaSelectorModal
          entries={entries}
          mediaSearchQuery={mediaSearchQuery}
          setMediaSearchQuery={setMediaSearchQuery}
          mediaFilterType={mediaFilterType}
          setMediaFilterType={setMediaFilterType}
          onSelect={(id) => { setSelectedMediaEntry(id); setShowMediaSelector(false) }}
          onClose={() => setShowMediaSelector(false)}
        />
      )}
    </div>
  )
}

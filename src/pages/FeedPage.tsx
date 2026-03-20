import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore } from '../store/mediaStore'
import { useSocialStore, type Post } from '../store/socialStore'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, User, Film, Tv, Gamepad2, Book, Clock, Image as ImageIcon, X, Trash2, ArrowUp, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GifPicker from '../components/GifPicker'
import FeedSkeleton from '../components/FeedSkeleton'
import CommentThread from '../components/feed/CommentThread'
import ThreadModal from '../components/feed/ThreadModal'
import MediaSelectorModal from '../components/feed/MediaSelectorModal'
import { type Comment, formatTimeAgo, findImageLink, wasEdited } from '../components/feed/feedTypes'

const FEED_STALE_MS = 10 * 60 * 1000 // 10 minutes

export default function FeedPage() {
  const { user, profile } = useAuthStore()
  const { entries, fetchEntries } = useMediaStore()
  const {
    feedPosts: posts,
    setFeedPosts: setPosts,
    feedLoaded,
    feedLastFetched,
    feedScrollPos,
    setFeedScrollPos,
    feedVisibleCount: visiblePostsCount,
    setFeedVisibleCount: setVisiblePostsCount,
    hasMore: storeHasMore,
    fetchFeed: storeFetchFeed,
    toggleLike,
    subscribeToFeed,
    unsubscribeFromFeed,
  } = useSocialStore()

  const navigate = useNavigate()
  
  // Show skeleton only if we've never loaded feed data before.
  // If feedLoaded=true (restored from localStorage), trust it — posts will populate momentarily.
  const [initialLoading, setInitialLoading] = useState(!feedLoaded)

  // Refs so the effect can read latest values without re-running on every change
  const feedLoadedRef = useRef(feedLoaded)
  const feedLastFetchedRef = useRef(feedLastFetched)
  const postsLengthRef = useRef(posts.length)
  feedLoadedRef.current = feedLoaded
  feedLastFetchedRef.current = feedLastFetched
  postsLengthRef.current = posts.length
  
  const [refreshing, setRefreshing] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [selectedMediaEntry, setSelectedMediaEntry] = useState<string | null>(null)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [commentImageUrl, setCommentImageUrl] = useState('')
  const [uploadedCommentImage, setUploadedCommentImage] = useState<string | null>(null)
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false)
  // Removed unused commentImageInputRef
  const [replyImageUrl, setReplyImageUrl] = useState('')
  const [uploadedReplyImage, setUploadedReplyImage] = useState<string | null>(null)
  const [uploadingReplyImage, setUploadingReplyImage] = useState(false)
  const [showPostGifPicker, setShowPostGifPicker] = useState(false)
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false)
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false)
  // const [hasMore, setHasMore] = useState(true) // Removed local hasMore
  const [loadingMore, setLoadingMore] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  // const [visiblePostsCount, setVisiblePostsCount] = useState(5)
  const [threadModalComment, setThreadModalComment] = useState<Comment | null>(null)
  const [threadModalPostId, setThreadModalPostId] = useState<string | null>(null)
  const [showModalReplyGifPicker, setShowModalReplyGifPicker] = useState(false)
  const lastFetchRef = useRef<number>(0)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [mediaFilterType, setMediaFilterType] = useState<'all' | 'movie' | 'show' | 'game' | 'book'>('all')
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

  // ... [Persistence effects remain unchanged] ...
  // --- PERSISTENCE: Restore all drafts on mount ---
  useEffect(() => {
    // 1. Main Post
    const savedPost = localStorage.getItem('popcorn_new_post_draft')
    if (savedPost) setNewPost(savedPost)
    
    const savedMedia = localStorage.getItem('popcorn_post_media')
    if (savedMedia) setSelectedMediaEntry(savedMedia)
    
    const savedImgUrl = localStorage.getItem('popcorn_post_img_url')
    if (savedImgUrl) setImageUrl(savedImgUrl)

    const savedUpload = localStorage.getItem('popcorn_post_upload')
    if (savedUpload) setUploadedImage(savedUpload)

    // 2. Comments
    const savedComment = localStorage.getItem('popcorn_comment_draft')
    if (savedComment) setCommentText(savedComment)

    const savedCommentImgUrl = localStorage.getItem('popcorn_comment_img_url')
    if (savedCommentImgUrl) setCommentImageUrl(savedCommentImgUrl)
    
    const savedCommentUpload = localStorage.getItem('popcorn_comment_upload')
    if (savedCommentUpload) setUploadedCommentImage(savedCommentUpload)

    // 3. Replies
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
    localStorage.setItem('popcorn_new_post_draft', newPost)
  }, [newPost])

  // ... inside FeedPage component

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }

    const needsFetch = !feedLoadedRef.current || postsLengthRef.current === 0
    if (needsFetch) {
      fetchFeed().finally(() => setInitialLoading(false))
    } else {
      setInitialLoading(false)
      // Silent background refresh if data is stale
      if (Date.now() - feedLastFetchedRef.current > FEED_STALE_MS && !isOffline) {
        fetchFeed(false, true)
      }
    }

    // Safety timer: never stay stuck in any loading state more than 8 seconds
    const safetyTimer = setTimeout(() => {
      setInitialLoading(false)
      setRefreshing(false)
    }, 8000)

    // Subscribe to realtime feed updates
    if (!isOffline) subscribeToFeed(user.id)

    // Fetch the user's media library in the background
    if (!isOffline) fetchEntries(user.id)

    // Visibility change: when PWA returns from background, check staleness
    const handleVisibilityChange = () => {
      // Always clear any stuck loading state when tab becomes visible
      setInitialLoading(false)
      if (document.visibilityState === 'visible' && !isOffline) {
        if (Date.now() - feedLastFetchedRef.current > FEED_STALE_MS) {
          // Ping auth first — browsers throttle background timers so Supabase's
          // internal token-refresh timer may not have fired. getSession() triggers
          // a refresh if the access token is stale, ensuring the data fetch succeeds.
          supabase.auth.getSession().finally(() => fetchFeed(false, true))
        }
        // Do NOT call subscribeToFeed here — Supabase WebSocket reconnects automatically.
        // Re-subscribing on every tab focus tears down and rebuilds the channel, which
        // interferes with in-flight data fetches and causes the "wonky" loading state.
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)

    const handleOpenThread = async (event: any) => {
      const { comment, postId } = event.detail
      setThreadModalComment(comment)
      setThreadModalPostId(postId)
      if (!isOffline) {
        const result = await fetchComments(postId)
        if (result && result.commentsMap) {
          const freshComment = result.commentsMap.get(comment.id)
          if (freshComment) setThreadModalComment(freshComment)
        }
      }
    }
    window.addEventListener('openThread', handleOpenThread as EventListener)

    return () => {
      clearTimeout(safetyTimer)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('openThread', handleOpenThread as EventListener)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      unsubscribeFromFeed()
    }
  // Only re-run when user identity or offline status changes — not on every post update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isOffline])

  const fetchFeed = async (loadMore = false, silent = false) => {
    if (!user || isOffline) return

    if (loadMore) {
      setLoadingMore(true)
    } else if (!silent) {
      setRefreshing(true)
    }

    lastFetchRef.current = Date.now()

    try {
      const offset = loadMore ? postsLengthRef.current : 0
      const limit = loadMore ? 20 : Math.max(5, visiblePostsCount)

      await storeFetchFeed(user.id, limit, offset)

      // Auto-reveal newly loaded posts so user doesn't need to click "Show more"
      if (loadMore) {
        setVisiblePostsCount(prev => prev + 20)
      }
    } catch (error) {
      console.error('Error fetching feed:', error)
    } finally {
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p))
      await fetchComments(postId)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  const handleUpdateComment = async (commentId: string, postId: string) => {
    if (!user || !editText.trim()) return

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: editText.trim() })
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error

      setEditingCommentId(null)
      setEditText('')
      await fetchComments(postId)
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Failed to update comment')
    }
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    
    // GIF Link Detection
    if (!commentImageUrl && !uploadedCommentImage) {
      const result = findImageLink(value)
      
      if (result) {
        setCommentImageUrl(result.renderableUrl)
        // Remove link from text
        const newValue = value.replace(result.foundLink, '').trim()
        setCommentText(newValue)
        return
      }
    }
    setCommentText(value)
  }


  const handleCreatePost = async () => {
    if (!user || !newPost.trim()) return
    
    try {
      setPosting(true)
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPost.trim(),
          media_entry_id: selectedMediaEntry,
          image_url: uploadedImage || imageUrl.trim() || null
        })

      if (error) throw error
      
      // Clear State
      setNewPost('')
      setSelectedMediaEntry(null)
      setImageUrl('')
      setUploadedImage(null)
      setShowMediaSelector(false)

      // Clear Persistence
      localStorage.removeItem('popcorn_new_post_draft')
      localStorage.removeItem('popcorn_post_media')
      localStorage.removeItem('popcorn_post_img_url')
      localStorage.removeItem('popcorn_post_upload')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await fetchFeed()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to post. Your draft is saved.')
    } finally {
      setPosting(false)
    }
  }

  const handleLike = (postId: string) => {
    if (!user) return 
    toggleLike(postId, user.id)
  }

  const handleComment = async (postId: string, parentCommentId: string | null = null) => {
    const text = parentCommentId ? replyText : commentText
    const imageUrl = parentCommentId ? (uploadedReplyImage || replyImageUrl) : (uploadedCommentImage || commentImageUrl)
    
    if (!user || !text.trim()) return

    try {
      setPostingComment(true)
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: text.trim(),
          parent_comment_id: parentCommentId,
          image_url: imageUrl || null
        })

      if (error) throw error

      if (parentCommentId) {
        // Clear Reply State
        setReplyText('')
        setReplyingTo(null)
        setReplyImageUrl('')
        setUploadedReplyImage(null)
        
        // Clear Reply Persistence
        localStorage.removeItem('popcorn_reply_draft')
        localStorage.removeItem('popcorn_reply_to')
        localStorage.removeItem('popcorn_reply_img_url')
        localStorage.removeItem('popcorn_reply_upload')
      } else {
        // Clear Comment State
        setCommentText('')
        setCommentImageUrl('')
        setUploadedCommentImage(null)
        
        // Clear Comment Persistence
        localStorage.removeItem('popcorn_comment_draft')
        localStorage.removeItem('popcorn_comment_img_url')
        localStorage.removeItem('popcorn_comment_upload')
      }
      
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      )
      
      await fetchComments(postId)
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setPostingComment(false)
    }
  }

  const handleCommentImageUpload = async (file: File) => {
    if (!user) return

    try {
      setUploadingCommentImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName)

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
      
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName)

      setUploadedReplyImage(publicUrl)
    } catch (error) {
      console.error('Error uploading reply image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingReplyImage(false)
    }
  }

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const commentsMap = new Map<string, Comment>()
      const rootComments: Comment[] = []

      data.forEach((comment: any) => {
        commentsMap.set(comment.id, { ...comment, replies: [] })
      })

      data.forEach((comment: any) => {
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
      if (user && data.length > 0) {
        try {
          const commentIds = data.map((c: any) => c.id)
          const [userLikesRes, allLikesRes] = await Promise.all([
            supabase.from('comment_likes').select('comment_id').eq('user_id', user.id).in('comment_id', commentIds),
            supabase.from('comment_likes').select('comment_id').in('comment_id', commentIds),
          ])
          if (!userLikesRes.error && !allLikesRes.error) {
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
          // comment_likes table may not exist yet — skip likes data silently
        }
      }

      setComments(prev => ({
        ...prev,
        [postId]: rootComments
      }))

      return { rootComments, commentsMap }
    } catch (error) {
      console.error('Error fetching comments:', error)
      return { rootComments: [], commentsMap: new Map() }
    }
  }

  const handleCommentLike = async (commentId: string, postId: string) => {
    if (!user) return

    const updateTree = (list: Comment[], liked: boolean, delta: number): Comment[] =>
      list.map(c => {
        if (c.id === commentId) return { ...c, is_liked: liked, likes_count: (c.likes_count ?? 0) + delta }
        if (c.replies?.length) return { ...c, replies: updateTree(c.replies, liked, delta) }
        return c
      })

    const findInTree = (list: Comment[]): Comment | null => {
      for (const c of list) {
        if (c.id === commentId) return c
        if (c.replies?.length) { const found = findInTree(c.replies); if (found) return found }
      }
      return null
    }

    const wasLiked = findInTree(comments[postId] ?? [])?.is_liked ?? false

    setComments(prev => ({ ...prev, [postId]: updateTree(prev[postId] ?? [], !wasLiked, wasLiked ? -1 : 1) }))

    try {
      if (wasLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
      }
    } catch (error) {
      console.error('Error toggling comment like:', error)
      setComments(prev => ({ ...prev, [postId]: updateTree(prev[postId] ?? [], wasLiked, wasLiked ? 1 : -1) }))
    }
  }

  const handleShare = async (post: Post) => {
    const url = window.location.origin + '/feed'
    const text = `Check out this post by @${post.profiles.username} on PopcornPal!`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PopcornPal Post',
          text: text,
          url: url
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(url)
        }
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
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id)

      if (error) throw error
      
      await fetchFeed()
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`

    // GIF Link Detection
    if (!imageUrl && !uploadedImage) {
      const result = findImageLink(value)
      
      if (result) {
        setImageUrl(result.renderableUrl)
        // Remove link from text
        const newValue = value.replace(result.foundLink, '').trim()
        setNewPost(newValue)
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

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (initialLoading && posts.length === 0) {
    return <FeedSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      {/* Loading Bar - Shows when fetching in background */}
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
        {/* ... (Rest of UI identical to previous file) ... */}
        {/* Create Post */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={handlePostChange}
                onPaste={handlePaste}
                placeholder="What's on your mind?"
                className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none text-lg min-h-[60px]"
                rows={2}
              />
              
              {selectedMediaEntry && (() => {
                const entry = entries.find(e => e.id === selectedMediaEntry)
                if (!entry) return null
                const Icon = getMediaIcon(entry.media_type)
                return (
                  <div className="mt-2 inline-flex items-center gap-2 bg-gray-900/80 border border-gray-600 rounded-lg p-2 pr-3 max-w-full">
                    {entry.cover_image_url ? (
                        <img src={entry.cover_image_url} alt="" className="w-8 h-10 object-cover rounded" />
                    ) : (
                        <div className="w-8 h-10 bg-gray-800 rounded flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                    <span className="text-sm text-gray-200 truncate font-medium">{entry.title}</span>
                    <button
                      onClick={() => setSelectedMediaEntry(null)}
                      className="text-gray-400 hover:text-white ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })()}

              {uploadedImage && (
                <div className="mt-3 relative inline-block">
                  <img 
                    src={uploadedImage} 
                    alt="Upload preview" 
                    className="max-h-60 rounded-xl border border-gray-700"
                  />
                   <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

               {imageUrl && (
                <div className="mt-3 relative inline-block">
                  <div className="flex items-center gap-2 bg-gray-900/80 p-3 rounded-xl border border-gray-700">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-300 truncate max-w-xs">{imageUrl}</span>
                    <button
                      onClick={() => setImageUrl('')}
                      className="text-gray-400 hover:text-white ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowMediaSelector(!showMediaSelector)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors tooltip-trigger"
                    title="Add Media"
                  >
                    <Film className="w-5 h-5" />
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="p-2 text-green-400 hover:bg-green-500/10 rounded-full transition-colors cursor-pointer"
                    title="Upload Image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </label>
                  
                  <button
                    onClick={() => setShowPostGifPicker(true)}
                    className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-full transition-colors flex items-center justify-center font-bold text-xs"
                    title="Add GIF"
                  >
                     <span className="border border-current rounded px-1 py-0.5">GIF</span>
                  </button>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={!newPost.trim() && !selectedMediaEntry && !uploadedImage && !imageUrl || posting}
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
                      <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link 
                      to={`/profile/${post.profiles.username}`}
                      className="font-semibold hover:text-red-400 transition-colors inline-block"
                    >
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
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700/50 rounded-lg transition-colors"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <p className="text-gray-200 leading-relaxed mb-2.5 whitespace-pre-wrap text-sm">{post.content}</p>

                {/* Image */}
                {post.image_url && (
                  <div className="mb-2.5 rounded-xl overflow-hidden">
                    <img
                      src={post.image_url}
                      alt="Post attachment"
                      className="w-full max-h-[360px] object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Media Entry */}
                {post.media_entries && (
                  <div className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-2.5 mb-2.5 flex items-center gap-2.5 hover:border-gray-600/60 transition-colors">
                    {post.media_entries.cover_image_url && (
                      <div className="w-10 h-14 flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                        <img 
                          src={post.media_entries.cover_image_url} 
                          alt={post.media_entries.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    {!post.media_entries.cover_image_url && (() => {
                      const Icon = getMediaIcon(post.media_entries.media_type)
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
                      post.is_liked
                        ? 'bg-red-500/15 text-red-400'
                        : 'text-gray-500 hover:bg-gray-700/50 hover:text-gray-300'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 transition-all duration-200 ${
                        post.is_liked ? 'fill-current heart-animate' : ''
                      }`}
                    />
                    {post.likes_count > 0 && <span>{post.likes_count}</span>}
                  </button>
                  <button
                    onClick={() => {
                      if (expandedComments === post.id) {
                        setExpandedComments(null)
                      } else {
                        setExpandedComments(post.id)
                        fetchComments(post.id)
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                      expandedComments === post.id
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'text-gray-500 hover:bg-gray-700/50 hover:text-gray-300'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count > 0 && <span>{post.comments_count}</span>}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleShare(post)}
                    className="p-1.5 text-gray-600 hover:text-gray-300 rounded-full hover:bg-gray-700/50 transition-colors active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments === post.id && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-3 expand-down">
                    {/* Comments List */}
                    {comments[post.id] && comments[post.id].length > 0 && (
                      <div className="space-y-3 mb-4 fade-in">{comments[post.id].map((comment) => (
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
                            onCancelEdit={() => {
                              setEditingCommentId(null)
                              setEditText('')
                            }}
                            onLike={(commentId) => handleCommentLike(commentId, post.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    <div className="mt-3 pl-3 border-l-2 border-gray-700/50">
                       <div className="flex items-end gap-2 bg-gray-900/50 border border-gray-600 rounded-3xl p-2 relative transition-all focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                          <div className="flex-1 min-w-0">
                            <textarea
                              value={commentText}
                              onChange={handleCommentChange}
                              onKeyDown={(e) => {
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

                          {/* Actions inside the pill */}
                          <div className="flex items-center gap-1 pb-1">
                             <label 
                                htmlFor={`comment-image-${post.id}`}
                                className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full cursor-pointer transition-colors"
                                title="Upload Image"
                              >
                                <ImageIcon className="w-4 h-4" />
                                <input
                                  type="file"
                                  accept="image/*,image/gif"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleCommentImageUpload(file)
                                  }}
                                  className="hidden"
                                  id={`comment-image-${post.id}`}
                                />
                              </label>
                              <button
                                onClick={() => setShowCommentGifPicker(true)}
                                className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-full transition-colors font-bold text-[10px]"
                                title="Add GIF"
                              >
                                <span className="border border-current rounded px-1">GIF</span>
                              </button>
                              <button
                                onClick={() => handleComment(post.id, null)}
                                disabled={!commentText.trim() && !commentImageUrl && !uploadedCommentImage && !uploadingCommentImage || postingComment}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                          </div>
                       </div>

                      {/* Preview Images in Comment */}
                      {(commentImageUrl || uploadedCommentImage || uploadingCommentImage) && (
                         <div className="mt-2 ml-2">
                           {uploadingCommentImage ? (
                              <div className="text-xs text-gray-400 flex items-center gap-2">
                                 <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                                 Uploading image...
                              </div>
                           ) : (
                              <div className="relative inline-block group">
                                 <img 
                                   src={uploadedCommentImage || commentImageUrl} 
                                   alt="Comment attachment" 
                                   className="h-20 rounded-lg border border-gray-700" 
                                 />
                                 <button
                                    onClick={() => {
                                      setUploadedCommentImage(null)
                                      setCommentImageUrl('')
                                    }}
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
            {/* View More - Show if there are more posts already loaded but not visible */}
            {visiblePostsCount < posts.length && (
              <div className="text-center py-6">
                <button
                  onClick={() => setVisiblePostsCount(prev => prev + 10)}
                  className="bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 hover:border-gray-600 text-gray-300 font-medium px-8 py-2.5 rounded-full transition-all active:scale-95 text-sm"
                >
                  Show more
                </button>
              </div>
            )}
            
            {/* Load More - Fetch from server when all loaded posts are visible */}
            {visiblePostsCount >= posts.length && storeHasMore && (
              <div className="text-center py-6">
                <button
                  onClick={() => fetchFeed(true)}
                  disabled={loadingMore}
                  className="bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 hover:border-gray-600 text-gray-300 font-medium px-8 py-2.5 rounded-full transition-all active:scale-95 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingMore ? (
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
          <GifPicker
            onSelect={(gifUrl) => {
              setUploadedImage(gifUrl)
              setImageUrl('')
              setShowPostGifPicker(false)
            }}
            onClose={() => setShowPostGifPicker(false)}
          />
        </div>
      )}
      
      {showCommentGifPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowCommentGifPicker(false)}>
          <GifPicker
            onSelect={(gifUrl) => {
              setUploadedCommentImage(gifUrl)
              setCommentImageUrl('')
              setShowCommentGifPicker(false)
            }}
            onClose={() => setShowCommentGifPicker(false)}
          />
        </div>
      )}
      
      {showReplyGifPicker && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowReplyGifPicker(false)}>
          <GifPicker
            onSelect={(gifUrl) => {
              setUploadedReplyImage(gifUrl)
              setReplyImageUrl('')
              setShowReplyGifPicker(false)
            }}
            onClose={() => setShowReplyGifPicker(false)}
          />
        </div>
      )}

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-24 right-4 md:bottom-8 md:right-8 p-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-full shadow-lg shadow-red-500/30 z-40 hover:scale-110 transition-all duration-300 ${
          showScrollTop 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 translate-y-16 pointer-events-none'
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
          allComments={comments}
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

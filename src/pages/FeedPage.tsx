import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore } from '../store/mediaStore'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, User, Film, Tv, Gamepad2, Book, Clock, Image as ImageIcon, X, Trash2, ArrowUp, RefreshCw, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GifPicker from '../components/GifPicker'

// --- Types ---

interface Post {
  id: string
  user_id: string
  content: string
  media_entry_id: string | null
  image_url: string | null
  created_at: string
  profiles: {
    username: string
    avatar_url: string | null
  }
  media_entries?: {
    title: string
    media_type: 'movie' | 'show' | 'game' | 'book'
    rating: number
    cover_image_url: string | null
  }
  likes_count: number
  comments_count: number
  is_liked: boolean
}

interface Comment {
  id: string
  user_id: string
  content: string
  image_url: string | null
  created_at: string
  parent_comment_id: string | null
  profiles: {
    username: string
    avatar_url: string | null
  }
  replies?: Comment[]
}

// --- Helper Functions ---

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

// --- Components ---

type CommentThreadProps = {
  comment: Comment
  postId: string
  depth: number
  onReply: (commentId: string) => void
  replyingTo: string | null
  replyText: string
  setReplyText: (text: string) => void
  onSubmitReply: (postId: string, parentCommentId: string) => void
  postingComment: boolean
  replyImageUrl: string
  setReplyImageUrl: (url: string) => void
  onUploadReplyImage: (file: File, commentId: string) => Promise<void>
  uploadingReplyImage: boolean
  setShowReplyGifPicker: (show: boolean) => void
}

function CommentThread({ 
  comment, 
  postId, 
  depth, 
  onReply, 
  replyingTo, 
  replyText, 
  setReplyText, 
  onSubmitReply, 
  postingComment,
  replyImageUrl,
  setReplyImageUrl,
  onUploadReplyImage,
  uploadingReplyImage,
  setShowReplyGifPicker
}: CommentThreadProps) {
  const hasReplies = comment.replies && comment.replies.length > 0

  return (
    <div className={`${depth > 0 ? 'ml-6 mt-3' : ''}`}>
      <div className="flex gap-3">
        <div className={`${depth > 0 ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
          {comment.profiles.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xs font-bold">
              {comment.profiles.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <Link 
              to={`/user/${comment.profiles.username}`}
              className="text-sm font-semibold text-white hover:text-red-400 transition-colors inline-block mb-1"
            >
              @{comment.profiles.username}
            </Link>
            <p className="text-sm text-gray-300">{comment.content}</p>
            
            {/* Comment Image */}
            {comment.image_url && (
              <div className="mt-2">
                <img 
                  src={comment.image_url} 
                  alt="Comment attachment" 
                  className="max-w-full rounded-lg max-h-64 object-contain"
                />
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-gray-500">
                {formatTimeAgo(comment.created_at)}
              </p>
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Reply
              </button>
              {hasReplies && depth === 0 && (
                <button
                  onClick={() => {
                    const event = new CustomEvent('openThread', { detail: { comment, postId } })
                    window.dispatchEvent(event)
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !postingComment && replyText.trim()) {
                      onSubmitReply(postId, comment.id)
                    }
                  }}
                  placeholder={`Reply to @${comment.profiles.username}...`}
                  className="flex-1 px-3 py-2 text-sm bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => onSubmitReply(postId, comment.id)}
                  disabled={!replyText.trim() || postingComment}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reply
                </button>
              </div>
              
              {/* Image Upload for Reply */}
              <div className="flex gap-2 text-sm">
                <input
                  type="file"
                  accept="image/*,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onUploadReplyImage(file, comment.id)
                  }}
                  className="hidden"
                  id={`reply-image-${comment.id}`}
                />
                <label 
                  htmlFor={`reply-image-${comment.id}`}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  {uploadingReplyImage ? 'Uploading...' : 'Image'}
                </label>
                <button
                  onClick={() => setShowReplyGifPicker(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  GIF
                </button>
                <input
                  type="url"
                  value={replyImageUrl}
                  onChange={(e) => setReplyImageUrl(e.target.value)}
                  placeholder="Or paste image/GIF URL"
                  className="flex-1 px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Show first-level replies only (depth 0), hide deeper nesting */}
          {comment.replies && comment.replies.length > 0 && depth === 0 && (
            <div></div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { user } = useAuthStore()
  const { entries, fetchEntries } = useMediaStore()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
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
  const commentImageInputRef = useRef<HTMLInputElement>(null)
  const [replyImageUrl, setReplyImageUrl] = useState('')
  const [uploadedReplyImage, setUploadedReplyImage] = useState<string | null>(null)
  const [uploadingReplyImage, setUploadingReplyImage] = useState(false)
  const [isLiking, setIsLiking] = useState<Record<string, boolean>>({})
  const [showPostGifPicker, setShowPostGifPicker] = useState(false)
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false)
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [visiblePostsCount, setVisiblePostsCount] = useState(5)
  const [threadModalComment, setThreadModalComment] = useState<Comment | null>(null)
  const [threadModalPostId, setThreadModalPostId] = useState<string | null>(null)
  const [showModalReplyGifPicker, setShowModalReplyGifPicker] = useState(false)
  const lastFetchRef = useRef<number>(0)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // --- PERSISTENCE: Restore drafted post on mount ---
  useEffect(() => {
    const savedDraft = localStorage.getItem('popcorn_new_post_draft')
    if (savedDraft) {
      setNewPost(savedDraft)
    }
  }, [])

  // --- PERSISTENCE: Save draft on change ---
  useEffect(() => {
    localStorage.setItem('popcorn_new_post_draft', newPost)
  }, [newPost])

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
    
    if (!isOffline || posts.length === 0) {
      fetchFeed().finally(() => setInitialLoading(false))
    } else {
      setInitialLoading(false)
    }
    
    if (user && !isOffline) fetchEntries(user.id)

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh if more than 60 seconds have passed to prevent spamming
        if (Date.now() - lastFetchRef.current > 60000 && !isOffline) { 
          console.log('Tab visible - refreshing feed')
          fetchFeed()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleOpenThread = async (event: any) => {
      const { comment, postId } = event.detail
      setThreadModalComment(comment)
      setThreadModalPostId(postId)
      
      if (!isOffline) {
        const result = await fetchComments(postId)
        if (result && result.commentsMap) {
          const freshComment = result.commentsMap.get(comment.id)
          if (freshComment) {
            setThreadModalComment(freshComment)
          }
        }
      }
    }
    window.addEventListener('openThread', handleOpenThread as EventListener)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('openThread', handleOpenThread as EventListener)
    }
  }, [user, navigate, fetchEntries, isOffline])

  const fetchFeed = async (loadMore = false) => {
    if (!user || isOffline) return
    
    if (loadMore) {
      setLoadingMore(true)
    } else {
      setRefreshing(true)
    }

    lastFetchRef.current = Date.now()
    
    try {
      const offset = loadMore ? posts.length : 0
      const limit = loadMore ? 20 : 10

      // 1. Try Optimized RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_feed', { 
          p_user_id: user.id, 
          p_limit: limit, 
          p_offset: offset 
      })

      if (!rpcError && rpcData) {
        const formattedPosts: Post[] = (rpcData as any[]).map(p => ({
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          media_entry_id: p.media_entry_id,
          image_url: p.image_url,
          created_at: p.created_at,
          profiles: {
            username: p.username,
            avatar_url: p.avatar_url
          },
          media_entries: p.media_title ? {
            title: p.media_title,
            media_type: p.media_type,
            rating: p.media_rating,
            cover_image_url: p.media_cover_url
          } : undefined,
          likes_count: parseInt(p.likes_count) || 0,
          comments_count: parseInt(p.comments_count) || 0,
          is_liked: p.is_liked
        }))

        if (loadMore) {
          setPosts(prev => [...prev, ...formattedPosts])
        } else {
          setPosts(formattedPosts)
        }
        
        setHasMore(rpcData.length === limit)
        if (!loadMore) setVisiblePostsCount(10)
        return
      }

      // 2. Fallback to Standard Query
      console.warn('RPC fetch failed, using fallback query', rpcError)
      
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
      
      const followingIds = followingData?.map(f => f.following_id) || []
      const limitedFollowingIds = followingIds.length > 50 ? followingIds.slice(0, 50) : followingIds
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          media_entries:media_entry_id (title, media_type, rating, cover_image_url)
        `)
        .in('user_id', [...limitedFollowingIds, user.id])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      
      if (!data || data.length === 0) {
        if (!loadMore) setPosts([])
        setHasMore(false)
        return
      }

      const postIds = data.map(p => p.id)
      const { data: allLikes } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds)
      const { data: allComments } = await supabase.from('post_comments').select('post_id').in('post_id', postIds)
      
      const likesMap = new Map()
      const commentsMap = new Map()
      
      postIds.forEach(id => {
        likesMap.set(id, { count: 0, userLiked: false })
        commentsMap.set(id, 0)
      })
      
      allLikes?.forEach((like: any) => {
        const curr = likesMap.get(like.post_id)
        if (curr) {
          curr.count++
          if (like.user_id === user.id) curr.userLiked = true
        }
      })
      
      allComments?.forEach((c: any) => {
        commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1)
      })

      const postsWithCounts = data.map((post: any) => ({
        ...post,
        likes_count: likesMap.get(post.id)?.count || 0,
        comments_count: commentsMap.get(post.id) || 0,
        is_liked: likesMap.get(post.id)?.userLiked || false
      }))

      if (loadMore) {
        setPosts(prev => [...prev, ...postsWithCounts])
      } else {
        setPosts(postsWithCounts)
      }
      setHasMore(data.length === limit)
      if (!loadMore) setVisiblePostsCount(10)

    } catch (error) {
      console.error('Error fetching feed:', error)
    } finally {
      setRefreshing(false)
      setLoadingMore(false)
    }
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
      
      setNewPost('')
      localStorage.removeItem('popcorn_new_post_draft')
      setSelectedMediaEntry(null)
      setImageUrl('')
      setUploadedImage(null)
      setShowMediaSelector(false)
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

  const handleLike = async (postId: string) => {
    if (!user || isLiking[postId]) return 
    
    const post = posts.find(p => p.id === postId)
    if (!post) return

    setIsLiking(prev => ({ ...prev, [postId]: true }))

    const wasLiked = post.is_liked
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              is_liked: !p.is_liked,
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
            }
          : p
      )
    )

    try {
      if (wasLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id })
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                is_liked: wasLiked,
                likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1
              }
            : p
        )
      )
    } finally {
      setTimeout(() => {
        setIsLiking(prev => ({ ...prev, [postId]: false }))
      }, 300)
    }
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
        setReplyText('')
        setReplyingTo(null)
        setReplyImageUrl('')
        setUploadedReplyImage(null)
      } else {
        setCommentText('')
        setCommentImageUrl('')
        setUploadedCommentImage(null)
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

      {/* Full Screen Loading Animation */}
      {initialLoading && (
        <div className="fixed inset-0 z-40 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-8 relative flex items-center justify-center gap-6">
              <Film className="w-16 h-16 text-red-500 animate-[spin_3s_linear_infinite]" />
              <div className="relative">
                <Heart className="w-20 h-20 text-pink-500 animate-bounce" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
              </div>
              <Gamepad2 className="w-16 h-16 text-red-500 animate-[spin_3s_linear_infinite_reverse]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                Loading your feed...
              </h2>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Create Post */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 mb-6">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            onPaste={handlePaste}
            placeholder="Share what you're watching, playing, or reading..."
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={3}
          />
          
          {selectedMediaEntry && (() => {
            const entry = entries.find(e => e.id === selectedMediaEntry)
            if (!entry) return null
            const Icon = getMediaIcon(entry.media_type)
            return (
              <div className="mt-3 flex items-center gap-2 bg-gray-900/50 border border-gray-600 rounded-lg p-3">
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-300 flex-1">{entry.title}</span>
                <button
                  onClick={() => setSelectedMediaEntry(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })()}

          {uploadedImage && (
            <div className="mt-3 bg-gray-900/50 border border-gray-600 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <img 
                    src={uploadedImage} 
                    alt="Upload preview" 
                    className="w-full max-h-60 object-contain rounded-lg"
                  />
                </div>
                <button
                  onClick={handleRemoveImage}
                  className="text-gray-400 hover:text-white flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {imageUrl && (
            <div className="mt-3 bg-gray-900/50 border border-gray-600 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ImageIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{imageUrl}</p>
                </div>
                <button
                  onClick={() => setImageUrl('')}
                  className="text-gray-400 hover:text-white flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Media Selector Modal */}
          {showMediaSelector && (
            <div className="mt-3 bg-gray-900/50 border border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Select from your activity</h3>
                <button
                  onClick={() => setShowMediaSelector(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {entries.length === 0 ? (
                <p className="text-sm text-gray-400">No media entries yet. Add some first!</p>
              ) : (
                <div className="space-y-2">
                  {entries.slice(0, 10).map(entry => {
                    const Icon = getMediaIcon(entry.media_type)
                    return (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setSelectedMediaEntry(entry.id)
                          setShowMediaSelector(false)
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
                      >
                        <Icon className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{entry.title}</p>
                          <p className="text-xs text-gray-400 capitalize">{entry.media_type}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowMediaSelector(!showMediaSelector)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
              >
                <Film className="w-4 h-4" />
                <span className="hidden sm:inline">Add Media</span>
                <span className="sm:hidden">Media</span>
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Image</span>
                <span className="sm:hidden">Upload</span>
              </label>
              <button
                onClick={() => setShowPostGifPicker(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
              >
                <span className="text-lg">GIF</span>
              </button>
              <button
                onClick={() => {
                  const url = prompt('Enter image URL:')
                  if (url) {
                    setImageUrl(url)
                    setUploadedImage(null) 
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Image URL</span>
                <span className="sm:hidden">URL</span>
              </button>
            </div>
            <button
              onClick={handleCreatePost}
              disabled={!newPost.trim() || posting}
              className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 py-2.5 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>

        {/* Feed Divider with Refresh */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center">
            <button
              onClick={() => fetchFeed()}
              disabled={refreshing}
              className={`
                group relative
                bg-gray-800/80 backdrop-blur-sm
                border border-gray-700
                hover:border-red-500/50
                px-4 py-2 rounded-full
                transition-all duration-300
                active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
                ${refreshing ? '' : 'hover:shadow-lg hover:shadow-red-500/20'}
              `}
            >
              <div className="flex items-center gap-2">
                {refreshing ? (
                  <span className="text-base animate-bounce">🍿</span>
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-400 transition-colors group-hover:rotate-180 transition-transform duration-700 ease-out" />
                )}
                <span className="text-xs font-medium text-gray-400 group-hover:text-red-400 transition-colors">
                  {refreshing ? 'Popping...' : 'Latest'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Feed */}
        {initialLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.slice(0, visiblePostsCount).map((post, index) => (
              <div 
                key={post.id} 
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 fade-in hover:border-gray-600 transition-all duration-200"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Post Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                    {post.profiles.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link 
                      to={`/user/${post.profiles.username}`}
                      className="font-semibold hover:text-red-400 transition-colors inline-block"
                    >
                      @{post.profiles.username}
                    </Link>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(post.created_at)}
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
                <p className="text-gray-300 mb-4">{post.content}</p>

                {/* Image */}
                {post.image_url && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-gray-700">
                    <img 
                      src={post.image_url} 
                      alt="Post attachment" 
                      className="w-full max-h-96 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Media Entry */}
                {post.media_entries && (
                  <div className="bg-gray-900/50 rounded-lg p-3 mb-4 flex items-center gap-3">
                    {post.media_entries.cover_image_url && (
                      <div className="w-16 h-20 flex-shrink-0 bg-gray-800 rounded overflow-hidden">
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
                <div className="flex items-center gap-6 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-all duration-200 ${
                      post.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart 
                      className={`w-5 h-5 transition-all duration-200 ${
                        post.is_liked ? 'fill-current heart-animate scale-110' : ''
                      }`} 
                    />
                    <span className="text-sm font-medium">{post.likes_count}</span>
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
                    className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{post.comments_count}</span>
                  </button>
                  <button 
                    onClick={() => handleShare(post)}
                    className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments === post.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-4 expand-down">
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
                          />
                        ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !postingComment) {
                              handleComment(post.id, null)
                            }
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleComment(post.id, null)}
                          disabled={!commentText.trim() || postingComment}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {postingComment ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                      
                      {/* Image Upload for Comment */}
                      <div className="flex gap-2 text-sm">
                        <input
                          ref={commentImageInputRef}
                          type="file"
                          accept="image/*,image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleCommentImageUpload(file)
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => commentImageInputRef.current?.click()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded transition-colors"
                          disabled={uploadingCommentImage}
                        >
                          <ImageIcon className="w-4 h-4" />
                          {uploadingCommentImage ? 'Uploading...' : 'Image'}
                        </button>
                        <button
                          onClick={() => setShowCommentGifPicker(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          GIF
                        </button>
                        <input
                          type="url"
                          value={commentImageUrl}
                          onChange={(e) => setCommentImageUrl(e.target.value)}
                          placeholder="Or paste image/GIF URL"
                          className="flex-1 px-3 py-1.5 bg-gray-900/50 border border-gray-600 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {(uploadedCommentImage || commentImageUrl) && (
                          <button
                            onClick={() => {
                              setUploadedCommentImage(null)
                              setCommentImageUrl('')
                            }}
                            className="px-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Image Preview */}
                      {(uploadedCommentImage || commentImageUrl) && (
                        <div className="relative inline-block">
                          <img
                            src={uploadedCommentImage || commentImageUrl}
                            alt="Preview"
                            className="max-w-xs max-h-32 rounded-lg border border-gray-700"
                          />
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
                  className="bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 hover:border-red-500/50 text-red-300 font-medium px-6 py-3 rounded-lg transition-all active:scale-95"
                >
                  View More Posts
                </button>
              </div>
            )}
            
            {/* Load More - Fetch from server when all loaded posts are visible */}
            {visiblePostsCount >= posts.length && hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={() => fetchFeed(true)}
                  disabled={loadingMore}
                  className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin"></div>
                      Loading...
                    </span>
                  ) : (
                    'Load More Posts'
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

      {/* Modal Reply GIF Picker */}
      {showModalReplyGifPicker && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowModalReplyGifPicker(false)}>
          <GifPicker
            onSelect={(gifUrl) => {
              setReplyImageUrl(gifUrl)
              setShowModalReplyGifPicker(false)
            }}
            onClose={() => setShowModalReplyGifPicker(false)}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => {
          setThreadModalComment(null)
          setThreadModalPostId(null)
        }}>
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[75vh] md:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-white">Thread</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    const result = await fetchComments(threadModalPostId!)
                    // Update the modal comment with fresh data from the map
                    if (result && result.commentsMap) {
                      const freshComment = result.commentsMap.get(threadModalComment.id)
                      if (freshComment) {
                        setThreadModalComment(freshComment)
                      }
                    }
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="Refresh thread"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setThreadModalComment(null)
                    setThreadModalPostId(null)
                    setReplyingTo(null)
                    setReplyText('')
                    setReplyImageUrl('')
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Modal Content - Full Thread */}
            <div className="p-4 space-y-4">
              {/* Parent Chain - Show all parent comments leading to this one */}
              {(() => {
                const parentChain: Comment[] = []
                let current = threadModalComment
                const allComments = comments[threadModalPostId!] || []
                const commentsMap = new Map<string, Comment>()
                
                // Build a map of all comments
                const buildMap = (comments: Comment[]) => {
                  comments.forEach(c => {
                    commentsMap.set(c.id, c)
                    if (c.replies) buildMap(c.replies)
                  })
                }
                buildMap(allComments)
                
                // Build parent chain
                while (current.parent_comment_id) {
                  const parent = commentsMap.get(current.parent_comment_id)
                  if (parent) {
                    parentChain.unshift(parent)
                    current = parent
                  } else {
                    break
                  }
                }
                
                return parentChain.map((parentComment) => (
                  <div key={parentComment.id} className="flex gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {parentComment.profiles.avatar_url ? (
                        <img src={parentComment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">
                          {parentComment.profiles.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <Link 
                          to={`/user/${parentComment.profiles.username}`}
                          className="text-sm font-semibold text-gray-300 hover:text-red-400 transition-colors inline-block mb-1"
                          onClick={() => {
                            setThreadModalComment(null)
                            setThreadModalPostId(null)
                          }}
                        >
                          @{parentComment.profiles.username}
                        </Link>
                        <p className="text-sm text-gray-400">{parentComment.content}</p>
                        {parentComment.image_url && (
                          <div className="mt-2">
                            <img 
                              src={parentComment.image_url} 
                              alt="Parent comment" 
                              className="max-w-full rounded-lg max-h-48 object-contain"
                            />
                          </div>
                        )}
                        <button
                          onClick={() => {
                            // Navigate to this parent comment
                            setThreadModalComment(parentComment)
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                        >
                          View this thread
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              })()}

              {/* Focused Comment (the one user clicked on) */}
              <div className="flex gap-3 border-l-2 border-red-500 pl-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {threadModalComment.profiles.avatar_url ? (
                    <img src={threadModalComment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">
                      {threadModalComment.profiles.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <Link 
                      to={`/user/${threadModalComment.profiles.username}`}
                      className="text-sm font-semibold text-white hover:text-red-400 transition-colors inline-block mb-1"
                      onClick={() => {
                        setThreadModalComment(null)
                        setThreadModalPostId(null)
                        setReplyingTo(null)
                        setReplyText('')
                        setReplyImageUrl('')
                      }}
                    >
                      @{threadModalComment.profiles.username}
                    </Link>
                    <p className="text-sm text-gray-300">{threadModalComment.content}</p>
                    
                    {threadModalComment.image_url && (
                      <div className="mt-3">
                        <img 
                          src={threadModalComment.image_url} 
                          alt="Comment attachment" 
                          className="max-w-full rounded-lg max-h-96 object-contain"
                        />
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {(() => {
                        const date = new Date(threadModalComment.created_at)
                        const now = new Date()
                        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
                        
                        if (seconds < 60) return 'just now'
                        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
                        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
                        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
                        return date.toLocaleDateString()
                      })()}
                    </p>
                  </div>

                  {/* Reply to Original Comment */}
                  {replyingTo === threadModalComment.id ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !postingComment && replyText.trim()) {
                              handleComment(threadModalPostId!, threadModalComment.id)
                            }
                          }}
                          placeholder={`Reply to @${threadModalComment.profiles.username}...`}
                          className="flex-1 px-3 py-2 text-sm bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            await handleComment(threadModalPostId!, threadModalComment.id)
                            // Refresh the thread
                            setTimeout(async () => {
                              const result = await fetchComments(threadModalPostId!)
                              if (result && result.commentsMap) {
                                const freshComment = result.commentsMap.get(threadModalComment.id)
                                if (freshComment) {
                                  setThreadModalComment(freshComment)
                                }
                              }
                            }, 500)
                          }}
                          disabled={!replyText.trim() || postingComment}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {postingComment ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <button
                          onClick={() => setShowModalReplyGifPicker(true)}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          GIF
                        </button>
                        <input
                          type="url"
                          value={replyImageUrl}
                          onChange={(e) => setReplyImageUrl(e.target.value)}
                          placeholder="Paste image/GIF URL (optional)"
                          className="flex-1 px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(threadModalComment.id)}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Reply to @{threadModalComment.profiles.username}
                    </button>
                  )}

                  {/* All Replies in Modal */}
                  {threadModalComment.replies && threadModalComment.replies.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {threadModalComment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {reply.profiles.avatar_url ? (
                              <img src={reply.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-xs font-bold">
                                {reply.profiles.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-800/30 rounded-lg p-3">
                              <Link 
                                to={`/user/${reply.profiles.username}`}
                                className="text-sm font-semibold text-white hover:text-red-400 transition-colors inline-block mb-1"
                                onClick={() => {
                                  setThreadModalComment(null)
                                  setThreadModalPostId(null)
                                }}
                              >
                                @{reply.profiles.username}
                              </Link>
                              <p className="text-sm text-gray-300">{reply.content}</p>
                              
                              {reply.image_url && (
                                <div className="mt-2">
                                  <img 
                                    src={reply.image_url} 
                                    alt="Reply attachment" 
                                    className="max-w-full rounded-lg max-h-64 object-contain"
                                  />
                                </div>
                              )}
                              
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-xs text-gray-500">
                                  {(() => {
                                    const date = new Date(reply.created_at)
                                    const now = new Date()
                                    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
                                    
                                    if (seconds < 60) return 'just now'
                                    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
                                    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
                                    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
                                    return date.toLocaleDateString()
                                  })()}
                                </p>
                                <button
                                  onClick={() => setReplyingTo(reply.id)}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  Reply
                                </button>
                                {reply.replies && reply.replies.length > 0 && (
                                  <button
                                    onClick={() => {
                                      setThreadModalComment(reply)
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    {reply.replies.length} {reply.replies.length === 1 ? 'reply' : 'replies'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Reply Input for This Reply */}
                            {replyingTo === reply.id && (
                              <div className="mt-2 space-y-2">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && !postingComment && replyText.trim()) {
                                        handleComment(threadModalPostId!, reply.id)
                                      }
                                    }}
                                    placeholder={`Reply to @${reply.profiles.username}...`}
                                    className="flex-1 px-3 py-2 text-sm bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={async () => {
                                      await handleComment(threadModalPostId!, reply.id)
                                      // Refresh the thread
                                      setTimeout(async () => {
                                        const result = await fetchComments(threadModalPostId!)
                                        if (result && result.commentsMap) {
                                          const freshComment = result.commentsMap.get(threadModalComment.id)
                                          if (freshComment) {
                                            setThreadModalComment(freshComment)
                                          }
                                        }
                                      }, 500)
                                    }}
                                    disabled={!replyText.trim() || postingComment}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {postingComment ? 'Posting...' : 'Reply'}
                                  </button>
                                </div>
                                <div className="flex gap-2 text-sm">
                                  <button
                                    onClick={() => setShowModalReplyGifPicker(true)}
                                    className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded transition-colors"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                    GIF
                                  </button>
                                  <input
                                    type="url"
                                    value={replyImageUrl}
                                    onChange={(e) => setReplyImageUrl(e.target.value)}
                                    placeholder="Paste image/GIF URL (optional)"
                                    className="flex-1 px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
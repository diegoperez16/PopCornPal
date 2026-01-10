import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore } from '../store/mediaStore'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, User, Film, Tv, Gamepad2, Book, Clock, Image as ImageIcon, X, Trash2 } from 'lucide-react'
import { supabase, safeSupabaseRequest } from '../lib/supabase'

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
  uploadingReplyImage
}: CommentThreadProps) {
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

  const maxDepth = 5 // Limit nesting depth

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : ''}`}>
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
              {depth < maxDepth && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Reply
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
                <input
                  type="url"
                  value={replyImageUrl}
                  onChange={(e) => setReplyImageUrl(e.target.value)}
                  placeholder="Or paste image URL"
                  className="flex-1 px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  depth={depth + 1}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onSubmitReply={onSubmitReply}
                  postingComment={postingComment}
                  replyImageUrl={replyImageUrl}
                  setReplyImageUrl={setReplyImageUrl}
                  onUploadReplyImage={onUploadReplyImage}
                  uploadingReplyImage={uploadingReplyImage}
                />
              ))}
            </div>
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
  const replyImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    fetchFeed().finally(() => setInitialLoading(false))
    if (user) fetchEntries(user.id)

    // Handle tab visibility - immediately refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchFeed() // Immediate refresh, no conditions
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchFeed() // Refetch feed on any post change
        }
      )
      .subscribe()

    const likesChannel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes'
        },
        () => {
          fetchFeed() // Refetch to update like counts
        }
      )
      .subscribe()

    const commentsChannel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments'
        },
        () => {
          fetchFeed() // Refetch to update comment counts
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(likesChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [user, navigate, fetchEntries])

  const fetchFeed = async () => {
    if (!user) return
    
    setRefreshing(true)
    try {
      // Use a reasonable timeout - 8 seconds is fast but reliable
      const timeout = 8000
      
      // Get list of users we follow
      const followingQuery = supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
      
      const { data: followingData } = await safeSupabaseRequest(followingQuery as any, timeout) as { data: any[] }
      
      const followingIds = followingData?.map(f => f.following_id) || []
      
      // Get posts from followed users + own posts
      const postsQuery = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          media_entries:media_entry_id (title, media_type, rating, cover_image_url)
        `)
        .in('user_id', [...followingIds, user.id])
        .order('created_at', { ascending: false })
        .limit(50)

      const { data, error } = await safeSupabaseRequest(postsQuery as any, timeout) as { data: any[], error: any }

      if (error) throw error
      
      if (!data || data.length === 0) {
        setPosts([])
        return
      }

      const postIds = data.map(p => p.id)
      
      // Batch fetch all likes for all posts
      const likesQuery = supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds)

      const { data: allLikes } = await safeSupabaseRequest(likesQuery as any, timeout) as { data: any[] }
      
      // Batch fetch all comments counts
      const commentsQuery = supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds)

      const { data: allComments } = await safeSupabaseRequest(commentsQuery as any, timeout) as { data: any[] }
      
      // Count likes and check user likes per post
      const likesMap = new Map<string, { count: number, userLiked: boolean }>()
      postIds.forEach(id => likesMap.set(id, { count: 0, userLiked: false }))
      
      allLikes?.forEach(like => {
        const current = likesMap.get(like.post_id)!
        current.count++
        if (like.user_id === user.id) {
          current.userLiked = true
        }
      })
      
      // Count comments per post
      const commentsMap = new Map<string, number>()
      postIds.forEach(id => commentsMap.set(id, 0))
      allComments?.forEach(comment => {
        commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1)
      })

      // Combine data
      const postsWithLikes = data.map(post => {
        const likes = likesMap.get(post.id) || { count: 0, userLiked: false }
        const commentsCount = commentsMap.get(post.id) || 0
        
        return {
          ...post,
          likes_count: likes.count,
          comments_count: commentsCount,
          is_liked: likes.userLiked
        }
      })

      setPosts(postsWithLikes as Post[])
    } catch (error) {
      console.error('Error fetching feed:', error)
      // Removed the manual reload here, as App.tsx now handles global connection health checks
    } finally {
      setRefreshing(false)
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
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!user) return
    
    const post = posts.find(p => p.id === postId)
    if (!post) return

    try {
      if (post.is_liked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id })
      }
      
      await fetchFeed()
    } catch (error) {
      console.error('Error toggling like:', error)
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
      
      // Update comment count immediately in local state
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      )
      
      // Only refetch comments for this post, not entire feed
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

      // Build nested structure
      const commentsMap = new Map<string, Comment>()
      const rootComments: Comment[] = []

      // First pass: create all comment objects
      data.forEach((comment: any) => {
        commentsMap.set(comment.id, { ...comment, replies: [] })
      })

      // Second pass: nest replies under parents
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
    } catch (error) {
      console.error('Error fetching comments:', error)
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
        // User cancelled or error occurred
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
        .eq('user_id', user.id) // Extra safety check

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
            setImageUrl('') // Clear URL input if pasting image
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
      setImageUrl('') // Clear URL input if uploading image
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

      {/* Full Screen Loading Animation */}
      {initialLoading && (
        <div className="fixed inset-0 z-40 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            {/* Animated Icons */}
            <div className="mb-8 relative flex items-center justify-center gap-6">
              <Film className="w-16 h-16 text-red-500 animate-[spin_3s_linear_infinite]" />
              <div className="relative">
                <Heart className="w-20 h-20 text-pink-500 animate-bounce" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
              </div>
              <Gamepad2 className="w-16 h-16 text-red-500 animate-[spin_3s_linear_infinite_reverse]" />
            </div>
            {/* Loading Text */}
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
          
          {/* Selected Media Entry Preview */}
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

          {/* Uploaded Image Preview */}
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

          {/* Image URL Preview */}
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
                onClick={() => {
                  const url = prompt('Enter image URL:')
                  if (url) {
                    setImageUrl(url)
                    setUploadedImage(null) // Clear uploaded image if adding URL
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
            {posts.map((post) => (
              <div key={post.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6">
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
                    className={`flex items-center gap-2 transition-colors ${
                      post.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                    <span className="text-sm">{post.likes_count}</span>
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
                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                    {/* Comments List */}
                    {comments[post.id] && comments[post.id].length > 0 && (
                      <div className="space-y-3 mb-4">
                        {comments[post.id].map((comment) => (
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
      </div>
    </div>
  )
}

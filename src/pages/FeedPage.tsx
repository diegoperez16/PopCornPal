import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore } from '../store/mediaStore'
import { useSocialStore, type Post } from '../store/socialStore'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, User, Film, Tv, Gamepad2, Book, Clock, Image as ImageIcon, X, Trash2, ArrowUp, RefreshCw, WifiOff, Star, Search, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GifPicker from '../components/GifPicker'
import FeedSkeleton from '../components/FeedSkeleton'
import SleekPopcornRefresh from '../components/SleekPopcornRefresh'
import { useLayoutEffect } from 'react'

// --- Types ---
// (Post interface removed here as it is imported from store)

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

const findImageLink = (text: string) => {
  const words = text.split(/\s+/)
  
  for (const w of words) {
    // 1. Standard Image Extensions
    if (w.match(/^https?:\/\/.*\.(gif|webp|jpg|jpeg|png|bmp|avif)(\?.*)?$/i)) {
      return { foundLink: w, renderableUrl: w }
    }
    
    // 2. Giphy Media (Direct)
    if (w.includes('giphy.com/media')) {
      return { foundLink: w, renderableUrl: w }
    }
    
    // 3. Giphy Page Link (Convert to direct media)
    const giphyMatch = w.match(/giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)$/)
    if (giphyMatch) {
       const id = giphyMatch[1]
       return { 
         foundLink: w, 
         renderableUrl: `https://media.giphy.com/media/${id}/giphy.gif` 
       }
    }
  }
  return null
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
  currentUserId?: string
  onDelete: (commentId: string, postId: string) => void
  onEdit: (comment: Comment) => void
  isEditing: boolean
  editText: string
  setEditText: (text: string) => void
  onUpdate: (commentId: string, postId: string) => void
  onCancelEdit: () => void
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
  setShowReplyGifPicker,
  currentUserId,
  onDelete,
  onEdit,
  isEditing,
  editText,
  setEditText,
  onUpdate,
  onCancelEdit
}: CommentThreadProps) {
  const hasReplies = comment.replies && comment.replies.length > 0

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    
    // GIF Link Detection
    if (!replyImageUrl && !uploadingReplyImage) {
      const result = findImageLink(value)
      
      if (result) {
        setReplyImageUrl(result.renderableUrl)
        // Remove link from text
        const newValue = value.replace(result.foundLink, '').trim()
        setReplyText(newValue)
        return
      }
    }
    setReplyText(value)
  }

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
          <div className="bg-gray-800/50 rounded-lg p-3 max-w-full overflow-x-auto">
            <Link 
              to={`/profile/${comment.profiles.username}`}
              className="text-sm font-semibold text-white hover:text-red-400 transition-colors inline-block mb-1"
            >
              @{comment.profiles.username}
            </Link>
            
            {isEditing ? (
              <div className="mt-1">
                <textarea
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  rows={1}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none overflow-hidden"
                  autoFocus
                />
                <div className="flex gap-2 mt-2 justify-end">
                   <button 
                     onClick={onCancelEdit}
                     className="text-xs text-gray-400 hover:text-white px-2 py-1"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={() => onUpdate(comment.id, postId)}
                     disabled={!editText.trim()}
                     className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                   >
                     Save
                   </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 break-all max-w-full whitespace-pre-wrap">{comment.content}</p>
            )}
            
            {/* Comment Image */}
            {comment.image_url && !isEditing && (
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
              {!isEditing && (
                <>
                  <button
                    onClick={() => onReply(comment.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Reply
                  </button>
                  {currentUserId === comment.user_id && (
                    <>
                      <button 
                        onClick={() => onEdit(comment)}
                        className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button 
                        onClick={() => onDelete(comment.id, postId)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  )}
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
                </>
              )}
            </div>
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <div className="mt-3 pl-3 border-l-2 border-gray-700/50">
               <div className="flex items-end gap-2 bg-gray-900/50 border border-gray-600 rounded-3xl p-2 relative transition-all focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={replyText}
                      onChange={handleReplyChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !postingComment && replyText.trim()) {
                          e.preventDefault()
                          onSubmitReply(postId, comment.id)
                        }
                      }}
                      placeholder={`Reply to @${comment.profiles.username}...`}
                      rows={1}
                      className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
                      autoFocus
                    />
                  </div>

                  {/* Actions inside the pill */}
                  <div className="flex items-center gap-1 pb-1">
                     <label 
                        htmlFor={`reply-image-${comment.id}`}
                        className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full cursor-pointer transition-colors"
                        title="Upload Image"
                      >
                        <ImageIcon className="w-4 h-4" />
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
                      </label>
                      <button
                        onClick={() => setShowReplyGifPicker(true)}
                        className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-full transition-colors font-bold text-[10px]"
                        title="Add GIF"
                      >
                        <span className="border border-current rounded px-1">GIF</span>
                      </button>
                      <button
                        onClick={() => onSubmitReply(postId, comment.id)}
                        disabled={!replyText.trim() && !replyImageUrl && !uploadingReplyImage || postingComment}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                  </div>
               </div>

              {/* Preview Images in Reply */}
              {(replyImageUrl || uploadingReplyImage) && (
                 <div className="mt-2 ml-2">
                   {uploadingReplyImage ? (
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                         <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                         Uploading image...
                      </div>
                   ) : (
                      <div className="relative inline-block group">
                         <img 
                           src={replyImageUrl} 
                           alt="Reply attachment" 
                           className="h-20 rounded-lg border border-gray-700" 
                         />
                         <button
                            onClick={() => setReplyImageUrl('')}
                            className="absolute -top-1 -right-1 p-0.5 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <X className="w-3 h-3" />
                         </button>
                      </div>
                   )}
                 </div>
              )}
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
  const { user, profile } = useAuthStore()
  const { entries, fetchEntries } = useMediaStore()
  const { 
    feedPosts: posts, 
    setFeedPosts: setPosts, 
    feedLoaded, 
    feedScrollPos,
    setFeedScrollPos,
    feedVisibleCount: visiblePostsCount, 
    setFeedVisibleCount: setVisiblePostsCount,
    hasMore: storeHasMore,
    fetchFeed: storeFetchFeed,
    toggleLike
  } = useSocialStore()

  const navigate = useNavigate()
  
  // Use loaded state to determine initial loading instead of always true
  const [initialLoading, setInitialLoading] = useState(!feedLoaded)
  
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
    
    // ✅ FIX: Only fetch if we don't have data yet.
    // If we have data (feedLoaded is true), we skip the fetch to preserve 
    // the "loaded more" posts and the scroll position.
    if (!feedLoaded) {
      fetchFeed().finally(() => setInitialLoading(false))
    } else {
      setInitialLoading(false)
    }
    
    // We can still fetch the user's media library in the background
    if (user && !isOffline) fetchEntries(user.id)

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)

    // ... (keep the visibility change logic if you want auto-refresh on tab switch) ...
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
      window.removeEventListener('openThread', handleOpenThread as EventListener)
      // ...
    }
  }, [user, navigate, fetchEntries, isOffline, feedLoaded]) // Add feedLoaded to dependencies

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
      const limit = loadMore ? 20 : Math.max(5, visiblePostsCount)

      await storeFetchFeed(user.id, limit, offset)

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

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    
    // GIF Link Detection
    if (!replyImageUrl && !uploadedReplyImage) {
      const result = findImageLink(value)
      
      if (result) {
        setReplyImageUrl(result.renderableUrl)
        // Remove link from text
        const newValue = value.replace(result.foundLink, '').trim()
        setReplyText(newValue)
        return
      }
    }
    setReplyText(value)
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

        {/* Feed Divider with Refresh */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center">
            <SleekPopcornRefresh onRefresh={() => fetchFeed()} />
          </div>
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center overflow-hidden">
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
                  className="bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 hover:border-red-500/50 text-red-300 font-medium px-6 py-3 rounded-lg transition-all active:scale-95"
                >
                  View More Posts
                </button>
              </div>
            )}
            
            {/* Load More - Fetch from server when all loaded posts are visible */}
            {visiblePostsCount >= posts.length && storeHasMore && (
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
                  <div key={parentComment.id} className="flex gap-3 opacity-60 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden min-w-0">
                      {parentComment.profiles.avatar_url ? (
                        <img src={parentComment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">
                          {parentComment.profiles.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0"> 
                      <div className="bg-gray-800/30 rounded-lg p-3 min-w-0">
                        <Link 
                          to={`/profile/${parentComment.profiles.username}`}
                          className="text-sm font-semibold text-gray-300 hover:text-red-400 transition-colors inline-block mb-1 min-w-0"
                          onClick={() => {
                            setThreadModalComment(null)
                            setThreadModalPostId(null)
                          }}
                        >
                          @{parentComment.profiles.username}
                        </Link>
                        <p className="text-sm text-gray-400 break-words overflow-wrap-anywhere">{parentComment.content}</p>
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
                      to={`/profile/${threadModalComment.profiles.username}`}
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

                    {editingCommentId === threadModalComment.id ? (
                      <div className="mt-1">
                        <textarea
                          value={editText}
                          onChange={(e) => {
                            setEditText(e.target.value)
                            e.target.style.height = 'auto'
                            e.target.style.height = `${e.target.scrollHeight}px`
                          }}
                          rows={1}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none overflow-hidden"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                           <button 
                             onClick={() => {
                               setEditingCommentId(null)
                               setEditText('')
                             }}
                             className="text-xs text-gray-400 hover:text-white px-2 py-1"
                           >
                             Cancel
                           </button>
                           <button 
                             onClick={async () => {
                               await handleUpdateComment(threadModalComment.id, threadModalPostId!)
                               // Refresh modal data
                               setTimeout(async () => {
                                  const result = await fetchComments(threadModalPostId!)
                                  if (result && result.commentsMap) {
                                    const freshComment = result.commentsMap.get(threadModalComment.id)
                                    if (freshComment) setThreadModalComment(freshComment)
                                  }
                               }, 500)
                             }}
                             disabled={!editText.trim()}
                             className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                           >
                             Save
                           </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300">{threadModalComment.content}</p>
                    )}
                    
                    {threadModalComment.image_url && !editingCommentId && (
                      <div className="mt-3">
                        <img 
                          src={threadModalComment.image_url} 
                          alt="Comment attachment" 
                          className="max-w-full rounded-lg max-h-96 object-contain"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-gray-500">
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
                        {user?.id === threadModalComment.user_id && !editingCommentId && (
                            <>
                              <button 
                                onClick={() => {
                                  setEditingCommentId(threadModalComment.id)
                                  setEditText(threadModalComment.content)
                                }}
                                className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button 
                                onClick={async () => {
                                   await handleDeleteComment(threadModalComment.id, threadModalPostId!)
                                   // If we delete the main focused comment, we should probably close the modal or go to parent
                                   setThreadModalComment(null)
                                   setThreadModalPostId(null)
                                }}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </>
                        )}
                    </div>
                  </div>

                  {/* Reply to Original Comment */}
                  {replyingTo === threadModalComment.id ? (
                    <div className="mt-3">
                       <div className="flex items-end gap-2 bg-gray-900/50 border border-gray-600 rounded-3xl p-2 relative transition-all focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                          <div className="flex-1 min-w-0">
                            <textarea
                              value={replyText}
                              onChange={handleReplyChange}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !postingComment && replyText.trim()) {
                                  e.preventDefault()
                                  handleComment(threadModalPostId!, threadModalComment.id).then(() => {
                                    setTimeout(async () => {
                                      const result = await fetchComments(threadModalPostId!)
                                      if (result && result.commentsMap) {
                                        const freshComment = result.commentsMap.get(threadModalComment.id)
                                        if (freshComment) {
                                          setThreadModalComment(freshComment)
                                        }
                                      }
                                    }, 500)
                                  })
                                }
                              }}
                              placeholder={`Reply to @${threadModalComment.profiles.username}...`}
                              rows={1}
                              className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
                              autoFocus
                            />
                          </div>

                          {/* Actions inside the pill */}
                          <div className="flex items-center gap-1 pb-1">
                             <label 
                                htmlFor={`modal-reply-image-${threadModalComment.id}`}
                                className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full cursor-pointer transition-colors"
                                title="Upload Image"
                              >
                                <ImageIcon className="w-4 h-4" />
                                <input
                                  type="file"
                                  accept="image/*,image/gif"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleReplyImageUpload(file)
                                  }}
                                  className="hidden"
                                  id={`modal-reply-image-${threadModalComment.id}`}
                                />
                              </label>
                              <button
                                onClick={() => setShowModalReplyGifPicker(true)}
                                className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-full transition-colors font-bold text-[10px]"
                                title="Add GIF"
                              >
                                <span className="border border-current rounded px-1">GIF</span>
                              </button>
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
                                disabled={!replyText.trim() && !replyImageUrl && !uploadingReplyImage || postingComment}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                          </div>
                       </div>

                      {/* Preview Images in Reply */}
                      {(replyImageUrl || uploadingReplyImage) && (
                         <div className="mt-2 ml-2">
                           {uploadingReplyImage ? (
                              <div className="text-xs text-gray-400 flex items-center gap-2">
                                 <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                                 Uploading image...
                              </div>
                           ) : (
                              <div className="relative inline-block group">
                                 <img 
                                   src={replyImageUrl} 
                                   alt="Reply attachment" 
                                   className="h-20 rounded-lg border border-gray-700" 
                                 />
                                 <button
                                    onClick={() => setReplyImageUrl('')}
                                    className="absolute -top-1 -right-1 p-0.5 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                    <X className="w-3 h-3" />
                                 </button>
                              </div>
                           )}
                         </div>
                      )}
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
                                to={`/profile/${reply.profiles.username}`}
                                className="text-sm font-semibold text-white hover:text-red-400 transition-colors inline-block mb-1"
                                onClick={() => {
                                  setThreadModalComment(null)
                                  setThreadModalPostId(null)
                                }}
                              >
                                @{reply.profiles.username}
                              </Link>

                              {editingCommentId === reply.id ? (
                                <div className="mt-1">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => {
                                      setEditText(e.target.value)
                                      e.target.style.height = 'auto'
                                      e.target.style.height = `${e.target.scrollHeight}px`
                                    }}
                                    rows={1}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none overflow-hidden"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-2 justify-end">
                                     <button 
                                       onClick={() => {
                                         setEditingCommentId(null)
                                         setEditText('')
                                       }}
                                       className="text-xs text-gray-400 hover:text-white px-2 py-1"
                                     >
                                       Cancel
                                     </button>
                                     <button 
                                       onClick={async () => {
                                         await handleUpdateComment(reply.id, threadModalPostId!)
                                         // Refresh modal data
                                         setTimeout(async () => {
                                            const result = await fetchComments(threadModalPostId!)
                                            if (result && result.commentsMap) {
                                              const freshComment = result.commentsMap.get(threadModalComment.id)
                                              if (freshComment) setThreadModalComment(freshComment)
                                            }
                                         }, 500)
                                       }}
                                       disabled={!editText.trim()}
                                       className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg disabled:opacity-50"
                                     >
                                       Save
                                     </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-300">{reply.content}</p>
                              )}
                              
                              {reply.image_url && !editingCommentId && (
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
                                {!editingCommentId && (
                                  <>
                                    <button
                                      onClick={() => setReplyingTo(reply.id)}
                                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                      Reply
                                    </button>
                                    {user?.id === reply.user_id && (
                                      <>
                                        <button 
                                          onClick={() => {
                                            setEditingCommentId(reply.id)
                                            setEditText(reply.content)
                                          }}
                                          className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                        >
                                          <Pencil className="w-3 h-3" />
                                          Edit
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            await handleDeleteComment(reply.id, threadModalPostId!)
                                            // Refresh modal data
                                            setTimeout(async () => {
                                                const result = await fetchComments(threadModalPostId!)
                                                if (result && result.commentsMap) {
                                                  const freshComment = result.commentsMap.get(threadModalComment.id)
                                                  if (freshComment) setThreadModalComment(freshComment)
                                                }
                                            }, 500)
                                          }}
                                          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Delete
                                        </button>
                                      </>
                                    )}
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
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Reply Input for This Reply */}
                            {replyingTo === reply.id && (
                              <div className="mt-2">
                                 <div className="flex items-end gap-2 bg-gray-900/50 border border-gray-600 rounded-3xl p-2 relative transition-all focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                                    <div className="flex-1 min-w-0">
                                      <textarea
                                        value={replyText}
                                        onChange={handleReplyChange}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey && !postingComment && replyText.trim()) {
                                            e.preventDefault()
                                            handleComment(threadModalPostId!, reply.id).then(() => {
                                              setTimeout(async () => {
                                                const result = await fetchComments(threadModalPostId!)
                                                if (result && result.commentsMap) {
                                                  const freshComment = result.commentsMap.get(threadModalComment.id)
                                                  if (freshComment) {
                                                    setThreadModalComment(freshComment)
                                                  }
                                                }
                                              }, 500)
                                            })
                                          }
                                        }}
                                        placeholder={`Reply to @${reply.profiles.username}...`}
                                        rows={1}
                                        className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
                                        autoFocus
                                      />
                                    </div>

                                    {/* Actions inside the pill */}
                                    <div className="flex items-center gap-1 pb-1">
                                       <label 
                                          htmlFor={`modal-reply-image-${reply.id}`}
                                          className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full cursor-pointer transition-colors"
                                          title="Upload Image"
                                        >
                                          <ImageIcon className="w-4 h-4" />
                                          <input
                                            type="file"
                                            accept="image/*,image/gif"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) handleReplyImageUpload(file)
                                            }}
                                            className="hidden"
                                            id={`modal-reply-image-${reply.id}`}
                                          />
                                        </label>
                                        <button
                                          onClick={() => setShowModalReplyGifPicker(true)}
                                          className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-full transition-colors font-bold text-[10px]"
                                          title="Add GIF"
                                        >
                                          <span className="border border-current rounded px-1">GIF</span>
                                        </button>
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
                                          disabled={!replyText.trim() && !replyImageUrl && !uploadingReplyImage || postingComment}
                                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
                                        >
                                          <ArrowUp className="w-4 h-4" />
                                        </button>
                                    </div>
                                 </div>

                                {/* Preview Images in Reply */}
                                {(replyImageUrl || uploadingReplyImage) && (
                                   <div className="mt-2 ml-2">
                                     {uploadingReplyImage ? (
                                        <div className="text-xs text-gray-400 flex items-center gap-2">
                                           <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                                           Uploading image...
                                        </div>
                                     ) : (
                                        <div className="relative inline-block group">
                                           <img 
                                             src={replyImageUrl} 
                                             alt="Reply attachment" 
                                             className="h-20 rounded-lg border border-gray-700" 
                                           />
                                           <button
                                              onClick={() => setReplyImageUrl('')}
                                              className="absolute -top-1 -right-1 p-0.5 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                           >
                                              <X className="w-3 h-3" />
                                           </button>
                                        </div>
                                      )}
                                   </div>
                                )}
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
    {/* Media Selector Modal */}
          {showMediaSelector && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[85vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Select Media</h3>
                  <button
                    onClick={() => {
                      setShowMediaSelector(false)
                      setMediaSearchQuery('')
                      setMediaFilterType('all')
                    }}
                    className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search & Filter */}
                <div className="space-y-3 mb-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={mediaSearchQuery}
                      onChange={(e) => setMediaSearchQuery(e.target.value)}
                      placeholder="Search your library..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'movie', label: 'Movies', icon: Film },
                      { id: 'show', label: 'TV', icon: Tv },
                      { id: 'game', label: 'Games', icon: Gamepad2 },
                      { id: 'book', label: 'Books', icon: Book },
                    ].map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.id}
                          onClick={() => setMediaFilterType(type.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                            mediaFilterType === type.id
                              ? 'bg-red-500/10 border-red-500/50 text-red-400'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          {Icon && <Icon className="w-3.5 h-3.5" />}
                          {type.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
                  {entries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Your library is empty.</p>
                      <button 
                         onClick={() => { setShowMediaSelector(false); navigate('/add') }}
                         className="mt-2 text-red-400 hover:text-red-300 text-sm font-medium"
                      >
                        Add your first entry
                      </button>
                    </div>
                  ) : (() => {
                    // Filter Logic
                    const filteredEntries = entries.filter(entry => {
                      const matchesType = mediaFilterType === 'all' || entry.media_type === mediaFilterType
                      const matchesSearch = entry.title.toLowerCase().includes(mediaSearchQuery.toLowerCase())
                      return matchesType && matchesSearch
                    })

                    if (filteredEntries.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <p>No matches found.</p>
                        </div>
                      )
                    }

                    return filteredEntries.map(entry => {
                      const Icon = getMediaIcon(entry.media_type)
                      return (
                        <button
                          key={entry.id}
                          onClick={() => {
                            setSelectedMediaEntry(entry.id)
                            setShowMediaSelector(false)
                            setMediaSearchQuery('')
                            setMediaFilterType('all')
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800 transition-colors text-left group border border-transparent hover:border-gray-700"
                        >
                          <div className="w-10 h-14 bg-gray-800 rounded flex-shrink-0 overflow-hidden relative">
                            {entry.cover_image_url ? (
                              <img src={entry.cover_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon className="w-4 h-4 text-gray-600" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                              {entry.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span className="capitalize">{entry.media_type}</span>
                              {entry.year && <span>• {entry.year}</span>}
                              {entry.rating && (
                                <span className="flex items-center gap-1 text-yellow-500/80">
                                  • <Star className="w-3 h-3 fill-current" /> {entry.rating}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Selection Indicator */}
                          <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center group-hover:border-red-500 transition-colors">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          )}
    </div>
  )
}
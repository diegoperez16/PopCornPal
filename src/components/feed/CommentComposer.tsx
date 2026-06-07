import { useEffect, useState } from 'react'
import { ArrowUp, Image as ImageIcon, X } from 'lucide-react'
import GifPicker from '../GifPicker'
import MentionDropdown from '../MentionDropdown'
import { findImageLink } from './feedTypes'
import { useCreateComment } from '../../hooks/queries/useFeedQueries'
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete'
import { uploadPostImage } from '../../lib/postImages'

const DRAFT_KEYS = {
  text: 'popcorn_comment_draft',
  imageUrl: 'popcorn_comment_img_url',
  upload: 'popcorn_comment_upload',
}

const loadDraft = (key: string) => {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

type CommentComposerProps = {
  postId: string
  userId: string
}

/**
 * Owns all state for the top-level "write a comment" box: text, mentions,
 * image/GIF attachments, and drafts. Kept fully local so typing here only
 * re-renders this small subtree — not the whole feed route.
 */
export default function CommentComposer({ postId, userId }: CommentComposerProps) {
  const { mutateAsync: createComment, isPending: posting } = useCreateComment(userId)
  const mention = useMentionAutocomplete()

  const [text, setText] = useState(() => loadDraft(DRAFT_KEYS.text))
  const [imageUrl, setImageUrl] = useState(() => loadDraft(DRAFT_KEYS.imageUrl))
  const [uploadedImage, setUploadedImage] = useState<string | null>(() => loadDraft(DRAFT_KEYS.upload) || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)

  // Persist drafts, debounced — avoids a synchronous localStorage write on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEYS.text, text)
        if (imageUrl) localStorage.setItem(DRAFT_KEYS.imageUrl, imageUrl)
        else localStorage.removeItem(DRAFT_KEYS.imageUrl)
        if (uploadedImage) localStorage.setItem(DRAFT_KEYS.upload, uploadedImage)
        else localStorage.removeItem(DRAFT_KEYS.upload)
      } catch {
        // quota — drop the draft silently
      }
    }, 400)
    return () => clearTimeout(t)
  }, [text, imageUrl, uploadedImage])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    mention.handleTextChange(value, e.target.selectionStart ?? value.length)
    if (!imageUrl && !uploadedImage) {
      const result = findImageLink(value)
      if (result) {
        setImageUrl(result.renderableUrl)
        setText(value.replace(result.foundLink, '').trim())
        return
      }
    }
    setText(value)
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      setUploadedImage(await uploadPostImage(userId, file))
    } catch (error) {
      console.error('Error uploading comment image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const clearDraft = () => {
    setText('')
    setImageUrl('')
    setUploadedImage(null)
    localStorage.removeItem(DRAFT_KEYS.text)
    localStorage.removeItem(DRAFT_KEYS.imageUrl)
    localStorage.removeItem(DRAFT_KEYS.upload)
  }

  const handleSubmit = async () => {
    const trimmed = text.trim()
    const finalImage = uploadedImage || imageUrl
    if (!trimmed && !finalImage) return

    try {
      await createComment({
        postId,
        content: trimmed,
        parent_comment_id: null,
        image_url: finalImage || null,
      })
      clearDraft()
    } catch (error) {
      console.error('Error creating comment:', error)
      alert('Failed to post comment. Your draft is saved.')
    }
  }

  return (
    <div className="mt-3 pl-3 border-l-2 border-gray-700/50">
      <div className="flex items-end gap-2 bg-gray-900/50 border border-gray-600 rounded-3xl p-2 relative transition-all focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
        <MentionDropdown
          users={mention.mention.users}
          loading={mention.mention.loading}
          query={mention.mention.query}
          selectedIndex={mention.mention.selectedIndex}
          onSelect={(username) => setText(mention.selectUser(text, username))}
        />
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (mention.mention.isOpen) {
                if (e.key === 'ArrowUp') { e.preventDefault(); mention.moveUp(); return }
                if (e.key === 'ArrowDown') { e.preventDefault(); mention.moveDown(); return }
                if (e.key === 'Enter' && mention.mention.users.length > 0) {
                  e.preventDefault()
                  setText(mention.selectUser(text, mention.mention.users[mention.mention.selectedIndex].username))
                  return
                }
                if (e.key === 'Escape') { mention.close(); return }
              }
              if (e.key === 'Enter' && !e.shiftKey && !posting && text.trim()) {
                e.preventDefault()
                void handleSubmit()
              }
            }}
            placeholder="Write a comment..."
            rows={1}
            className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
          />
        </div>
        <div className="flex items-center gap-1 pb-1">
          <label htmlFor={`comment-image-${postId}`} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full cursor-pointer transition-colors" title="Upload Image">
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/*,image/gif" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file) }} className="hidden" id={`comment-image-${postId}`} />
          </label>
          <button onClick={() => setShowGifPicker(true)} className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-full transition-colors font-bold text-[10px]" title="Add GIF">
            <span className="border border-current rounded px-1">GIF</span>
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={(!text.trim() && !imageUrl && !uploadedImage && !uploadingImage) || posting}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(imageUrl || uploadedImage || uploadingImage) && (
        <div className="mt-2 ml-2">
          {uploadingImage ? (
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
              Uploading image...
            </div>
          ) : (
            <div className="relative inline-block group">
              <img loading="lazy" decoding="async" src={uploadedImage || imageUrl} alt="Comment attachment" className="h-20 rounded-lg border border-gray-700" />
              <button
                onClick={() => { setUploadedImage(null); setImageUrl('') }}
                className="absolute -top-1 -right-1 p-0.5 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {showGifPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowGifPicker(false)}>
          <GifPicker onSelect={(gifUrl) => { setUploadedImage(gifUrl); setImageUrl(''); setShowGifPicker(false) }} onClose={() => setShowGifPicker(false)} />
        </div>
      )}
    </div>
  )
}

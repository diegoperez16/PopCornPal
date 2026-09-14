import { createDraftStorage } from '../../lib/draftStorage'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUp, Image as ImageIcon, X } from 'lucide-react'
import GifPicker from '../GifPicker'
import MentionDropdown from '../MentionDropdown'
import AutoGrowTextarea from '../AutoGrowTextarea'
import { findImageLink } from './feedTypes'
import { useCreateComment } from '../../hooks/queries/useFeedQueries'
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete'
import { uploadPostImage } from '../../lib/postImages'

const DRAFT_KEYS = {
  text: 'popcorn_comment_draft',
  imageUrl: 'popcorn_comment_img_url',
  upload: 'popcorn_comment_upload',
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
  const storage = useMemo(() => createDraftStorage(`${userId}:${postId}`), [userId, postId])
  const loadDraft = (key: string) => storage.getItem(key) ?? ''
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
        storage.setItem(DRAFT_KEYS.text, text)
        if (imageUrl) storage.setItem(DRAFT_KEYS.imageUrl, imageUrl)
        else storage.removeItem(DRAFT_KEYS.imageUrl)
        if (uploadedImage) storage.setItem(DRAFT_KEYS.upload, uploadedImage)
        else storage.removeItem(DRAFT_KEYS.upload)
      } catch {
        // quota — drop the draft silently
      }
    }, 400)
    return () => clearTimeout(t)
  }, [text, imageUrl, uploadedImage, storage])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
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
    storage.removeItem(DRAFT_KEYS.text)
    storage.removeItem(DRAFT_KEYS.imageUrl)
    storage.removeItem(DRAFT_KEYS.upload)
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
    <div className="mt-3">
      <div className="relative flex items-end gap-1 rounded-2xl border border-line-soft bg-surface-sunken p-2 transition-colors focus-within:border-butter-400">
        <MentionDropdown
          users={mention.mention.users}
          loading={mention.mention.loading}
          query={mention.mention.query}
          selectedIndex={mention.mention.selectedIndex}
          onSelect={(username) => setText(mention.selectUser(text, username))}
        />
        <div className="min-w-0 flex-1">
          <AutoGrowTextarea
            minRows={1}
            maxRows={5}
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
            aria-label="Write a comment"
            enterKeyHint="send"
            className="w-full border-none bg-transparent px-2 py-2.5 text-base leading-6 text-gray-50 placeholder:text-gray-500 focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex shrink-0 items-center">
          <label htmlFor={`comment-image-${postId}`} aria-label="Upload an image" className="app-icon-button cursor-pointer">
            <ImageIcon size={18} />
            <input type="file" accept="image/*,image/gif" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file) }} className="hidden" id={`comment-image-${postId}`} />
          </label>
          <button type="button" onClick={() => setShowGifPicker(true)} aria-label="Add a GIF" className="app-icon-button">
            <span className="rounded border border-current px-1 text-xs font-bold leading-5">GIF</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={(!text.trim() && !imageUrl && !uploadedImage && !uploadingImage) || posting}
            aria-label="Send"
            className="app-button-primary !min-h-11 !w-11 !p-0 !rounded-full ml-1"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>

      {(imageUrl || uploadedImage || uploadingImage) && (
        <div className="mt-2">
          {uploadingImage ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
              Uploading image...
            </div>
          ) : (
            <div className="flex items-start gap-1">
              <img loading="lazy" decoding="async" src={uploadedImage || imageUrl} alt="Comment attachment" className="h-auto w-auto min-w-0 max-w-full max-h-20 rounded-lg border border-line-soft object-contain" />
              <button
                type="button"
                onClick={() => { setUploadedImage(null); setImageUrl('') }}
                aria-label="Remove image"
                className="app-icon-button"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {showGifPicker && (
        <GifPicker onSelect={(gifUrl) => { setUploadedImage(gifUrl); setImageUrl(''); setShowGifPicker(false) }} onClose={() => setShowGifPicker(false)} />
      )}
    </div>
  )
}

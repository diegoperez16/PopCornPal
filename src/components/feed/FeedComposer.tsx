import { createDraftStorage } from '../../lib/draftStorage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Book, Film, Gamepad2, Image as ImageIcon, Tv, User, X } from 'lucide-react'
import UserAvatar from '../UserAvatar'
import GifPicker from '../GifPicker'
import MentionDropdown from '../MentionDropdown'
import MediaSelectorModal from './MediaSelectorModal'
import { findImageLink } from './feedTypes'
import { useCreatePost } from '../../hooks/queries/useFeedQueries'
import { useMediaEntries } from '../../hooks/queries/useMediaQueries'
import { collectUniqueMedia } from '../../features/library/libraryModel'
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete'
import { uploadPostImage } from '../../lib/postImages'
import type { Profile } from '../../lib/supabase'

type FeedComposerProps = {
  userId: string
  profile: Profile | null
}

type MediaFilterType = 'all' | 'movie' | 'show' | 'game' | 'book'

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'movie':
      return Film
    case 'show':
      return Tv
    case 'game':
      return Gamepad2
    case 'book':
      return Book
    default:
      return Film
  }
}

export default function FeedComposer({ userId, profile }: FeedComposerProps) {
  const storage = useMemo(() => createDraftStorage(userId), [userId])
  const loadDraft = (key: string, fallback = '') => storage.getItem(key) ?? fallback
  const { mutateAsync: createPost, isPending: posting } = useCreatePost(userId)
  const [newPost, setNewPost] = useState(() => loadDraft('popcorn_new_post_draft'))
  const [selectedMediaEntry, setSelectedMediaEntry] = useState<string | null>(() =>
    loadDraft('popcorn_post_media') || null
  )
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  // Lazy: only fetch the user's library when the selector is opened or a
  // previously-selected media entry needs to be resolved for display.
  const { data: entries = [] } = useMediaEntries(userId, showMediaSelector || !!selectedMediaEntry)
  // The picker lists titles, so collapse the per-event rows. The full list is
  // kept for resolving an already-selected entry by id.
  const pickableEntries = useMemo(() => collectUniqueMedia(entries), [entries])
  const [imageUrl, setImageUrl] = useState(() => loadDraft('popcorn_post_img_url'))
  const [uploadedImage, setUploadedImage] = useState<string | null>(() =>
    loadDraft('popcorn_post_upload') || null
  )
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showPostGifPicker, setShowPostGifPicker] = useState(false)
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [mediaFilterType, setMediaFilterType] = useState<MediaFilterType>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const postMention = useMentionAutocomplete()

  useEffect(() => {
    storage.setItem('popcorn_new_post_draft', newPost)

    if (selectedMediaEntry) storage.setItem('popcorn_post_media', selectedMediaEntry)
    else storage.removeItem('popcorn_post_media')

    if (imageUrl) storage.setItem('popcorn_post_img_url', imageUrl)
    else storage.removeItem('popcorn_post_img_url')

    if (uploadedImage) {
      try {
        storage.setItem('popcorn_post_upload', uploadedImage)
      } catch (error) {
        console.warn('Image too large to persist', error)
      }
    } else {
      storage.removeItem('popcorn_post_upload')
    }
  }, [imageUrl, newPost, selectedMediaEntry, uploadedImage, storage])

  const resetComposer = () => {
    setNewPost('')
    setSelectedMediaEntry(null)
    setImageUrl('')
    setUploadedImage(null)
    setShowMediaSelector(false)
    storage.removeItem('popcorn_new_post_draft')
    storage.removeItem('popcorn_post_media')
    storage.removeItem('popcorn_post_img_url')
    storage.removeItem('popcorn_post_upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreatePost = async () => {
    if (!newPost.trim()) return

    try {
      await createPost({
        content: newPost.trim(),
        media_entry_id: selectedMediaEntry,
        image_url: uploadedImage || imageUrl.trim() || null,
      })
      resetComposer()
    } catch {
      alert('Failed to post. Your draft is saved.')
    }
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (!item.type.startsWith('image/')) continue

      e.preventDefault()
      const file = item.getAsFile()
      if (!file) break

      try {
        setUploadingImage(true)
        setUploadedImage(await uploadPostImage(userId, file))
        setImageUrl('')
      } catch (error) {
        console.error('Error uploading pasted image:', error)
        alert('Failed to upload image')
      } finally {
        setUploadingImage(false)
      }

      break
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    void (async () => {
      try {
        setUploadingImage(true)
        setUploadedImage(await uploadPostImage(userId, file))
        setImageUrl('')
      } catch (error) {
        console.error('Error uploading post image:', error)
        alert('Failed to upload image')
      } finally {
        setUploadingImage(false)
      }
    })()
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectedEntry = selectedMediaEntry
    ? entries.find((entry) => entry.id === selectedMediaEntry)
    : null

  return (
    <>
      <div className="app-panel rounded-2xl p-4 sm:p-5 mb-6">
        <div className="flex gap-3">
          <span className="app-avatar h-10 w-10">
            {profile?.avatar_url ? (
              <UserAvatar
                avatarUrl={profile.avatar_url}
                avatarCrop={profile.avatar_crop}
                username={profile.username}
              />
            ) : (
              <User size={18} />
            )}
          </span>
          <div className="min-w-0 flex-1">
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
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    postMention.moveUp()
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    postMention.moveDown()
                  } else if (e.key === 'Enter' && postMention.mention.users.length > 0) {
                    e.preventDefault()
                    setNewPost(
                      postMention.selectUser(
                        newPost,
                        postMention.mention.users[postMention.mention.selectedIndex].username
                      )
                    )
                  } else if (e.key === 'Escape') {
                    postMention.close()
                  }
                }}
                aria-label="Share a thought with your friends"
                placeholder="What’s worth talking about?"
                className="min-h-[72px] w-full resize-none border-none bg-transparent px-0 py-2 text-base leading-relaxed text-gray-50 placeholder:text-gray-500 focus:ring-0"
                rows={2}
              />
            </div>

            {selectedEntry && (() => {
              const Icon = getMediaIcon(selectedEntry.media_type)
              return (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-line-soft bg-surface-sunken py-1 pl-2 pr-1">
                  {selectedEntry.cover_image_url ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={selectedEntry.cover_image_url}
                      alt=""
                      className="h-10 w-8 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md bg-surface-strong text-muted">
                      <Icon size={16} />
                    </span>
                  )}
                  <span className="min-w-0 truncate text-sm font-medium text-gray-50">
                    {selectedEntry.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMediaEntry(null)}
                    aria-label="Remove attached title"
                    className="app-icon-button"
                  >
                    <X size={18} />
                  </button>
                </div>
              )
            })()}

            {uploadingImage && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line-soft bg-surface-sunken px-3 py-2 text-sm text-gray-200">
                <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                Uploading image...
              </div>
            )}

            {uploadedImage && !uploadingImage && (
              <div className="relative mt-3 inline-block max-w-full">
                <img
                  loading="lazy"
                  decoding="async"
                  src={uploadedImage}
                  alt="Upload preview"
                  className="h-auto w-auto max-w-full max-h-60 rounded-xl border border-line-soft object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  aria-label="Remove image"
                  className="app-icon-button absolute right-2 top-2 !rounded-full bg-gray-950/70 text-gray-50"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {imageUrl && (
              <div className="mt-3 flex max-w-full items-center gap-2 rounded-xl border border-line-soft bg-surface-sunken py-1 pl-3 pr-1">
                <ImageIcon size={18} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{imageUrl}</span>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  aria-label="Remove image link"
                  className="app-icon-button"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowMediaSelector(!showMediaSelector)}
                  aria-label="Attach a title from your library"
                  className="app-icon-button"
                >
                  <Film size={20} />
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
                  aria-label="Upload an image"
                  className="app-icon-button cursor-pointer"
                >
                  <ImageIcon size={20} />
                </label>
                <button
                  type="button"
                  onClick={() => setShowPostGifPicker(true)}
                  aria-label="Add a GIF"
                  className="app-icon-button"
                >
                  <span className="rounded border border-current px-1 text-xs font-bold leading-5">GIF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreatePost}
                disabled={!newPost.trim() || posting || uploadingImage}
                className="app-button-primary app-button-sm !rounded-full"
              >
                {posting && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-accent-deep/30 border-t-accent-deep"
                  />
                )}
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPostGifPicker && (
        <GifPicker
          onSelect={(gifUrl) => {
            setUploadedImage(gifUrl)
            setImageUrl('')
            setShowPostGifPicker(false)
          }}
          onClose={() => setShowPostGifPicker(false)}
        />
      )}

      {showMediaSelector && (
        <MediaSelectorModal
          entries={pickableEntries}
          mediaSearchQuery={mediaSearchQuery}
          setMediaSearchQuery={setMediaSearchQuery}
          mediaFilterType={mediaFilterType}
          setMediaFilterType={setMediaFilterType}
          onSelect={(id) => {
            setSelectedMediaEntry(id)
            setShowMediaSelector(false)
          }}
          onClose={() => setShowMediaSelector(false)}
        />
      )}
    </>
  )
}

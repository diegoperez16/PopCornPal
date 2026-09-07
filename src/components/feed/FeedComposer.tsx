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
      <div className="app-panel rounded-2xl p-4 sm:p-5 mb-5">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[#524d49] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <UserAvatar
                avatarUrl={profile.avatar_url}
                avatarCrop={profile.avatar_crop}
                username={profile.username}
              />
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
                className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none text-base min-h-[72px]"
                rows={2}
              />
            </div>

            {selectedEntry && (() => {
              const Icon = getMediaIcon(selectedEntry.media_type)
              return (
                <div className="mt-2 inline-flex items-center gap-2 bg-gray-900/80 border border-gray-600 rounded-lg p-2 pr-3 max-w-full">
                  {selectedEntry.cover_image_url ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={selectedEntry.cover_image_url}
                      alt=""
                      className="w-8 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-10 bg-gray-800 rounded flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <span className="text-sm text-gray-200 truncate font-medium">
                    {selectedEntry.title}
                  </span>
                  <button
                    onClick={() => setSelectedMediaEntry(null)}
                    className="text-gray-400 hover:text-white ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })()}

            {uploadingImage && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/80 px-3 py-2 text-sm text-gray-300">
                <div className="h-4 w-4 rounded-full border-2 border-gray-600 border-t-green-400 animate-spin" />
                Uploading image...
              </div>
            )}

            {uploadedImage && !uploadingImage && (
              <div className="mt-3 relative inline-block max-w-full">
                <img
                  loading="lazy"
                  decoding="async"
                  src={uploadedImage}
                  alt="Upload preview"
                  className="h-auto w-auto max-w-full max-h-60 object-contain rounded-xl border border-gray-700"
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
                  className="min-h-11 min-w-11 flex items-center justify-center p-2 text-[#e9bca4] hover:bg-red-500/10 rounded-full transition-colors"
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
                  className="min-h-11 min-w-11 flex items-center justify-center p-2 text-gray-400 hover:bg-green-500/10 rounded-full transition-colors cursor-pointer"
                  title="Upload Image"
                >
                  <ImageIcon className="w-5 h-5" />
                </label>
                <button
                  onClick={() => setShowPostGifPicker(true)}
                  className="min-h-11 min-w-11 p-2 text-gray-400 hover:bg-purple-500/10 rounded-full transition-colors flex items-center justify-center font-bold text-xs"
                  title="Add GIF"
                >
                  <span className="border border-current rounded px-1 py-0.5">GIF</span>
                </button>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={!newPost.trim() || posting || uploadingImage}
                className="app-button-primary !min-h-11 !py-2 !px-5 !rounded-full"
              >
                {posting ? 'Posting...' : uploadingImage ? 'Uploading...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPostGifPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowPostGifPicker(false)}
        >
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

      {showMediaSelector && (
        <MediaSelectorModal
          entries={entries}
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

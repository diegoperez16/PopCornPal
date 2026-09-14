import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Pencil, MessageCircle, ArrowUp, Image as ImageIcon, X, Heart } from 'lucide-react'
import { type Comment, formatTimeAgo, findImageLink, wasEdited } from './feedTypes'
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete'
import MentionDropdown from '../MentionDropdown'
import AutoGrowTextarea from '../AutoGrowTextarea'
import { renderMentionText } from '../../lib/mentions'
import UserAvatar from '../UserAvatar'

export type CommentThreadProps = {
  comment: Comment
  postId: string
  depth: number
  /** Comment arrived at from a notification; ringed so it is findable. */
  highlightedId?: string | null
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
  onLike: (commentId: string) => void
}

export default function CommentThread({
  comment,
  postId,
  depth,
  highlightedId,
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
  onCancelEdit,
  onLike,
}: CommentThreadProps) {
  const hasReplies = comment.replies && comment.replies.length > 0
  const replyMention = useMentionAutocomplete()
  // Only a tap on this comment may focus its reply or edit box. A target
  // restored from a draft, or left over from an earlier visit, mounts the
  // box when the thread opens, and autoFocus would scroll the feed to it.
  const [focusField, setFocusField] = useState(false)

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value

    replyMention.handleTextChange(value, e.target.selectionStart ?? value.length)

    // GIF Link Detection
    if (!replyImageUrl && !uploadingReplyImage) {
      const result = findImageLink(value)

      if (result) {
        setReplyImageUrl(result.renderableUrl)
        const newValue = value.replace(result.foundLink, '').trim()
        setReplyText(newValue)
        return
      }
    }
    setReplyText(value)
  }

  return (
    <div
      id={`comment-${comment.id}`}
      className={`${depth > 0 ? 'ml-4 mt-3 border-l border-line-soft pl-3' : ''} ${
        highlightedId === comment.id
          ? 'rounded-xl ring-2 ring-accent ring-offset-2 ring-offset-surface transition-shadow'
          : ''
      }`}
    >
      <div className="flex gap-3">
        <span className={`app-avatar text-xs ${depth > 0 ? 'h-7 w-7' : 'h-8 w-8'}`}>
          <UserAvatar avatarUrl={comment.profiles.avatar_url} avatarCrop={comment.profiles.avatar_crop} username={comment.profiles.username} />
          {!comment.profiles.avatar_url && (
            <span>{comment.profiles.username.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="rounded-xl bg-surface-sunken p-3">
            <Link
              to={`/profile/${comment.profiles.username}`}
              className="mb-1 inline-block text-sm font-semibold text-gray-50 transition-colors hover:text-accent-soft"
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
                  aria-label="Edit your comment"
                  className="app-textarea overflow-hidden"
                  autoFocus={focusField}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="app-button-ghost app-button-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate(comment.id, postId)}
                    disabled={!editText.trim()}
                    className="app-button-primary app-button-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm text-gray-200">{renderMentionText(comment.content)}</p>
            )}

            {/* Comment Image */}
            {comment.image_url && !isEditing && (
              <img loading="lazy" decoding="async"
                src={comment.image_url}
                alt="Comment attachment"
                className="mt-2 max-h-64 max-w-full rounded-lg object-contain"
              />
            )}

            <div className="-mb-2 -ml-2 mt-1 flex flex-wrap items-center gap-x-1">
              <span className="px-2 text-xs text-muted">
                {formatTimeAgo(comment.created_at)}
              </span>
              {wasEdited(comment.created_at, comment.updated_at) && (
                <span className="text-xs italic text-muted">(edited)</span>
              )}
              {!isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => onLike(comment.id)}
                    aria-pressed={comment.is_liked}
                    aria-label={comment.is_liked ? 'Unlike comment' : 'Like comment'}
                    className={`flex min-h-11 items-center gap-1 px-2 text-xs font-semibold tabular-nums transition-colors ${
                      comment.is_liked ? 'text-accent-soft' : 'text-muted hover:text-gray-50'
                    }`}
                  >
                    <Heart size={14} className={comment.is_liked ? 'fill-current' : ''} />
                    {(comment.likes_count ?? 0) > 0 && <span>{comment.likes_count}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFocusField(true); onReply(comment.id) }}
                    className="min-h-11 px-2 text-xs font-semibold text-accent-soft"
                  >
                    Reply
                  </button>
                  {currentUserId === comment.user_id && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setFocusField(true); onEdit(comment) }}
                        className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-gray-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(comment.id, postId)}
                        className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-danger"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </>
                  )}
                  {hasReplies && (
                    <button
                      type="button"
                      onClick={() => {
                        const event = new CustomEvent('openThread', { detail: { comment, postId } })
                        window.dispatchEvent(event)
                      }}
                      className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-gray-50"
                    >
                      <MessageCircle size={14} />
                      {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <div className="mt-3 border-l border-line-soft pl-3">
              <div className="relative flex items-end gap-1 rounded-2xl border border-line-soft bg-surface-sunken p-2 transition-colors focus-within:border-butter-400">
                <MentionDropdown
                  users={replyMention.mention.users}
                  loading={replyMention.mention.loading}
                  query={replyMention.mention.query}
                  selectedIndex={replyMention.mention.selectedIndex}
                  onSelect={(username) => setReplyText(replyMention.selectUser(replyText, username))}
                />
                <div className="min-w-0 flex-1">
                  <AutoGrowTextarea
                    minRows={1}
                    maxRows={5}
                    value={replyText}
                    onChange={handleReplyChange}
                    onKeyDown={(e) => {
                      if (replyMention.mention.isOpen) {
                        if (e.key === 'ArrowUp') { e.preventDefault(); replyMention.moveUp(); return }
                        if (e.key === 'ArrowDown') { e.preventDefault(); replyMention.moveDown(); return }
                        if (e.key === 'Enter' && replyMention.mention.users.length > 0) {
                          e.preventDefault()
                          setReplyText(replyMention.selectUser(replyText, replyMention.mention.users[replyMention.mention.selectedIndex].username))
                          return
                        }
                        if (e.key === 'Escape') { replyMention.close(); return }
                      }
                      if (e.key === 'Enter' && !e.shiftKey && !postingComment && replyText.trim()) {
                        e.preventDefault()
                        onSubmitReply(postId, comment.id)
                      }
                    }}
                    placeholder={`Reply to @${comment.profiles.username}...`}
                    aria-label={`Reply to @${comment.profiles.username}`}
                    enterKeyHint="send"
                    className="w-full border-none bg-transparent px-2 py-2.5 text-base leading-6 text-gray-50 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                    autoFocus={focusField}
                  />
                </div>

                <div className="flex shrink-0 items-center">
                  <label
                    htmlFor={`reply-image-${comment.id}`}
                    aria-label="Upload an image"
                    className="app-icon-button cursor-pointer"
                  >
                    <ImageIcon size={18} />
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
                    type="button"
                    onClick={() => setShowReplyGifPicker(true)}
                    aria-label="Add a GIF"
                    className="app-icon-button"
                  >
                    <span className="rounded border border-current px-1 text-xs font-bold leading-5">GIF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSubmitReply(postId, comment.id)}
                    disabled={(!replyText.trim() && !replyImageUrl && !uploadingReplyImage) || postingComment}
                    aria-label="Send"
                    className="app-button-primary !min-h-11 !w-11 !p-0 !rounded-full ml-1"
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>

              {/* Preview Images in Reply */}
              {(replyImageUrl || uploadingReplyImage) && (
                <div className="mt-2">
                  {uploadingReplyImage ? (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                      Uploading image...
                    </div>
                  ) : (
                    <div className="flex items-start gap-1">
                      <img loading="lazy" decoding="async"
                        src={replyImageUrl}
                        alt="Reply attachment"
                        className="h-auto w-auto min-w-0 max-w-full max-h-20 rounded-lg border border-line-soft object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setReplyImageUrl('')}
                        aria-label="Remove image"
                        className="app-icon-button"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Inline nesting stops at one level so the thread stays readable.
              Deeper replies are reachable through the reply count above, which
              now shows at every depth — before, a reply to a reply was
              invisible in the feed with nothing hinting it was there. */}
          {comment.replies && comment.replies.length > 0 && depth === 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  depth={1}
                  highlightedId={highlightedId}
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
                  setShowReplyGifPicker={setShowReplyGifPicker}
                  currentUserId={currentUserId}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isEditing={isEditing}
                  editText={editText}
                  setEditText={setEditText}
                  onUpdate={onUpdate}
                  onCancelEdit={onCancelEdit}
                  onLike={onLike}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

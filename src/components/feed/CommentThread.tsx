import { Link } from 'react-router-dom'
import { Trash2, Pencil, MessageCircle, ArrowUp, Image as ImageIcon, X, Heart } from 'lucide-react'
import { type Comment, formatTimeAgo, findImageLink, wasEdited } from './feedTypes'
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete'
import MentionDropdown from '../MentionDropdown'
import { renderMentionText } from '../../lib/mentions'

export type CommentThreadProps = {
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
  onLike: (commentId: string) => void
}

export default function CommentThread({
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
  onCancelEdit,
  onLike,
}: CommentThreadProps) {
  const hasReplies = comment.replies && comment.replies.length > 0
  const replyMention = useMentionAutocomplete()

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value

    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`

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
    <div className={`${depth > 0 ? 'ml-6 mt-3' : ''}`}>
      <div className="flex gap-3">
        <div className={`${depth > 0 ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
          {comment.profiles.avatar_url ? (
            <img loading="lazy" decoding="async" src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
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
              <p className="text-sm text-gray-300 break-all max-w-full whitespace-pre-wrap">{renderMentionText(comment.content)}</p>
            )}

            {/* Comment Image */}
            {comment.image_url && !isEditing && (
              <div className="mt-2">
                <img loading="lazy" decoding="async"
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
              {wasEdited(comment.created_at, comment.updated_at) && (
                <span className="text-xs text-gray-600 italic">(edited)</span>
              )}
              {!isEditing && (
                <>
                  <button
                    onClick={() => onLike(comment.id)}
                    className={`text-xs flex items-center gap-1 transition-colors active:scale-95 ${
                      comment.is_liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${comment.is_liked ? 'fill-current' : ''}`} />
                    {(comment.likes_count ?? 0) > 0 && <span>{comment.likes_count}</span>}
                  </button>
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
                <MentionDropdown
                  users={replyMention.mention.users}
                  loading={replyMention.mention.loading}
                  query={replyMention.mention.query}
                  selectedIndex={replyMention.mention.selectedIndex}
                  onSelect={(username) => setReplyText(replyMention.selectUser(replyText, username))}
                />
                <div className="flex-1 min-w-0">
                  <textarea
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
                    rows={1}
                    className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
                    autoFocus
                  />
                </div>

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
                    disabled={(!replyText.trim() && !replyImageUrl && !uploadingReplyImage) || postingComment}
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
                      <img loading="lazy" decoding="async"
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

          {/* Inline replies — depth capped at 1 to avoid infinite nesting */}
          {comment.replies && comment.replies.length > 0 && depth === 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  depth={1}
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

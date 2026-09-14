import { useState } from 'react'
import { X, Pencil, Trash2, ArrowUp, Image as ImageIcon, MessageCircle, Heart } from 'lucide-react'
import GifPicker from '../GifPicker'
import AutoGrowTextarea from '../AutoGrowTextarea'
import Sheet from '../Sheet'
import { type Comment, formatTimeAgo, findImageLink } from './feedTypes'
import UserAvatar from '../UserAvatar'
import ProfileLink from '../ProfileLink'

type ThreadModalProps = {
  comment: Comment
  postId: string
  replyingTo: string | null
  replyText: string
  setReplyText: (text: string) => void
  replyImageUrl: string
  setReplyImageUrl: (url: string) => void
  uploadingReplyImage: boolean
  postingComment: boolean
  editingCommentId: string | null
  setEditingCommentId: (id: string | null) => void
  editText: string
  setEditText: (text: string) => void
  currentUserId: string | undefined
  allComments: Record<string, Comment[]>
  showModalReplyGifPicker: boolean
  setShowModalReplyGifPicker: (show: boolean) => void
  onClose: () => void
  onSetReplyingTo: (id: string | null) => void
  onSetComment: (comment: Comment) => void
  onSubmitComment: (postId: string, parentId: string) => Promise<void>
  onDeleteComment: (commentId: string, postId: string) => Promise<void>
  onUpdateComment: (commentId: string, postId: string) => Promise<void>
  onFetchComments: (postId: string) => Promise<{ rootComments: Comment[]; commentsMap: Map<string, Comment> }>
  onUploadReplyImage: (file: File) => Promise<void>
  onLikeComment: (commentId: string, postId: string) => void
}

export default function ThreadModal({
  comment: threadModalComment,
  postId: threadModalPostId,
  replyingTo,
  replyText,
  setReplyText,
  replyImageUrl,
  setReplyImageUrl,
  uploadingReplyImage,
  postingComment,
  editingCommentId,
  setEditingCommentId,
  editText,
  setEditText,
  currentUserId,
  allComments,
  showModalReplyGifPicker,
  setShowModalReplyGifPicker,
  onClose,
  onSetReplyingTo,
  onSetComment,
  onSubmitComment,
  onDeleteComment,
  onUpdateComment,
  onFetchComments,
  onUploadReplyImage,
  onLikeComment,
}: ThreadModalProps) {
  // Only a Reply or Edit tap inside this sheet may focus a field. A target
  // left over from the feed would otherwise raise the keyboard as the sheet
  // opens, and the phone scrolls the page behind it.
  const [focusField, setFocusField] = useState(false)

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (!replyImageUrl && !uploadingReplyImage) {
      const result = findImageLink(value)
      if (result) {
        setReplyImageUrl(result.renderableUrl)
        setReplyText(value.replace(result.foundLink, '').trim())
        return
      }
    }
    setReplyText(value)
  }

  const refreshModal = async () => {
    const result = await onFetchComments(threadModalPostId)
    if (result?.commentsMap) {
      const fresh = result.commentsMap.get(threadModalComment.id)
      if (fresh) onSetComment(fresh)
    }
  }

  const submitAndRefresh = async (parentId: string) => {
    await onSubmitComment(threadModalPostId, parentId)
    await refreshModal()
  }

  const parentChain: Comment[] = []
  {
    let current = threadModalComment
    const allCommentsForPost = allComments[threadModalPostId] || []
    const commentsMap = new Map<string, Comment>()

    const buildMap = (comments: Comment[]) => {
      comments.forEach((c) => {
        commentsMap.set(c.id, c)
        if (c.replies) buildMap(c.replies)
      })
    }
    buildMap(allCommentsForPost)

    while (current.parent_comment_id) {
      const parent = commentsMap.get(current.parent_comment_id)
      if (parent) {
        parentChain.unshift(parent)
        current = parent
      } else {
        break
      }
    }
  }

  const renderEditor = (onSave: () => void) => (
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
          onClick={() => { setEditingCommentId(null); setEditText('') }}
          className="app-button-ghost app-button-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!editText.trim()}
          className="app-button-primary app-button-sm"
        >
          Save
        </button>
      </div>
    </div>
  )

  // The footer composer targets the reply picked with "Reply" when it belongs
  // to this thread, otherwise the focused comment.
  const nestedTarget = threadModalComment.replies?.find((r) => r.id === replyingTo)
  const target = nestedTarget ?? threadModalComment
  const targetUsername = target.profiles.username

  const replyComposer = (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm text-muted">
          Replying to <span className="font-semibold text-gray-50">@{targetUsername}</span>
        </span>
        {nestedTarget && (
          <button
            type="button"
            onClick={() => onSetReplyingTo(null)}
            className="app-button-ghost app-button-sm -mr-2 shrink-0"
          >
            Cancel
          </button>
        )}
      </div>
      <div className="flex items-end gap-1 rounded-2xl border border-line-soft bg-surface-sunken p-2 transition-colors focus-within:border-butter-400">
        <div className="min-w-0 flex-1">
          <AutoGrowTextarea
            key={target.id}
            minRows={1}
            maxRows={5}
            value={replyText}
            onChange={handleReplyChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !postingComment && replyText.trim()) {
                e.preventDefault()
                submitAndRefresh(target.id)
              }
            }}
            placeholder="Write a reply..."
            aria-label={`Reply to @${targetUsername}`}
            enterKeyHint="send"
            className="w-full border-none bg-transparent px-2 py-2.5 text-base leading-6 text-gray-50 placeholder:text-gray-500 focus:outline-none focus:ring-0"
            autoFocus={focusField && replyingTo === target.id}
          />
        </div>
        <div className="flex shrink-0 items-center">
          <label
            htmlFor="modal-reply-image"
            aria-label="Upload an image"
            className="app-icon-button cursor-pointer"
          >
            <ImageIcon size={18} />
            <input
              type="file"
              accept="image/*,image/gif"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadReplyImage(f) }}
              className="hidden"
              id="modal-reply-image"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowModalReplyGifPicker(true)}
            aria-label="Add a GIF"
            className="app-icon-button"
          >
            <span className="rounded border border-current px-1 text-xs font-bold leading-5">GIF</span>
          </button>
          <button
            type="button"
            onClick={() => submitAndRefresh(target.id)}
            disabled={(!replyText.trim() && !replyImageUrl && !uploadingReplyImage) || postingComment}
            aria-label="Send"
            className="app-button-primary !min-h-11 !w-11 !p-0 !rounded-full ml-1"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>

      {(replyImageUrl || uploadingReplyImage) && (
        <div className="mt-2">
          {uploadingReplyImage ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
              Uploading image...
            </div>
          ) : (
            <div className="flex items-start gap-1">
              <img loading="lazy" decoding="async" src={replyImageUrl} alt="Reply attachment" className="h-auto w-auto min-w-0 max-w-full max-h-20 rounded-lg border border-line-soft object-contain" />
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
  )

  return (
    <>
      <Sheet
        size="wide"
        title="Thread"
        onClose={onClose}
        footer={replyComposer}
      >
        <div className="space-y-4">
          {/* Parent Chain */}
          {parentChain.map((parentComment) => (
            <div key={parentComment.id} className="flex min-w-0 gap-3 opacity-60">
              <span className="app-avatar h-8 w-8 text-xs">
                <UserAvatar avatarUrl={parentComment.profiles.avatar_url} avatarCrop={parentComment.profiles.avatar_crop} username={parentComment.profiles.username} />
                {!parentComment.profiles.avatar_url && (
                  <span>{parentComment.profiles.username.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <div className="min-w-0 flex-1 rounded-xl bg-surface-sunken p-3">
                <ProfileLink
                  username={parentComment.profiles.username}
                  className="mb-1 inline-block text-sm font-semibold text-gray-50 transition-colors hover:text-accent-soft"
                  onClick={onClose}
                >
                  @{parentComment.profiles.username}
                </ProfileLink>
                <p className="break-words text-sm text-gray-200">{parentComment.content}</p>
                {parentComment.image_url && (
                  <img loading="lazy" decoding="async"
                    src={parentComment.image_url}
                    alt="Parent comment"
                    className="mt-2 max-h-48 max-w-full rounded-lg object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onSetComment(parentComment)}
                  className="app-button-ghost app-button-sm -ml-4 mt-1 text-accent-soft"
                >
                  View this thread
                </button>
              </div>
            </div>
          ))}

          {/* Focused Comment */}
          <div className="rounded-xl bg-accent/10 p-1 ring-1 ring-accent/30">
            <div className="flex gap-3">
              <span className="app-avatar h-10 w-10 text-sm">
                <UserAvatar avatarUrl={threadModalComment.profiles.avatar_url} avatarCrop={threadModalComment.profiles.avatar_crop} username={threadModalComment.profiles.username} />
                {!threadModalComment.profiles.avatar_url && (
                  <span>{threadModalComment.profiles.username.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <div className="min-w-0 flex-1 rounded-xl bg-surface-sunken p-3">
                <ProfileLink
                  username={threadModalComment.profiles.username}
                  className="mb-1 inline-block text-sm font-semibold text-gray-50 transition-colors hover:text-accent-soft"
                  onClick={() => {
                    onClose()
                    onSetReplyingTo(null)
                    setReplyText('')
                    setReplyImageUrl('')
                  }}
                >
                  @{threadModalComment.profiles.username}
                </ProfileLink>

                {editingCommentId === threadModalComment.id ? (
                  renderEditor(async () => {
                    await onUpdateComment(threadModalComment.id, threadModalPostId)
                    await refreshModal()
                  })
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-200">{threadModalComment.content}</p>
                )}

                {threadModalComment.image_url && !editingCommentId && (
                  <img loading="lazy" decoding="async"
                    src={threadModalComment.image_url}
                    alt="Comment attachment"
                    className="mt-3 max-h-96 max-w-full rounded-lg object-contain"
                  />
                )}

                <div className="-mb-2 -ml-2 mt-1 flex flex-wrap items-center gap-x-1">
                  <span className="px-2 text-xs text-muted">{formatTimeAgo(threadModalComment.created_at)}</span>
                  {!editingCommentId && (
                    <button
                      type="button"
                      onClick={() => onLikeComment(threadModalComment.id, threadModalPostId)}
                      aria-pressed={threadModalComment.is_liked}
                      aria-label={threadModalComment.is_liked ? 'Unlike comment' : 'Like comment'}
                      className={`flex min-h-11 items-center gap-1 px-2 text-xs font-semibold tabular-nums transition-colors ${
                        threadModalComment.is_liked ? 'text-accent-soft' : 'text-muted hover:text-gray-50'
                      }`}
                    >
                      <Heart size={14} className={threadModalComment.is_liked ? 'fill-current' : ''} />
                      {(threadModalComment.likes_count ?? 0) > 0 && <span>{threadModalComment.likes_count}</span>}
                    </button>
                  )}
                  {currentUserId === threadModalComment.user_id && !editingCommentId && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusField(true)
                          setEditingCommentId(threadModalComment.id)
                          setEditText(threadModalComment.content)
                        }}
                        className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-gray-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteComment(threadModalComment.id, threadModalPostId)
                          onClose()
                        }}
                        className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-danger"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* All Replies */}
          {threadModalComment.replies && threadModalComment.replies.length > 0 && (
            <div className="ml-4 space-y-3 border-l border-line-soft pl-3">
              {threadModalComment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <span className="app-avatar h-8 w-8 text-xs">
                    <UserAvatar avatarUrl={reply.profiles.avatar_url} avatarCrop={reply.profiles.avatar_crop} username={reply.profiles.username} />
                    {!reply.profiles.avatar_url && (
                      <span>{reply.profiles.username.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-xl bg-surface-sunken p-3">
                      <ProfileLink
                        username={reply.profiles.username}
                        className="mb-1 inline-block text-sm font-semibold text-gray-50 transition-colors hover:text-accent-soft"
                        onClick={onClose}
                      >
                        @{reply.profiles.username}
                      </ProfileLink>

                      {editingCommentId === reply.id ? (
                        renderEditor(async () => {
                          await onUpdateComment(reply.id, threadModalPostId)
                          setTimeout(refreshModal, 500)
                        })
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm text-gray-200">{reply.content}</p>
                      )}

                      {reply.image_url && !editingCommentId && (
                        <img loading="lazy" decoding="async"
                          src={reply.image_url}
                          alt="Reply attachment"
                          className="mt-2 max-h-64 max-w-full rounded-lg object-contain"
                        />
                      )}

                      <div className="-mb-2 -ml-2 mt-1 flex flex-wrap items-center gap-x-1">
                        <span className="px-2 text-xs text-muted">{formatTimeAgo(reply.created_at)}</span>
                        {!editingCommentId && (
                          <>
                            <button
                              type="button"
                              onClick={() => onLikeComment(reply.id, threadModalPostId)}
                              aria-pressed={reply.is_liked}
                              aria-label={reply.is_liked ? 'Unlike comment' : 'Like comment'}
                              className={`flex min-h-11 items-center gap-1 px-2 text-xs font-semibold tabular-nums transition-colors ${
                                reply.is_liked ? 'text-accent-soft' : 'text-muted hover:text-gray-50'
                              }`}
                            >
                              <Heart size={14} className={reply.is_liked ? 'fill-current' : ''} />
                              {(reply.likes_count ?? 0) > 0 && <span>{reply.likes_count}</span>}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setFocusField(true); onSetReplyingTo(reply.id) }}
                              className="min-h-11 px-2 text-xs font-semibold text-accent-soft"
                            >
                              Reply
                            </button>
                            {currentUserId === reply.user_id && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setFocusField(true); setEditingCommentId(reply.id); setEditText(reply.content) }}
                                  className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-gray-50"
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteComment(reply.id, threadModalPostId)
                                    setTimeout(refreshModal, 500)
                                  }}
                                  className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-danger"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </>
                            )}
                            {reply.replies && reply.replies.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onSetComment(reply)}
                                className="flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-muted transition-colors hover:text-gray-50"
                              >
                                <MessageCircle size={14} />
                                {reply.replies.length} {reply.replies.length === 1 ? 'reply' : 'replies'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sheet>

      {/* Modal Reply GIF Picker (renders its own sheet) */}
      {showModalReplyGifPicker && (
        <GifPicker
          onSelect={(gifUrl) => {
            setReplyImageUrl(gifUrl)
            setShowModalReplyGifPicker(false)
          }}
          onClose={() => setShowModalReplyGifPicker(false)}
        />
      )}
    </>
  )
}

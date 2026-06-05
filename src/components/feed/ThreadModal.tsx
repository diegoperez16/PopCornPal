import { X, RefreshCw, Pencil, Trash2, ArrowUp, Image as ImageIcon, MessageCircle, Heart } from 'lucide-react'
import GifPicker from '../GifPicker'
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
  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
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

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
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
                  refreshModal()
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Refresh thread"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  onClose()
                  onSetReplyingTo(null)
                  setReplyText('')
                  setReplyImageUrl('')
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-4 space-y-4">
            {/* Parent Chain */}
            {(() => {
              const parentChain: Comment[] = []
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

              return parentChain.map((parentComment) => (
                <div key={parentComment.id} className="flex gap-3 opacity-60 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden min-w-0">
                    <UserAvatar avatarUrl={parentComment.profiles.avatar_url} avatarCrop={parentComment.profiles.avatar_crop} username={parentComment.profiles.username} />
                    {!parentComment.profiles.avatar_url && (
                      <span className="text-white text-xs font-bold">
                        {parentComment.profiles.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-800/30 rounded-lg p-3 min-w-0">
                      <ProfileLink
                        username={parentComment.profiles.username}
                        className="text-sm font-semibold text-gray-300 hover:text-red-400 transition-colors inline-block mb-1 min-w-0"
                        onClick={onClose}
                      >
                        @{parentComment.profiles.username}
                      </ProfileLink>
                      <p className="text-sm text-gray-400 break-words overflow-wrap-anywhere">{parentComment.content}</p>
                      {parentComment.image_url && (
                        <div className="mt-2">
                          <img loading="lazy" decoding="async"
                            src={parentComment.image_url}
                            alt="Parent comment"
                            className="max-w-full rounded-lg max-h-48 object-contain"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => onSetComment(parentComment)}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                      >
                        View this thread
                      </button>
                    </div>
                  </div>
                </div>
              ))
            })()}

            {/* Focused Comment */}
            <div className="flex gap-3 border-l-2 border-red-500 pl-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <UserAvatar avatarUrl={threadModalComment.profiles.avatar_url} avatarCrop={threadModalComment.profiles.avatar_crop} username={threadModalComment.profiles.username} />
                {!threadModalComment.profiles.avatar_url && (
                  <span className="text-white text-sm font-bold">
                    {threadModalComment.profiles.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <ProfileLink
                    username={threadModalComment.profiles.username}
                    className="text-sm font-semibold text-white hover:text-red-400 transition-colors inline-block mb-1"
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
                          onClick={() => { setEditingCommentId(null); setEditText('') }}
                          className="text-xs text-gray-400 hover:text-white px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            await onUpdateComment(threadModalComment.id, threadModalPostId)
                            await refreshModal()
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
                      <img loading="lazy" decoding="async"
                        src={threadModalComment.image_url}
                        alt="Comment attachment"
                        className="max-w-full rounded-lg max-h-96 object-contain"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs text-gray-500">{formatTimeAgo(threadModalComment.created_at)}</p>
                    {!editingCommentId && (
                      <button
                        onClick={() => onLikeComment(threadModalComment.id, threadModalPostId)}
                        className={`text-xs flex items-center gap-1 transition-colors active:scale-95 ${
                          threadModalComment.is_liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${threadModalComment.is_liked ? 'fill-current' : ''}`} />
                        {(threadModalComment.likes_count ?? 0) > 0 && <span>{threadModalComment.likes_count}</span>}
                      </button>
                    )}
                    {currentUserId === threadModalComment.user_id && !editingCommentId && (
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
                            await onDeleteComment(threadModalComment.id, threadModalPostId)
                            onClose()
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

                {/* Reply to focused comment */}
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
                              submitAndRefresh(threadModalComment.id)
                            }
                          }}
                          placeholder={`Reply to @${threadModalComment.profiles.username}...`}
                          rows={1}
                          className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
                          autoFocus
                        />
                      </div>
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
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadReplyImage(f) }}
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
                          onClick={() => submitAndRefresh(threadModalComment.id)}
                          disabled={(!replyText.trim() && !replyImageUrl && !uploadingReplyImage) || postingComment}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {(replyImageUrl || uploadingReplyImage) && (
                      <div className="mt-2 ml-2">
                        {uploadingReplyImage ? (
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                            Uploading image...
                          </div>
                        ) : (
                          <div className="relative inline-block group">
                            <img loading="lazy" decoding="async" src={replyImageUrl} alt="Reply attachment" className="h-20 rounded-lg border border-gray-700" />
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
                    onClick={() => onSetReplyingTo(threadModalComment.id)}
                    className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Reply to @{threadModalComment.profiles.username}
                  </button>
                )}

                {/* All Replies */}
                {threadModalComment.replies && threadModalComment.replies.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {threadModalComment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <UserAvatar avatarUrl={reply.profiles.avatar_url} avatarCrop={reply.profiles.avatar_crop} username={reply.profiles.username} />
                          {!reply.profiles.avatar_url && (
                            <span className="text-white text-xs font-bold">
                              {reply.profiles.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-800/30 rounded-lg p-3">
                            <ProfileLink
                              username={reply.profiles.username}
                              className="text-sm font-semibold text-white hover:text-red-400 transition-colors inline-block mb-1"
                              onClick={onClose}
                            >
                              @{reply.profiles.username}
                            </ProfileLink>

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
                                    onClick={() => { setEditingCommentId(null); setEditText('') }}
                                    className="text-xs text-gray-400 hover:text-white px-2 py-1"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await onUpdateComment(reply.id, threadModalPostId)
                                      setTimeout(refreshModal, 500)
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
                                <img loading="lazy" decoding="async"
                                  src={reply.image_url}
                                  alt="Reply attachment"
                                  className="max-w-full rounded-lg max-h-64 object-contain"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-gray-500">{formatTimeAgo(reply.created_at)}</p>
                              {!editingCommentId && (
                                <>
                                  <button
                                    onClick={() => onLikeComment(reply.id, threadModalPostId)}
                                    className={`text-xs flex items-center gap-1 transition-colors active:scale-95 ${
                                      reply.is_liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
                                    }`}
                                  >
                                    <Heart className={`w-3 h-3 ${reply.is_liked ? 'fill-current' : ''}`} />
                                    {(reply.likes_count ?? 0) > 0 && <span>{reply.likes_count}</span>}
                                  </button>
                                  <button
                                    onClick={() => onSetReplyingTo(reply.id)}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    Reply
                                  </button>
                                  {currentUserId === reply.user_id && (
                                    <>
                                      <button
                                        onClick={() => { setEditingCommentId(reply.id); setEditText(reply.content) }}
                                        className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                      >
                                        <Pencil className="w-3 h-3" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={async () => {
                                          await onDeleteComment(reply.id, threadModalPostId)
                                          setTimeout(refreshModal, 500)
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
                                      onClick={() => onSetComment(reply)}
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

                          {/* Reply input for this reply */}
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
                                        submitAndRefresh(reply.id)
                                      }
                                    }}
                                    placeholder={`Reply to @${reply.profiles.username}...`}
                                    rows={1}
                                    className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2 px-2"
                                    autoFocus
                                  />
                                </div>
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
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadReplyImage(f) }}
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
                                    onClick={() => submitAndRefresh(reply.id)}
                                    disabled={(!replyText.trim() && !replyImageUrl && !uploadingReplyImage) || postingComment}
                                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-500/20 ml-1"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {(replyImageUrl || uploadingReplyImage) && (
                                <div className="mt-2 ml-2">
                                  {uploadingReplyImage ? (
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                      <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                                      Uploading image...
                                    </div>
                                  ) : (
                                    <div className="relative inline-block group">
                                      <img loading="lazy" decoding="async" src={replyImageUrl} alt="Reply attachment" className="h-20 rounded-lg border border-gray-700" />
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

      {/* Modal Reply GIF Picker */}
      {showModalReplyGifPicker && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowModalReplyGifPicker(false)}
        >
          <GifPicker
            onSelect={(gifUrl) => {
              setReplyImageUrl(gifUrl)
              setShowModalReplyGifPicker(false)
            }}
            onClose={() => setShowModalReplyGifPicker(false)}
          />
        </div>
      )}
    </>
  )
}

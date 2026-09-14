import { memo, type ReactNode } from 'react'
import {
  Book,
  Clock,
  Film,
  Gamepad2,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Tv,
  User,
} from 'lucide-react'
import UserAvatar from '../UserAvatar'
import VerdictMark from '../../features/verdict/VerdictMark'
import HouseRing from '../../features/house/HouseRing'
import { verdictFor } from '../../features/verdict/verdictModel'
import ProfileLink from '../ProfileLink'
import ProgressiveImg from '../ProgressiveImg'
import type { Post } from '../../store/socialStore'
import { formatTimeAgo, wasEdited } from './feedTypes'
import { renderMentionText } from '../../lib/mentions'

type FeedPostCardProps = {
  post: Post
  index: number
  currentUserId?: string
  isExpanded: boolean
  onDeletePost: (postId: string) => void
  onLikePost: (postId: string, isLiked: boolean) => void
  onToggleComments: (postId: string) => void
  onSharePost: (post: Post) => void
  expandedContent?: ReactNode
}

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

function FeedPostCardComponent({
  post,
  currentUserId,
  isExpanded,
  onDeletePost,
  onLikePost,
  onToggleComments,
  onSharePost,
  expandedContent,
}: FeedPostCardProps) {
  const postVerdict = post.media_entries
    ? verdictFor(
        post.media_entries.rating,
        Boolean(post.media_entries.dumpstered)
      )
    : null
  return (
    <div className="app-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <HouseRing house={post.profiles.house}>
          <span className="app-avatar h-10 w-10">
            {post.profiles.avatar_url ? (
              <UserAvatar
                avatarUrl={post.profiles.avatar_url}
                avatarCrop={post.profiles.avatar_crop}
                username={post.profiles.username}
              />
            ) : (
              <User size={18} />
            )}
          </span>
        </HouseRing>
        <div className="min-w-0 flex-1">
          <ProfileLink
            username={post.profiles.username}
            currentUserId={currentUserId}
            className="inline-block font-semibold text-gray-50 transition-colors hover:text-accent-soft"
          >
            @{post.profiles.username}
          </ProfileLink>
          <p className="flex items-center gap-1 text-xs text-muted">
            <Clock size={12} />
            {formatTimeAgo(post.created_at)}
            {wasEdited(post.created_at, post.updated_at) && (
              <span className="italic">(edited)</span>
            )}
          </p>
        </div>
        {post.user_id === currentUserId && (
          <button
            type="button"
            onClick={() => onDeletePost(post.id)}
            aria-label="Delete post"
            className="app-icon-button -mr-2 hover:text-danger"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-200">
        {renderMentionText(post.content)}
      </p>

      {post.image_url && (
        <div className="mb-3 overflow-hidden rounded-xl bg-surface-sunken">
          <ProgressiveImg
            src={post.image_url}
            alt="Post attachment"
            className="mx-auto h-auto w-auto max-w-full max-h-[min(70vh,640px)] object-contain"
          />
        </div>
      )}

      {post.media_entries && (
        <div className="mb-3 flex items-stretch overflow-hidden rounded-xl border border-line-soft">
          <div className="flex min-w-0 flex-1 items-center gap-3 bg-surface-sunken p-3">
            {post.media_entries.cover_image_url ? (
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                <ProgressiveImg
                  src={post.media_entries.cover_image_url}
                  alt={post.media_entries.title}
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (() => {
              const Icon = getMediaIcon(post.media_entries.media_type)
              return <Icon size={20} className="shrink-0 text-muted" />
            })()}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-50">{post.media_entries.title}</p>
              <p className="text-sm capitalize text-muted">{post.media_entries.media_type}</p>
            </div>
          </div>
          {postVerdict && (
            <div
              className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 bg-butter-gold py-1 text-ink"
              title={postVerdict.name}
            >
              <VerdictMark verdict={postVerdict.id} size={26} />
              <span className="text-xs font-bold leading-none tabular-nums">
                {post.media_entries.dumpstered
                  ? postVerdict.name
                  : post.media_entries.rating}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-line-soft pt-2">
        <button
          type="button"
          aria-label={post.is_liked ? "Unlike post" : "Like post"}
          aria-pressed={post.is_liked}
          onClick={() => onLikePost(post.id, post.is_liked)}
          className={`flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums transition-colors ${
            post.is_liked
              ? 'bg-accent/15 text-accent-bright'
              : 'text-muted hover:bg-surface-strong hover:text-gray-50'
          }`}
        >
          <Heart
            size={16}
            className={post.is_liked ? 'fill-current heart-animate' : ''}
          />
          {post.likes_count > 0 && <span>{post.likes_count}</span>}
        </button>
        <button
          type="button"
          aria-label={`Comments on ${post.profiles.username}’s post`}
          aria-expanded={isExpanded}
          onClick={() => onToggleComments(post.id)}
          className={`flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums transition-colors ${
            isExpanded
              ? 'bg-butter-400/15 text-butter-300'
              : 'text-muted hover:bg-surface-strong hover:text-gray-50'
          }`}
        >
          <MessageCircle size={16} />
          {post.comments_count > 0 && <span>{post.comments_count}</span>}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          aria-label="Share post"
          onClick={() => onSharePost(post)}
          className="app-icon-button !rounded-full"
        >
          <Share2 size={16} />
        </button>
      </div>

      {isExpanded ? expandedContent : null}
    </div>
  )
}

const FeedPostCard = memo(FeedPostCardComponent)

export default FeedPostCard

import { memo, type ReactNode } from 'react'
import {
  ArrowUpRight,
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
  index,
  currentUserId,
  isExpanded,
  onDeletePost,
  onLikePost,
  onToggleComments,
  onSharePost,
  expandedContent,
}: FeedPostCardProps) {
  return (
    <div
      className="app-panel rounded-2xl p-4 sm:p-5 fade-in"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-10 h-10 rounded-full bg-[#665450] flex items-center justify-center overflow-hidden flex-shrink-0">
          {post.profiles.avatar_url ? (
            <UserAvatar
              avatarUrl={post.profiles.avatar_url}
              avatarCrop={post.profiles.avatar_crop}
              username={post.profiles.username}
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <ProfileLink
            username={post.profiles.username}
            currentUserId={currentUserId}
            className="font-semibold hover:text-red-400 transition-colors inline-block"
          >
            @{post.profiles.username}
          </ProfileLink>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(post.created_at)}
            {wasEdited(post.created_at, post.updated_at) && (
              <span className="text-gray-600 italic">(edited)</span>
            )}
          </p>
        </div>
        {post.user_id === currentUserId && (
          <button
            onClick={() => onDeletePost(post.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-gray-200 leading-relaxed mb-2.5 whitespace-pre-wrap text-sm">
        {renderMentionText(post.content)}
      </p>

      {post.image_url && (
        <div className="mb-2.5 rounded-xl overflow-hidden bg-[#17120d]">
          <ProgressiveImg
            src={post.image_url}
            alt="Post attachment"
            className="mx-auto h-auto w-auto max-w-full max-h-[min(70vh,640px)] object-contain"
          />
        </div>
      )}

      {post.media_entries && (
        <div className="mb-2.5 flex items-stretch rounded-xl overflow-hidden border border-white/6">
          <div className="bg-white/[0.03] flex-1 flex items-center gap-3 p-3 min-w-0">
            {post.media_entries.cover_image_url ? (
              <div className="w-14 h-20 flex-shrink-0 rounded overflow-hidden">
                <ProgressiveImg
                  src={post.media_entries.cover_image_url}
                  alt={post.media_entries.title}
                  wrapperClassName="h-full w-full"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (() => {
              const Icon = getMediaIcon(post.media_entries.media_type)
              return <Icon className="w-5 h-5 text-red-400 flex-shrink-0" />
            })()}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{post.media_entries.title}</p>
              <p className="text-sm text-gray-400 capitalize">{post.media_entries.media_type}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
          </div>
          {post.media_entries.rating != null && (
            <div className="w-12 flex-shrink-0 bg-[#dfc59f] !text-[#201916] flex items-center justify-center">
              <span className="text-[#201916] text-base font-bold tabular-nums">
                {post.media_entries.rating}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 pt-2 border-t border-white/5">
        <button
          aria-label={post.is_liked ? "Unlike post" : "Like post"}
          aria-pressed={post.is_liked}
          onClick={() => onLikePost(post.id, post.is_liked)}
          className={`flex items-center gap-1.5 min-h-11 min-w-11 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
            post.is_liked
              ? 'bg-red-500/15 text-red-400'
              : 'text-gray-500 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${
              post.is_liked ? 'fill-current heart-animate' : ''
            }`}
          />
          {post.likes_count > 0 && <span>{post.likes_count}</span>}
        </button>
        <button
          aria-label={`Comments on ${post.profiles.username}’s post`}
          aria-expanded={isExpanded}
          onClick={() => onToggleComments(post.id)}
          className={`flex items-center gap-1.5 min-h-11 min-w-11 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
            isExpanded
              ? 'bg-blue-500/15 text-blue-400'
              : 'text-gray-500 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          {post.comments_count > 0 && <span>{post.comments_count}</span>}
        </button>
        <div className="flex-1" />
        <button
          aria-label="Share post"
          onClick={() => onSharePost(post)}
          className="min-h-11 min-w-11 flex items-center justify-center p-1.5 text-gray-400 hover:text-gray-300 rounded-full hover:bg-gray-700/50 transition-colors active:scale-95"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded ? expandedContent : null}
    </div>
  )
}

const FeedPostCard = memo(FeedPostCardComponent)

export default FeedPostCard

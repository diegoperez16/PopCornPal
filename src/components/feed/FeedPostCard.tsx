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
      className="bg-gray-800/40 backdrop-blur-sm border border-white/6 rounded-2xl p-4 fade-in transition-colors hover:bg-gray-800/60"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
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
        <div className="mb-2.5 rounded-xl overflow-hidden">
          <ProgressiveImg
            src={post.image_url}
            alt="Post attachment"
            className="w-full max-h-[360px] object-cover"
          />
        </div>
      )}

      {post.media_entries && (
        <div className="mb-2.5 flex items-stretch rounded-xl overflow-hidden border border-white/6">
          <div className="bg-white/[0.03] flex-1 flex items-center gap-2.5 p-2.5 min-w-0">
            {post.media_entries.cover_image_url ? (
              <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden">
                <ProgressiveImg
                  src={post.media_entries.cover_image_url}
                  alt={post.media_entries.title}
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
            <div className="w-12 flex-shrink-0 bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <span className="text-white text-base font-bold tabular-nums">
                {post.media_entries.rating}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 pt-2 border-t border-white/5">
        <button
          onClick={() => onLikePost(post.id, post.is_liked)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
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
          onClick={() => onToggleComments(post.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
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
          onClick={() => onSharePost(post)}
          className="p-1.5 text-gray-600 hover:text-gray-300 rounded-full hover:bg-gray-700/50 transition-colors active:scale-95"
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

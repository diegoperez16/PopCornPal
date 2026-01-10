import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase, type UserBadge } from '../lib/supabase'
import { Film, Tv, Gamepad2, Book, Users, UserPlus, UserCheck, ArrowLeft, Loader2, Heart, MessageCircle, Star, User } from 'lucide-react'

type UserProfile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

type MediaEntry = {
  id: string
  title: string
  media_type: 'movie' | 'show' | 'game' | 'book'
  status: 'completed' | 'in-progress' | 'planned' | 'logged'
  rating: number | null
  cover_image_url: string | null
  created_at: string
  completed_date: string | null
}

type Post = {
  id: string
  content: string
  media_entry_id: string | null
  created_at: string
  likes_count: number
  comments_count: number
  user_liked: boolean
  media_entries?: {
    title: string
    media_type: 'movie' | 'show' | 'game' | 'book'
    rating: number | null
    cover_image_url: string | null
  }
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuthStore()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([])
  const [entryCounts, setEntryCounts] = useState({ movie: 0, show: 0, game: 0, book: 0 })
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [filterType, setFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)

  useEffect(() => {
    if (username) {
      Promise.all([
        fetchUserProfile(),
      ]).finally(() => setInitialLoading(false))
    }
  }, [username])

  const fetchUserBadges = async (userId: string) => {
    const { data } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId)
    
    if (data) {
      setUserBadges(data as UserBadge[])
    }
  }

  const fetchUserProfile = async () => {
    if (!username) return
    setLoading(true)

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch user's badges
      await fetchUserBadges(profileData.id)

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          media_entries:media_entry_id (title, media_type, rating, cover_image_url)
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (postsError) throw postsError

      // Fetch likes and comments counts for each post
      const postsWithCounts = await Promise.all(
        (postsData || []).map(async (post) => {
          const [{ count: likesCount }, { count: commentsCount }, { data: userLike }] = await Promise.all([
            supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            currentUser ? supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', currentUser.id).single() : { data: null }
          ])

          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_liked: !!userLike
          }
        })
      )

      setPosts(postsWithCounts)

      // Fetch media entries - only logged items for library
      const { data: entries, error: entriesError } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('status', 'logged')
        .order('created_at', { ascending: false })

      if (entriesError) throw entriesError
      setMediaEntries(entries || [])

      // Calculate entry counts - only logged items
      const counts = { movie: 0, show: 0, game: 0, book: 0 }
      entries?.forEach(entry => {
        counts[entry.media_type as keyof typeof counts]++
      })
      setEntryCounts(counts)

      // Fetch follow counts
      const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
        supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileData.id),
        supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileData.id)
      ])

      setFollowersCount(followersCount || 0)
      setFollowingCount(followingCount || 0)

      // Check if current user is following this profile
      if (currentUser && currentUser.id !== profileData.id) {
        const { count, error: followCheckError } = await supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileData.id)
        
        // Set to true if we found a follow record (count > 0)
        setIsFollowing(!followCheckError && (count || 0) > 0)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser || !profile || followLoading) return
    setFollowLoading(true)

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)

        if (error) throw error
        setIsFollowing(false)
        setFollowersCount(prev => prev - 1)
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profile.id
          })

        if (error) throw error
        setIsFollowing(true)
        setFollowersCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!currentUser) return

    const post = posts.find(p => p.id === postId)
    if (!post) return

    try {
      if (post.user_liked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id)

        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1, user_liked: false } : p))
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          })

        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_liked: true } : p))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'movie': return Film
      case 'show': return Tv
      case 'game': return Gamepad2
      case 'book': return Book
      default: return Film
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          {/* Animated Icons */}
          <div className="mb-8 relative flex items-center justify-center gap-6">
            <Users className="w-16 h-16 text-purple-500 animate-pulse" />
            <div className="relative">
              <User className="w-20 h-20 text-pink-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
            </div>
            <Film className="w-16 h-16 text-red-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          {/* Loading Text */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              Loading profile...
            </h2>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">User not found</h2>
          <p className="text-gray-400 mb-6">This user doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      {/* Loading Bar */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-800">
          <div className="h-full bg-gradient-to-r from-red-500 to-pink-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Profile Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-4xl font-bold shadow-lg shadow-red-500/20">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.username} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = profile.username.charAt(0).toUpperCase()
                    }}
                  />
                ) : (
                  profile.username.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">@{profile.username}</h2>
                  {profile.full_name && (
                    <p className="text-gray-400">{profile.full_name}</p>
                  )}
                  
                  {/* Badges */}
                  {userBadges.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                      {userBadges.map((userBadge) => {
                        const badge = userBadge.badges!
                        
                        // Map color to gradient and glow
                        const colorEffects: Record<string, { gradient: string, glow: string }> = {
                          'purple-500': { gradient: 'from-purple-600 via-purple-500 to-pink-500', glow: 'shadow-purple-500/50' },
                          'blue-500': { gradient: 'from-blue-600 via-cyan-500 to-blue-400', glow: 'shadow-blue-500/50' },
                          'green-500': { gradient: 'from-green-600 via-emerald-500 to-green-400', glow: 'shadow-green-500/50' },
                          'green-600': { gradient: 'from-green-600 via-emerald-500 to-green-400', glow: 'shadow-green-500/50' },
                          'yellow-500': { gradient: 'from-yellow-500 via-yellow-400 to-orange-500', glow: 'shadow-yellow-500/50' },
                          'pink-500': { gradient: 'from-pink-600 via-pink-500 to-rose-500', glow: 'shadow-pink-500/50' },
                          'indigo-500': { gradient: 'from-indigo-600 via-purple-500 to-indigo-400', glow: 'shadow-indigo-500/50' },
                          'red-500': { gradient: 'from-red-600 via-red-500 to-pink-500', glow: 'shadow-red-500/50' },
                          'red-400': { gradient: 'from-red-600 via-orange-500 to-red-400', glow: 'shadow-red-500/50' },
                          'red-600': { gradient: 'from-red-700 via-red-600 to-red-500', glow: 'shadow-red-600/50' },
                          'blue-600': { gradient: 'from-blue-700 via-blue-600 to-slate-600', glow: 'shadow-blue-600/50' },
                          'orange-500': { gradient: 'from-orange-600 via-orange-500 to-yellow-500', glow: 'shadow-orange-500/50' },
                          'cyan-500': { gradient: 'from-cyan-600 via-cyan-500 to-blue-400', glow: 'shadow-cyan-500/50' },
                          'lime-500': { gradient: 'from-lime-600 via-lime-500 to-green-400', glow: 'shadow-lime-500/50' },
                          'rose-500': { gradient: 'from-rose-600 via-rose-500 to-pink-500', glow: 'shadow-rose-500/50' },
                          'slate-500': { gradient: 'from-slate-600 via-slate-500 to-gray-500', glow: 'shadow-slate-500/50' },
                          'emerald-500': { gradient: 'from-emerald-600 via-emerald-500 to-green-400', glow: 'shadow-emerald-500/50' },
                          'teal-500': { gradient: 'from-teal-600 via-teal-500 to-cyan-400', glow: 'shadow-teal-500/50' },
                          'sky-500': { gradient: 'from-sky-600 via-sky-500 to-blue-400', glow: 'shadow-sky-500/50' },
                          'violet-500': { gradient: 'from-violet-600 via-violet-500 to-purple-400', glow: 'shadow-violet-500/50' },
                          'fuchsia-500': { gradient: 'from-fuchsia-600 via-fuchsia-500 to-pink-500', glow: 'shadow-fuchsia-500/50' },
                          'amber-500': { gradient: 'from-amber-600 via-amber-500 to-orange-400', glow: 'shadow-amber-500/50' },
                        }
                        
                        const effects = colorEffects[badge.color] || { 
                          gradient: 'from-gray-600 via-gray-500 to-gray-400', 
                          glow: 'shadow-gray-500/50' 
                        }
                        
                        return (
                          <div
                            key={userBadge.id}
                            className={`relative overflow-hidden rounded-lg shadow-lg ${effects.glow} transform hover:scale-105 transition-transform`}
                          >
                            {/* Animated GIF Background (if exists, use it instead of gradient) */}
                            {badge.gif_url ? (
                              <div className="absolute inset-0" style={{ opacity: (badge.opacity || 80) / 100 }}>
                                <img 
                                  src={badge.gif_url} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              /* Gradient Overlay (only if no GIF) */
                              <div className={`absolute inset-0 bg-gradient-to-br ${effects.gradient}`} style={{ opacity: (badge.opacity || 80) / 100 }}></div>
                            )}
                            {/* Badge Content */}
                            <div className="relative px-3 py-1.5 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                              <span className="text-xs font-bold text-white tracking-wide uppercase drop-shadow-lg">
                                {badge.name}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Follow Button */}
                {!isOwnProfile && currentUser && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
                    }`}
                  >
                    {followLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Bio */}
              {profile.bio ? (
                <p className="text-gray-300 text-center sm:text-left">{profile.bio}</p>
              ) : (
                <p className="text-gray-500 italic text-center sm:text-left">No bio yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Movies', count: entryCounts.movie, icon: Film, type: 'movie' as const },
            { label: 'Shows', count: entryCounts.show, icon: Tv, type: 'show' as const },
            { label: 'Games', count: entryCounts.game, icon: Gamepad2, type: 'game' as const },
            { label: 'Books', count: entryCounts.book, icon: Book, type: 'book' as const },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setFilterType(filterType === stat.type ? null : stat.type)}
              className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-4 sm:p-6 text-center group hover:border-gray-600 transition-all cursor-pointer ${
                filterType === stat.type ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-700'
              }`}
            >
              <stat.icon className="w-6 h-6 mx-auto mb-2 text-gray-500 group-hover:text-white transition-colors" />
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                {stat.count}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* Social Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4 sm:p-6 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {followersCount}
            </div>
            <div className="text-gray-400 text-xs sm:text-sm mt-1">Followers</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4 sm:p-6 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {followingCount}
            </div>
            <div className="text-gray-400 text-xs sm:text-sm mt-1">Following</div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Posts ({posts.length})</h3>
          </div>

          {/* View Library Button */}
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="w-full mb-4 bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-xl p-4 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Book className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-gray-300 group-hover:text-white font-medium transition-colors">
                {showLibrary ? 'Hide' : 'View'} {profile.username}'s Library
              </span>
            </div>
            <span className="text-gray-500 group-hover:text-gray-300 transition-colors">{showLibrary ? '↓' : '→'}</span>
          </button>
          
          {posts.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-8 text-center">
              <p className="text-gray-500">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                return (
                  <div key={post.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                          ) : (
                            profile.username.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">@{profile.username}</span>
                          <span className="text-gray-500 text-sm">·</span>
                          <span className="text-gray-500 text-sm">
                            {new Date(post.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{post.content}</p>
                        
                        {/* Media Entry */}
                        {post.media_entries && (
                          <div className="bg-gray-900/50 rounded-lg p-3 mb-4 flex items-center gap-3">
                            {post.media_entries.cover_image_url && (
                              <div className="w-16 h-20 flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                                <img 
                                  src={post.media_entries.cover_image_url} 
                                  alt={post.media_entries.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}
                            {!post.media_entries.cover_image_url && (() => {
                              const Icon = getMediaIcon(post.media_entries.media_type)
                              return <Icon className="w-5 h-5 text-red-400 flex-shrink-0" />
                            })()}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{post.media_entries.title}</p>
                              <p className="text-sm text-gray-400 capitalize">{post.media_entries.media_type}</p>
                            </div>
                            {post.media_entries.rating && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-yellow-400">★</span>
                                <span className="font-semibold">{post.media_entries.rating}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Post Actions */}
                        <div className="flex items-center gap-6 pt-3 border-t border-gray-700">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-2 transition-colors ${
                              post.user_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${post.user_liked ? 'fill-current' : ''}`} />
                            <span className="text-sm">{post.likes_count}</span>
                          </button>
                          <div className="flex items-center gap-2 text-gray-400">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm">{post.comments_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Library Section - Expandable */}
        {showLibrary && mediaEntries.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">
              {profile.username}'s Library ({filterType ? mediaEntries.filter(e => e.media_type === filterType).length : mediaEntries.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(filterType ? mediaEntries.filter(e => e.media_type === filterType) : mediaEntries).map((entry) => {
                const Icon = getMediaIcon(entry.media_type)
                return (
                  <div
                    key={entry.id}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all group"
                  >
                    {/* Cover Image or Icon */}
                    <div className="aspect-[2/3] bg-gray-900/50 flex items-center justify-center relative overflow-hidden">
                      {entry.cover_image_url ? (
                        <img
                          src={entry.cover_image_url}
                          alt={entry.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <Icon className="w-12 h-12 text-gray-600" />
                      )}
                      {/* Rating Badge */}
                      {entry.rating && (
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-xs font-semibold text-white">{entry.rating}</span>
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <div className="p-3">
                      <p className="font-semibold text-sm text-white line-clamp-2 group-hover:text-red-400 transition-colors">
                        {entry.title}
                      </p>
                      <p className="text-xs text-gray-400 capitalize mt-1">{entry.media_type}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

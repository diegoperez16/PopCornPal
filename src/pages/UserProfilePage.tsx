import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase, type UserBadge } from '../lib/supabase'
import { Film, Tv, Gamepad2, Book, Users, UserPlus, UserCheck, ArrowLeft, Loader2, Heart, MessageCircle, User, Crown, Beaker } from 'lucide-react'

type UserProfile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  bg_url: string | null
  bg_opacity: number | null
  created_at: string
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
  
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (username) {
      fetchUserProfile().finally(() => setInitialLoading(false))
    }
  }, [username])

  const fetchUserProfile = async () => {
    if (!username) return
    setLoading(true)

    try {
      // 1. Fetch Profile First
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // 2. Parallelize all other independent queries
      const [
        badgesResult,
        postsResult,
        followersResult,
        followingResult,
        currentUserFollowResult
      ] = await Promise.all([
        // A. Fetch Badges
        supabase
          .from('user_badges')
          .select('*, badges(*)')
          .eq('user_id', profileData.id),

        // B. Fetch Posts
        supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (username, avatar_url),
            media_entries:media_entry_id (title, media_type, rating, cover_image_url),
            likes:post_likes(count),
            comments:post_comments(count)
          `)
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(50),

        // C. Fetch Followers Count
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),

        // D. Fetch Following Count
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),

        // E. Check if WE follow THEM
        currentUser && currentUser.id !== profileData.id
          ? supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', currentUser.id).eq('following_id', profileData.id)
          : Promise.resolve({ count: 0, error: null })
      ])

      // 3. Process Badges
      if (badgesResult.data) {
        setUserBadges(badgesResult.data as UserBadge[])
      }

      // 4. Process Follow Counts
      setFollowersCount(followersResult.count || 0)
      setFollowingCount(followingResult.count || 0)
      setIsFollowing((currentUserFollowResult.count || 0) > 0)

      // 5. Process Posts
      if (postsResult.data) {
        const rawPosts = postsResult.data
        const postIds = rawPosts.map(p => p.id)
        let likedPostIds = new Set<string>()

        if (currentUser && postIds.length > 0) {
          const { data: userLikes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', postIds)
          
          if (userLikes) {
            userLikes.forEach(like => likedPostIds.add(like.post_id))
          }
        }

        const formattedPosts: Post[] = rawPosts.map((post: any) => ({
          ...post,
          likes_count: post.likes?.[0]?.count || 0,
          comments_count: post.comments?.[0]?.count || 0,
          user_liked: likedPostIds.has(post.id)
        }))

        setPosts(formattedPosts)
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
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)

        if (error) throw error
        setIsFollowing(false)
        setFollowersCount(prev => prev - 1)
      } else {
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
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id)

        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1, user_liked: false } : p))
      } else {
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

  // --- LOGIC TO SPLIT BADGES ---
  const creatorBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'creator')
  const alphaBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'alpha tester')
  
  // Filter out special badges from the regular list so they don't show twice
  const regularBadges = userBadges.filter(ub => {
    const name = ub.badges?.name.toLowerCase()
    return name !== 'creator' && name !== 'alpha tester'
  })

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8 relative flex items-center justify-center gap-6">
            <Users className="w-16 h-16 text-purple-500 animate-pulse" />
            <div className="relative">
              <User className="w-20 h-20 text-pink-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
            </div>
            <Film className="w-16 h-16 text-red-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
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
        <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 sm:p-8 mb-6 overflow-hidden">
          {/* Background Image */}
          {profile.bg_url && (
            <div
              className="absolute inset-0 z-0"
              style={{
                opacity: (profile.bg_opacity || 80) / 100,
              }}
            >
              <img
                src={profile.bg_url}
                alt="Profile background"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative group">
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
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full text-center sm:text-left flex flex-col gap-4">
              <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 mb-2">
                <h2 className="text-2xl font-bold mb-1">@{profile.username}</h2>
                {profile.full_name && (
                  <p className="text-gray-400 text-lg mb-1">{profile.full_name}</p>
                )}
                <div>
                  {profile.bio ? (
                    <p className="text-gray-300 text-center sm:text-left">{profile.bio}</p>
                  ) : (
                    <p className="text-gray-500 italic text-center sm:text-left">No bio yet.</p>
                  )}
                </div>
              </div>

              {/* === BADGES SECTION === */}
              {userBadges.length > 0 && (
                <div className="space-y-4">
                  
                  {/* 1. CREATOR BADGE SUB-SECTION */}
                  {creatorBadge && (
                    <div className="bg-gradient-to-r from-gray-900/90 to-purple-900/20 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between sm:justify-start gap-4">
                      <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm uppercase tracking-wider">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span>Creator Status</span>
                      </div>
                      
                      {/* High-Impact Creator Badge */}
                      <div className="relative overflow-hidden rounded-lg shadow-[0_0_30px_rgba(236,72,153,0.8)] ring-4 ring-pink-500/50 animate-[pulse_2s_infinite] scale-110 z-10 brightness-110 w-32 h-10 flex-shrink-0">
                        {creatorBadge.badges?.gif_url ? (
                          <div className="absolute inset-0" style={{ opacity: (creatorBadge.badges.opacity || 80) / 100 }}>
                            <img src={creatorBadge.badges.gif_url} alt="" className="w-full h-full object-cover"/>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500"></div>
                        )}
                        <div className="relative h-full flex items-center justify-center gap-1.5">
                          <span className="text-sm font-black text-white uppercase tracking-widest drop-shadow-md">CREATOR</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. ALPHA TESTER SUB-SECTION */}
                  {alphaBadge && (
                    <div className="bg-gradient-to-r from-gray-900/90 to-cyan-900/20 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between sm:justify-start gap-4">
                      <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm uppercase tracking-wider">
                        <Beaker className="w-4 h-4 text-cyan-400" />
                        <span>Alpha Status</span>
                      </div>
                      
                      {/* High-Impact Alpha Badge */}
                      <div className="relative overflow-hidden rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.8)] ring-4 ring-cyan-500/50 animate-[pulse_3s_infinite] scale-105 z-10 brightness-110 w-36 h-10 flex-shrink-0">
                        {alphaBadge.badges?.gif_url ? (
                          <div className="absolute inset-0" style={{ opacity: (alphaBadge.badges.opacity || 80) / 100 }}>
                            <img src={alphaBadge.badges.gif_url} alt="" className="w-full h-full object-cover"/>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-500"></div>
                        )}
                        <div className="relative h-full flex items-center justify-center gap-1.5">
                          <span className="text-sm font-black text-white uppercase tracking-widest drop-shadow-md">ALPHA TESTER</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. REGULAR BADGES LIST */}
                  {regularBadges.length > 0 && (
                    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 flex flex-wrap gap-3 justify-center sm:justify-start">
                      {regularBadges.map((userBadge) => {
                        const badge = userBadge.badges!
                        
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
                        const effects = colorEffects[badge.color] || { gradient: 'from-gray-600 via-gray-500 to-gray-400', glow: 'shadow-gray-500/50' }
                        return (
                          <div
                            key={userBadge.id}
                            className={`relative overflow-hidden rounded-lg shadow-lg ${effects.glow} transform hover:scale-105 transition-transform`}
                          >
                            {badge.gif_url ? (
                              <div className="absolute inset-0" style={{ opacity: (badge.opacity || 80) / 100 }}>
                                <img 
                                  src={badge.gif_url} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className={`absolute inset-0 bg-gradient-to-br ${effects.gradient}`} style={{ opacity: (badge.opacity || 80) / 100 }}></div>
                            )}
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
              )}

              {/* Actions Area */}
              {!isOwnProfile && currentUser && (
                <div className="flex gap-2 justify-center sm:justify-start">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
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
                </div>
              )}
            </div>
          </div>
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
      </div>
    </div>
  )
}
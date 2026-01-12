import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase, type UserBadge } from '../lib/supabase'
import { Film, Tv, Gamepad2, Book, Users, UserPlus, UserCheck, ArrowLeft, Loader2, Heart, MessageCircle, Crown, Beaker, Star, Calendar, Clock, X, Search, Library, AlignLeft } from 'lucide-react'

// --- TYPES ---
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

type MediaEntry = {
  id: string
  title: string
  media_type: 'movie' | 'show' | 'game' | 'book'
  status: string
  rating: number | null
  cover_image_url: string | null
  updated_at: string
  created_at: string // Added for sort
  year?: number
  genre?: string
  notes?: string // Added notes for reviews
}

type Favorite = {
  id: string
  media_entry: MediaEntry // Updated to use full MediaEntry type for inspection
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuthStore()
  const navigate = useNavigate()
  
  // Profile Data
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  
  // Social Data
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  
  // Media Data
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [recentActivity, setRecentActivity] = useState<MediaEntry[]>([])
  const [fullLibrary, setFullLibrary] = useState<MediaEntry[]>([]) // Store full library for modal search

  // Modal States
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followersList, setFollowersList] = useState<any[]>([])
  const [followingList, setFollowingList] = useState<any[]>([])
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [libraryFilterType, setLibraryFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)
  
  // Inspection State (For viewing details/reviews)
  const [inspectedEntry, setInspectedEntry] = useState<MediaEntry | null>(null)

  // Loading States
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
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // 2. Parallel Fetch
      const [
        badgesResult,
        postsResult,
        followersResult,
        followingResult,
        currentUserFollowResult,
        favoritesResult,
        mediaResult,
        followersListResult,
        followingListResult
      ] = await Promise.all([
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', profileData.id),
        supabase.from('posts')
          .select(`*, profiles:user_id(username, avatar_url), media_entries:media_entry_id(title, media_type, rating, cover_image_url), likes:post_likes(count), comments:post_comments(count)`)
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
        currentUser ? supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', currentUser.id).eq('following_id', profileData.id) : Promise.resolve({ count: 0, error: null }),
        supabase.from('profile_favorites')
          .select('*, media_entry:media_entries(*)')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: true }),
        supabase.from('media_entries')
          .select('*')
          .eq('user_id', profileData.id)
          .order('updated_at', { ascending: false }),
        // Followers list (users who follow this user)
        supabase.from('follows').select('follower_id, profiles:profiles!follower_id(*)').eq('following_id', profileData.id),
        // Following list (users this user follows)
        supabase.from('follows').select('following_id, profiles:profiles!following_id(*)').eq('follower_id', profileData.id)
      ])

      // 3. Set State
      if (badgesResult.data) setUserBadges(badgesResult.data as UserBadge[])
      
      setFollowersCount(followersResult.count || 0)
      setFollowingCount(followingResult.count || 0)
      setIsFollowing((currentUserFollowResult.count || 0) > 0)

      if (favoritesResult.data) setFavorites(favoritesResult.data as any[])

      if (mediaResult.data) {
        const allMedia = mediaResult.data as MediaEntry[]
        setFullLibrary(allMedia)
        // Recent activity: items recently updated/added, excluding 'logged'
        setRecentActivity(allMedia.filter(e => e.status !== 'logged').slice(0, 5))
      }

      // Set followers/following lists
      if (followersListResult.data) setFollowersList(followersListResult.data.map((f: any) => f.profiles).filter(Boolean))
      if (followingListResult.data) setFollowingList(followingListResult.data.map((f: any) => f.profiles).filter(Boolean))

      // Process Posts
      if (postsResult.data) {
        const rawPosts = postsResult.data
        const postIds = rawPosts.map(p => p.id)
        let likedPostIds = new Set<string>()

        if (currentUser && postIds.length > 0) {
          const { data: userLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds)
          if (userLikes) userLikes.forEach(like => likedPostIds.add(like.post_id))
        }

        setPosts(rawPosts.map((post: any) => ({
          ...post,
          likes_count: post.likes?.[0]?.count || 0,
          comments_count: post.comments?.[0]?.count || 0,
          user_liked: likedPostIds.has(post.id)
        })))
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
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id)
        setIsFollowing(false); setFollowersCount(prev => prev - 1)
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
        setIsFollowing(true); setFollowersCount(prev => prev + 1)
      }
    } catch (error) { console.error(error) } 
    finally { setFollowLoading(false) }
  }

  const handleLike = async (postId: string) => {
    if (!currentUser) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    try {
      if (post.user_liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1, user_liked: false } : p))
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id })
        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_liked: true } : p))
      }
    } catch (error) { console.error(error) }
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

  const getFilteredLibrary = () => {
    // Only include entries with status 'logged'
    let filtered = fullLibrary.filter(e => e.status === 'logged')
    if (libraryFilterType) {
      filtered = filtered.filter(e => e.media_type === libraryFilterType)
    }
    if (librarySearchQuery.trim()) {
      const q = librarySearchQuery.toLowerCase()
      filtered = filtered.filter(e => e.title.toLowerCase().includes(q))
    }
    return filtered
  }

  // --- BADGE LOGIC ---
  const creatorBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'creator')
  const alphaBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'alpha tester')
  const regularBadges = userBadges.filter(ub => {
    const name = ub.badges?.name.toLowerCase()
    return name !== 'creator' && name !== 'alpha tester'
  })

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    )
  }

  if (!profile) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">User not found</div>

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      {loading && <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-500 animate-pulse z-50"></div>}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        {/* Profile Header */}
        <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 sm:p-8 mb-8 overflow-hidden">
          {profile.bg_url && (
            <div className="absolute inset-0 z-0" style={{ opacity: (profile.bg_opacity || 80) / 100 }}>
              <img src={profile.bg_url} alt="Background" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-4xl font-bold shadow-lg shadow-red-500/20">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" /> : profile.username.charAt(0).toUpperCase()}
              </div>
            </div>
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
                {/* Followers/Following/Entries/Favorites */}
                <div className="flex gap-6 justify-center mt-4">
                  <button className="text-center focus:outline-none" onClick={() => setShowFollowersModal(true)}>
                    <span className="block text-lg font-bold text-white">{followersCount}</span>
                    <span className="text-xs text-gray-400">Followers</span>
                  </button>
                  <button className="text-center focus:outline-none" onClick={() => setShowFollowingModal(true)}>
                    <span className="block text-lg font-bold text-white">{followingCount}</span>
                    <span className="text-xs text-gray-400">Following</span>
                  </button>
                      {/* --- FOLLOWERS MODAL --- */}
                      {showFollowersModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                          <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl relative shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between p-6 border-b border-gray-800">
                              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                Followers
                              </h2>
                              <button onClick={() => setShowFollowersModal(false)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                              {followersList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No followers yet.</div>
                              ) : (
                                <ul className="divide-y divide-gray-800">
                                  {followersList.map((user) => (
                                    <li key={user.id} className="flex items-center gap-3 py-3">
                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                                        {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-white">@{user.username}</span>
                                        {user.full_name && <span className="ml-2 text-gray-400 text-sm">{user.full_name}</span>}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- FOLLOWING MODAL --- */}
                      {showFollowingModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                          <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl relative shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between p-6 border-b border-gray-800">
                              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                Following
                              </h2>
                              <button onClick={() => setShowFollowingModal(false)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                              {followingList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">Not following anyone yet.</div>
                              ) : (
                                <ul className="divide-y divide-gray-800">
                                  {followingList.map((user) => (
                                    <li key={user.id} className="flex items-center gap-3 py-3">
                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                                        {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-white">@{user.username}</span>
                                        {user.full_name && <span className="ml-2 text-gray-400 text-sm">{user.full_name}</span>}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
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
                        const colorEffects = {
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
                        const effects = colorEffects[badge.color as keyof typeof colorEffects] || { gradient: 'from-gray-600 via-gray-500 to-gray-400', glow: 'shadow-gray-500/50' }
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

              {/* Follow Button */}
              {!isOwnProfile && currentUser && (
                <div className="flex justify-center sm:justify-start">
                  <button onClick={handleFollow} disabled={followLoading} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${isFollowing ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 shadow-lg shadow-red-900/20'}`}>
                    {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- TOP FAVORITES SHELF --- */}
        {favorites.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400 fill-current" /> Top Favorites
            </h3>
            <div className="bg-gray-900/40 border-y border-gray-800/50 -mx-4 sm:mx-0 sm:rounded-2xl sm:border p-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 min-w-min">
                {favorites.map((fav, index) => (
                  <div 
                    key={fav.id} 
                    className="relative group flex-shrink-0 w-24 sm:w-28 cursor-pointer"
                    onClick={() => setInspectedEntry(fav.media_entry)}
                  >
                    <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700/50 relative flex flex-col group-hover:ring-2 ring-white/20 transition-all">
                      {fav.media_entry?.cover_image_url ? (
                        <img src={fav.media_entry.cover_image_url} alt={fav.media_entry.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600"><Film className="w-8 h-8" /></div>
                      )}
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white/10">{index + 1}</div>
                    </div>
                    <p className="text-xs text-center mt-2 truncate text-gray-400 group-hover:text-white transition-colors">{fav.media_entry?.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- LIBRARY BUTTON --- */}
        <div className="mb-10">
          <button
            onClick={() => {
              setLibrarySearchQuery('')
              setLibraryFilterType(null)
              setShowLibraryModal(true)
            }}
            className="w-full bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 border border-gray-600 text-white font-semibold px-6 py-4 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-3 active:scale-95"
          >
            <Library className="w-5 h-5 text-blue-400" />
            <span>View {profile.username}'s Full Library</span>
          </button>
        </div>

        {/* --- RECENT ACTIVITY --- */}
        <div className="mb-12">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-red-400" /> Recent Activity
          </h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((entry) => {
                const Icon = getMediaIcon(entry.media_type)
                return (
                  <div 
                    key={entry.id} 
                    className="flex gap-3 bg-gray-800/30 p-3 rounded-xl border border-gray-700/50 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setInspectedEntry(entry)}
                  >
                    <div className="w-12 h-16 bg-gray-900 rounded-md flex-shrink-0 overflow-hidden border border-gray-700">
                      {entry.cover_image_url ? (
                        <img src={entry.cover_image_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600"><Icon className="w-4 h-4" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate text-white mb-1">{entry.title}</h4>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300`}>{entry.status.replace('-', ' ')}</span>
                        {entry.rating && <span className="text-xs text-yellow-400 font-bold">★ {entry.rating}</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(entry.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-gray-500 italic text-sm p-4 bg-gray-800/20 rounded-lg text-center">No recent activity.</div>
          )}
        </div>

        {/* --- POSTS SECTION --- */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-400" /> Posts
          </h3>
          
          {posts.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-8 text-center text-gray-500">No posts yet</div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                        {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">@{profile.username}</span>
                        <span className="text-gray-500 text-sm">· {new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-300 mb-3 whitespace-pre-wrap">{post.content}</p>
                      
                      {post.media_entries && (
                        <div 
                          className="bg-gray-900/50 rounded-lg p-3 mb-4 flex items-center gap-3 border border-gray-700/50 cursor-pointer hover:border-gray-600 transition-colors"
                          // Note: posts currently select simplified media_entries, might need full fetch to inspect properly
                          // For now this just shows it, ideally we'd fetch full details to inspect
                        >
                          {post.media_entries.cover_image_url && <img src={post.media_entries.cover_image_url} className="w-12 h-16 object-cover rounded bg-gray-800" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-white">{post.media_entries.title}</p>
                            <p className="text-xs text-gray-400 capitalize">{post.media_entries.media_type}</p>
                          </div>
                          {post.media_entries.rating && (
                            <div className="flex items-center gap-1 flex-shrink-0 bg-yellow-500/10 px-2 py-1 rounded text-yellow-400 text-xs font-bold border border-yellow-500/20">
                              ★ {post.media_entries.rating}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-6 pt-2 border-t border-gray-700/50">
                        <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 text-sm transition-colors ${post.user_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
                          <Heart className={`w-4 h-4 ${post.user_liked ? 'fill-current' : ''}`} /> {post.likes_count}
                        </button>
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <MessageCircle className="w-4 h-4" /> {post.comments_count}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- LIBRARY MODAL --- */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-2xl relative shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Library className="w-5 h-5 text-blue-400" />
                {profile.username}'s Library
              </h2>
              <button 
                onClick={() => setShowLibraryModal(false)}
                className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-800 flex flex-col md:flex-row gap-4 bg-gray-900/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  placeholder="Search their library..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[{ id: null, label: 'All' }, { id: 'movie', label: 'Movies' }, { id: 'show', label: 'TV' }, { id: 'game', label: 'Games' }, { id: 'book', label: 'Books' }].map((type: any) => (
                  <button
                    key={type.id || 'all'}
                    onClick={() => setLibraryFilterType(type.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                      libraryFilterType === type.id 
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {getFilteredLibrary().length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No matching entries found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {getFilteredLibrary().map((entry) => {
                    const Icon = getMediaIcon(entry.media_type)
                    return (
                      <div 
                        key={entry.id} 
                        className="group relative cursor-pointer"
                        onClick={() => setInspectedEntry(entry)}
                      >
                        <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700/30 relative hover:ring-2 ring-white/20 transition-all">
                          {entry.cover_image_url ? (
                            <img src={entry.cover_image_url} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600"><Icon className="w-8 h-8" /></div>
                          )}
                          {entry.rating && (
                            <div className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400 border border-white/10 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> {entry.rating}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-center mt-2 truncate text-gray-400 group-hover:text-white transition-colors px-1" title={entry.title}>
                          {entry.title}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- INSPECTION MODAL (Read-Only) --- */}
      {inspectedEntry && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-2xl relative shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[calc(100vh-40px)]">
            <button
              onClick={() => setInspectedEntry(null)}
              className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white/90 hover:text-white transition-colors border border-white/10 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Poster Side */}
            <div className="w-full h-48 md:h-auto md:w-2/5 bg-black relative flex-shrink-0">
              {inspectedEntry.cover_image_url ? (
                <>
                  <div className="absolute inset-0 overflow-hidden">
                    <img src={inspectedEntry.cover_image_url} className="w-full h-full object-cover blur-2xl opacity-60 scale-125" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent md:bg-gradient-to-r" />
                  </div>
                  <div className="relative h-full w-full flex items-center justify-center p-6 md:p-8">
                    <img 
                      src={inspectedEntry.cover_image_url} 
                      alt={inspectedEntry.title} 
                      className="h-full w-auto object-contain rounded-lg shadow-2xl border border-white/10 md:max-h-[80%] max-h-36" 
                    />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800">
                  <Film className="w-16 h-16 opacity-20" />
                </div>
              )}
            </div>

            {/* Info Side */}
            <div className="flex-1 overflow-y-auto bg-gray-900 p-5 md:p-8 flex flex-col">
              <div className="mb-6 border-b border-gray-800 pb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                    {inspectedEntry.media_type}
                  </span>
                  {inspectedEntry.year && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-800 rounded-md">
                      <Calendar className="w-3 h-3" />
                      {inspectedEntry.year}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                  {inspectedEntry.title}
                </h2>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center flex-1">
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Status</div>
                    <div className="text-white capitalize font-medium">{inspectedEntry.status.replace('-', ' ')}</div>
                  </div>
                  {inspectedEntry.rating && (
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center flex-1">
                      <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Rating</div>
                      <div className="text-yellow-400 font-bold flex items-center justify-center gap-1">
                        {inspectedEntry.rating} <Star className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                  )}
                </div>

                {inspectedEntry.notes && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                      <AlignLeft className="w-3 h-3" /> Review / Notes
                    </label>
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      "{inspectedEntry.notes}"
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 text-xs text-gray-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated {new Date(inspectedEntry.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Search, UserPlus, UserCheck, Users, Compass } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useSocialStore, type ProfileWithFollowStatus } from '../store/socialStore'
import { Link } from 'react-router-dom'


export default function PeoplePage() {
  const { user } = useAuthStore(useShallow(s => ({ user: s.user })))
  const {
    followers,
    following,
    setFollowers,
    setFollowing,
    peopleLoaded,
    peopleScrollPos,
    setPeopleScrollPos,
    peopleActiveTab,
    setPeopleActiveTab,
    followersCount,
    followingCount,
    fetchFollowers,
    fetchFollowing,
    fetchPeopleCounts
  } = useSocialStore(useShallow(s => ({
    followers: s.followers,
    following: s.following,
    setFollowers: s.setFollowers,
    setFollowing: s.setFollowing,
    peopleLoaded: s.peopleLoaded,
    peopleScrollPos: s.peopleScrollPos,
    setPeopleScrollPos: s.setPeopleScrollPos,
    peopleActiveTab: s.peopleActiveTab,
    setPeopleActiveTab: s.setPeopleActiveTab,
    followersCount: s.followersCount,
    followingCount: s.followingCount,
    fetchFollowers: s.fetchFollowers,
    fetchFollowing: s.fetchFollowing,
    fetchPeopleCounts: s.fetchPeopleCounts,
  })))

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileWithFollowStatus[]>([])
  const [exploreUsers, setExploreUsers] = useState<ProfileWithFollowStatus[]>([])
  const [exploreLoading, setExploreLoading] = useState(false)

  const [refreshing, setRefreshing] = useState(false)

  useLayoutEffect(() => {
    if (peopleScrollPos > 0) {
      window.scrollTo(0, peopleScrollPos)
    }
    return () => {
      setPeopleScrollPos(window.scrollY)
    }
  }, [peopleScrollPos, setPeopleScrollPos])

  const followsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const subscribeFollows = (uid: string) => {
    if (followsChannelRef.current) {
      supabase.removeChannel(followsChannelRef.current)
    }
    followsChannelRef.current = supabase
      .channel(`follows-changes-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${uid}` },
        () => { fetchFollowing(uid); fetchPeopleCounts(uid) }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${uid}` },
        () => { fetchFollowers(uid); fetchPeopleCounts(uid) }
      )
      .subscribe()
  }

  useEffect(() => {
    if (!user) return

    // Run all three fetches in parallel — counts, followers, and following
    // have no dependencies on each other
    if (!peopleLoaded) setRefreshing(true)
    Promise.all([
      fetchPeopleCounts(user.id),
      fetchFollowers(user.id),
      fetchFollowing(user.id),
    ]).finally(() => setRefreshing(false))

    // Safety timer — if fetches hang, never stay stuck
    const safetyTimer = setTimeout(() => setRefreshing(false), 8000)

    subscribeFollows(user.id)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // getUser() does a server round-trip to refresh the JWT before fetches run.
        // getSession() only returns the cached token and races with Supabase's lazy
        // refresh, causing queries to fail with expired JWTs after inactivity.
        // Both fetches and realtime re-subscribe need a fresh token.
        // Run everything inside .finally() so the JWT is refreshed first.
        supabase.auth.getUser().finally(() => {
          fetchPeopleCounts(user.id)
          fetchFollowers(user.id)
          fetchFollowing(user.id)
          subscribeFollows(user.id)
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(safetyTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (followsChannelRef.current) {
        supabase.removeChannel(followsChannelRef.current)
        followsChannelRef.current = null
      }
    }
  }, [user])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    try {
      // Search profiles by username
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(20)

      if (error) throw error

      if (!profiles) {
        setSearchResults([])
        return
      }

      // Check follow status for each profile
      const profileIds = profiles.map((p) => p.id)
      
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id || '')
        .in('following_id', profileIds)

      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user?.id || '')
        .in('follower_id', profileIds)

      const followingIds = new Set(followingData?.map((f) => f.following_id) || [])
      const followerIds = new Set(followersData?.map((f) => f.follower_id) || [])

      const profilesWithStatus = profiles.map((profile) => ({
        ...profile,
        isFollowing: followingIds.has(profile.id),
        isFollower: followerIds.has(profile.id),
      }))

      setSearchResults(profilesWithStatus)
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  const handleFollow = async (profileId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: profileId })

      if (error) throw error

      // Update local search results
      setSearchResults(
        searchResults.map((p) =>
          p.id === profileId ? { ...p, isFollowing: true } : p
        )
      )
      
      // Update store followers list optimistically
      setFollowers(
        followers.map((p) =>
          p.id === profileId ? { ...p, isFollowing: true } : p
        )
      )

      // Remove from explore list since they're now followed
      setExploreUsers(prev => prev.filter(p => p.id !== profileId))

      // Refresh following list
      fetchFollowing(user.id)
    } catch (error) {
      console.error('Follow error:', error)
    }
  }

  const handleUnfollow = async (profileId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profileId)

      if (error) throw error

      // Update local search results
      setSearchResults(
        searchResults.map((p) =>
          p.id === profileId ? { ...p, isFollowing: false } : p
        )
      )
      
      // Update store lists optimistically
      setFollowing(following.filter((p) => p.id !== profileId))
      setFollowers(
        followers.map((p) =>
          p.id === profileId ? { ...p, isFollowing: false } : p
        )
      )
    } catch (error) {
      console.error('Unfollow error:', error)
    }
  }

  const fetchExploreUsers = async () => {
    if (!user) return
    setExploreLoading(true)
    try {
      // Get IDs the current user already follows
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = new Set(followingData?.map(f => f.following_id) ?? [])
      followingIds.add(user.id) // exclude self

      // Fetch profiles not in that set, ordered by most recent activity (created_at)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .order('created_at', { ascending: false })
        .limit(40)

      if (!profiles) return

      const notFollowing = profiles.filter(p => !followingIds.has(p.id))

      // Check which of them follow us back (so we can show "Follows you")
      const candidateIds = notFollowing.map(p => p.id)
      const { data: theirFollows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .in('follower_id', candidateIds)

      const theirFollowSet = new Set(theirFollows?.map(f => f.follower_id) ?? [])

      setExploreUsers(
        notFollowing.map(p => ({
          ...p,
          isFollowing: false,
          isFollower: theirFollowSet.has(p.id),
        }))
      )
    } catch (err) {
      console.error('Explore fetch error:', err)
    } finally {
      setExploreLoading(false)
    }
  }

  const renderProfileCard = (profile: ProfileWithFollowStatus) => (
    <div
      key={profile.id}
      className="group flex items-center gap-3 p-3.5 bg-gray-800/40 border border-gray-700/50 rounded-2xl hover:bg-gray-800/70 hover:border-gray-600 transition-all duration-200"
    >
      <Link
        to={`/profile/${profile.username}`}
        state={{ initialProfile: profile }}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden ring-1 ring-white/10">
          {profile.avatar_url ? (
            <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white group-hover:text-red-400 transition-colors truncate text-sm">
              {profile.username}
            </span>
            {profile.isFollowing && profile.isFollower && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 flex-shrink-0">
                Friends
              </span>
            )}
            {!profile.isFollowing && profile.isFollower && (
              <span className="text-[10px] text-gray-500 flex-shrink-0">Follows you</span>
            )}
          </div>
          {profile.bio ? (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{profile.bio}</p>
          ) : (
            <p className="text-xs text-gray-600 italic mt-0.5">No bio</p>
          )}
        </div>
      </Link>

      <button
        onClick={() => profile.isFollowing ? handleUnfollow(profile.id) : handleFollow(profile.id)}
        className={`flex-shrink-0 h-9 px-4 rounded-full font-bold text-xs transition-all duration-200 active:scale-95 ${
          profile.isFollowing
            ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 hover:text-white'
            : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-500 hover:to-pink-500'
        }`}
      >
        {profile.isFollowing ? (
          <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Following</span>
        ) : (
          <span className="flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Follow</span>
        )}
      </button>
    </div>
  )

  const renderExploreCard = (profile: ProfileWithFollowStatus) => (
    <div
      key={profile.id}
      className="group bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 hover:bg-gray-800/70 hover:border-gray-600 transition-all duration-200 flex flex-col items-center text-center"
    >
      <Link
        to={`/profile/${profile.username}`}
        state={{ initialProfile: profile }}
        className="flex flex-col items-center mb-3 w-full"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-lg mb-3 ring-2 ring-gray-700 group-hover:ring-red-500/40 transition-all flex-shrink-0">
          {profile.avatar_url ? (
            <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </div>
        <h3 className="font-bold text-white truncate w-full group-hover:text-red-400 transition-colors text-sm">
          {profile.username}
        </h3>
        {profile.isFollower && (
          <span className="text-[10px] text-gray-500 mt-0.5">Follows you</span>
        )}
        {profile.bio ? (
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{profile.bio}</p>
        ) : (
          <p className="text-xs text-gray-600 italic mt-1">No bio</p>
        )}
      </Link>
      <button
        onClick={() => handleFollow(profile.id)}
        className="w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-500 hover:to-pink-500 active:scale-95 transition-all shadow-sm"
      >
        Follow
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gray-800">
          <div className="h-full bg-gradient-to-r from-red-500 to-pink-600 w-2/5 animate-pulse" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Bar */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'search', label: 'Search' },
            { id: 'explore', label: 'Discover' },
            { id: 'followers', label: 'Followers', count: followersCount },
            { id: 'following', label: 'Following', count: followingCount },
          ].map((tab) => {
            const isActive = peopleActiveTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setPeopleActiveTab(tab.id as typeof peopleActiveTab)
                  if (tab.id === 'explore' && exploreUsers.length === 0) {
                    fetchExploreUsers()
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/50'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
                    isActive ? 'bg-black/20 text-black/70' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="min-h-[400px]">

          {/* Search Tab */}
          {peopleActiveTab === 'search' && (
            <div className="animate-in fade-in duration-200">
              <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gray-800/60 border border-gray-700/60 rounded-2xl flex items-center group-focus-within:border-gray-500 transition-colors">
                  <div className="pl-4 text-gray-500 group-focus-within:text-white transition-colors">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by username…"
                    className="w-full bg-transparent border-none py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-base font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="mr-3 p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                      <Search className="w-4 h-4 opacity-0 absolute" />
                      <span className="text-sm">✕</span>
                    </button>
                  )}
                </div>
              </div>

              {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="text-center py-20">
                  <p className="text-gray-400 font-semibold">No users found for "{searchQuery}"</p>
                  <p className="text-gray-600 text-sm mt-1">Try a different username</p>
                </div>
              )}
              {searchResults.length === 0 && searchQuery.trim().length < 2 && (
                <div className="text-center py-24">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-semibold">Find people you know</p>
                  <p className="text-gray-600 text-sm mt-1">Search by username to connect with friends</p>
                </div>
              )}
              <div className="space-y-3">
                {searchResults.map(renderProfileCard)}
              </div>
            </div>
          )}

          {/* Discover Tab */}
          {peopleActiveTab === 'explore' && (
            <div className="animate-in fade-in duration-200">
              {exploreLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-gray-800/40 rounded-2xl p-4 flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gray-700" />
                      <div className="h-3 bg-gray-700 rounded-full w-20" />
                      <div className="h-2 bg-gray-700/60 rounded-full w-16" />
                      <div className="h-8 bg-gray-700 rounded-xl w-full" />
                    </div>
                  ))}
                </div>
              ) : exploreUsers.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Compass className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-semibold">You follow everyone!</p>
                  <p className="text-gray-600 text-sm mt-1">No new users to discover right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {exploreUsers.map(profile => renderExploreCard({
                    ...profile,
                    isFollowing: exploreUsers.find(u => u.id === profile.id)?.isFollowing ?? false,
                  }))}
                </div>
              )}
            </div>
          )}

          {/* Followers Tab */}
          {peopleActiveTab === 'followers' && (
            <div className="animate-in fade-in duration-200">
              {!peopleLoaded ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-800/40 rounded-2xl" />
                  ))}
                </div>
              ) : followers.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-semibold">No followers yet</p>
                  <p className="text-gray-600 text-sm mt-1">Share your profile to get your first follower</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followers.map(renderProfileCard)}
                </div>
              )}
            </div>
          )}

          {/* Following Tab */}
          {peopleActiveTab === 'following' && (
            <div className="animate-in fade-in duration-200">
              {!peopleLoaded ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-800/40 rounded-2xl" />
                  ))}
                </div>
              ) : following.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-semibold">Not following anyone</p>
                  <p className="text-gray-600 text-sm mt-1 mb-6">Discover people to follow</p>
                  <button
                    onClick={() => { setPeopleActiveTab('explore'); fetchExploreUsers() }}
                    className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-colors"
                  >
                    Discover people
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {following.map(renderProfileCard)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
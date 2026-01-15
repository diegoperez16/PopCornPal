import { useState, useEffect,useLayoutEffect } from 'react'
import { Search, UserPlus, UserCheck, Loader2, RefreshCw, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useSocialStore, type ProfileWithFollowStatus } from '../store/socialStore'
import { Link } from 'react-router-dom'


export default function PeoplePage() {
  const { user } = useAuthStore()
  
  // Use Global Store for caching
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
  } = useSocialStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileWithFollowStatus[]>([])
  
  const [refreshing, setRefreshing] = useState(false)

  useLayoutEffect(() => {
    if (peopleScrollPos > 0) {
      window.scrollTo(0, peopleScrollPos)
    }
    return () => {
      setPeopleScrollPos(window.scrollY)
    }
  }, [peopleScrollPos, setPeopleScrollPos])

  // Fetch followers and following on mount
  useEffect(() => {
    if (user) {
      // Fetch counts immediately
      fetchPeopleCounts(user.id)

      // Only refresh lists if they are empty or if we explicitly want to refresh
      // If peopleLoaded is true, it means we have data in the store
      if (!peopleLoaded) {
        setRefreshing(true)
        Promise.all([fetchFollowers(user.id), fetchFollowing(user.id)])
          .finally(() => {
            setRefreshing(false)
          })
      } else {
        // If data is already loaded, we can just fetch quietly in the background if needed
        // But to fix the "loading state too long" issue, we don't set refreshing=true here
        // We just let the existing data show.
        // Optionally, we could trigger a background update without the UI spinner
        fetchFollowers(user.id)
        fetchFollowing(user.id)
      }
    }

    // Handle tab visibility - background refresh
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Silent update on visibility change
        fetchPeopleCounts(user.id)
        fetchFollowers(user.id)
        fetchFollowing(user.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Set up real-time subscription for follows changes
    if (!user) return

    const followsChannel = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${user.id}`
        },
        () => {
          fetchFollowing(user.id)
          fetchPeopleCounts(user.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`
        },
        () => {
          fetchFollowers(user.id)
          fetchPeopleCounts(user.id)
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(followsChannel)
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

  const renderProfileCard = (profile: ProfileWithFollowStatus) => (
    <div
      key={profile.id}
      className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-5 hover:bg-gray-800 hover:border-gray-600 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-4">
        <Link 
          to={`/profile/${profile.username}`}
          state={{ initialProfile: profile }}
          className="flex items-center gap-4 flex-1 min-w-0"
        >
          {/* Avatar with Status Ring */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden shadow-lg shadow-red-900/20 ring-2 ring-gray-800 group-hover:ring-red-500/30 transition-all">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white group-hover:text-red-400 transition-colors truncate">
                {profile.username}
              </h3>
              {profile.isFollowing && profile.isFollower && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                  Friends
                </span>
              )}
            </div>
            
            {profile.bio ? (
              <p className="text-sm text-gray-400 line-clamp-1 mt-0.5 font-medium">{profile.bio}</p>
            ) : (
              <p className="text-sm text-gray-500 italic mt-0.5">No bio</p>
            )}
          </div>
        </Link>

        {/* Follow Button */}
        <button
          onClick={() =>
            profile.isFollowing ? handleUnfollow(profile.id) : handleFollow(profile.id)
          }
          className={`flex-shrink-0 h-10 px-5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg ${
            profile.isFollowing
              ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 hover:text-white'
              : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-500 hover:to-pink-500 hover:shadow-red-900/20 active:scale-95'
          }`}
        >
          {profile.isFollowing ? (
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span>Following</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span>Follow</span>
            </div>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20">
      {/* Loading Bar */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gray-800">
          <div className="h-full bg-gradient-to-r from-red-500 to-pink-600 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              People
            </h1>
            <p className="text-gray-400 font-medium">
              Discover people, manage your network, and find new friends.
            </p>
          </div>
          
          <button
            onClick={() => {
              if (user) {
                setRefreshing(true)
                Promise.all([fetchFollowers(user.id), fetchFollowing(user.id)]).finally(() => setRefreshing(false))
              }
            }}
            className="p-2.5 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all border border-gray-700 hover:border-gray-600 active:scale-95"
            title="Refresh List"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs - Segmented Control */}
        <div className="p-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl mb-8 flex gap-1 relative overflow-hidden">
          {[
            { id: 'search', label: 'Find People' },
            { id: 'followers', label: 'Followers', count: followersCount },
            { id: 'following', label: 'Following', count: followingCount },
          ].map((tab) => {
            const isActive = peopleActiveTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setPeopleActiveTab(tab.id as typeof peopleActiveTab)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative group overflow-hidden ${
                  isActive
                    ? 'text-white shadow-lg bg-gray-700'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                      isActive ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-white'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-gray-700 via-gray-600/50 to-gray-700 opacity-100" />
                )}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {/* Search Tab */}
          {peopleActiveTab === 'search' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Search Bar */}
              <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gray-800/50 border border-gray-700 rounded-2xl flex items-center shadow-lg group-focus-within:border-gray-600 transition-colors">
                  <div className="pl-4 text-gray-500 group-focus-within:text-red-500 transition-colors">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by username..."
                    className="w-full bg-transparent border-none py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-lg font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                  <div className="col-span-full text-center py-20 bg-gray-800/30 rounded-3xl border border-gray-700/50 border-dashed">
                    <p className="text-gray-400 text-lg font-medium">No users found matching "{searchQuery}"</p>
                    <p className="text-gray-500 mt-2">Try checking for typos or searching another name.</p>
                  </div>
                )}
                {searchResults.length === 0 && searchQuery.trim().length < 2 && (
                  <div className="col-span-full text-center py-20">
                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700 shadow-xl">
                      <Search className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Find your friends</h3>
                    <p className="text-gray-400 max-w-sm mx-auto">
                      Search for people to follow and build your movie-watching network.
                    </p>
                  </div>
                )}
                {searchResults.map(renderProfileCard)}
              </div>
            </div>
          )}

          {/* Followers Tab */}
          {peopleActiveTab === 'followers' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!peopleLoaded ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                </div>
              ) : followers.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/30 rounded-3xl border border-gray-700/50 border-dashed">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">No followers yet</h3>
                  <p className="text-gray-400">When people follow you, they'll show up here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {followers.map(renderProfileCard)}
                </div>
              )}
            </div>
          )}

          {/* Following Tab */}
          {peopleActiveTab === 'following' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!peopleLoaded ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                </div>
              ) : following.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/30 rounded-3xl border border-gray-700/50 border-dashed">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Not following anyone</h3>
                  <p className="text-gray-400 mb-6">Start following people to see their activity.</p>
                  <button 
                    onClick={() => setPeopleActiveTab('search')}
                    className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Find People
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
import { useState, useEffect } from 'react'
import { Search, UserPlus, UserCheck, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

type Profile = {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
}

type ProfileWithFollowStatus = Profile & {
  isFollowing: boolean
  isFollower: boolean
}

export default function PeoplePage() {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileWithFollowStatus[]>([])
  const [followers, setFollowers] = useState<ProfileWithFollowStatus[]>([])
  const [following, setFollowing] = useState<ProfileWithFollowStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'search' | 'followers' | 'following'>('search')

  // Fetch followers and following on mount
  useEffect(() => {
    if (user) {
      Promise.all([fetchFollowers(), fetchFollowing()]).finally(() => setLoading(false))
    }
  }, [user])

  const fetchFollowers = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        follower:profiles!follows_follower_id_fkey(id, username, avatar_url, bio)
      `)
      .eq('following_id', user.id)

    if (error) {
      console.error('Error fetching followers:', error)
      return
    }

    const profiles = data.map((f: any) => ({
      ...f.follower,
      isFollowing: false, // Will check if we follow them back
      isFollower: true,
    }))

    // Check which followers we follow back
    const followerIds = profiles.map((p: Profile) => p.id)
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', followerIds)

    const followingIds = new Set(followingData?.map((f) => f.following_id) || [])

    setFollowers(
      profiles.map((p: Profile & { isFollowing: boolean; isFollower: boolean }) => ({
        ...p,
        isFollowing: followingIds.has(p.id),
      }))
    )
  }

  const fetchFollowing = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        following:profiles!follows_following_id_fkey(id, username, avatar_url, bio)
      `)
      .eq('follower_id', user.id)

    if (error) {
      console.error('Error fetching following:', error)
      return
    }

    const profiles = data.map((f: any) => ({
      ...f.following,
      isFollowing: true,
      isFollower: false, // Will check if they follow us back
    }))

    // Check which people we follow also follow us back
    const followingIds = profiles.map((p: Profile) => p.id)
    const { data: followersData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)
      .in('follower_id', followingIds)

    const followerIds = new Set(followersData?.map((f) => f.follower_id) || [])

    setFollowing(
      profiles.map((p: Profile & { isFollowing: boolean; isFollower: boolean }) => ({
        ...p,
        isFollower: followerIds.has(p.id),
      }))
    )
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setLoading(true)

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
        setLoading(false)
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
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (profileId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: profileId })

      if (error) throw error

      // Update local state
      setSearchResults(
        searchResults.map((p) =>
          p.id === profileId ? { ...p, isFollowing: true } : p
        )
      )
      setFollowers(
        followers.map((p) =>
          p.id === profileId ? { ...p, isFollowing: true } : p
        )
      )

      // Refresh following list
      fetchFollowing()
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

      // Update local state
      setSearchResults(
        searchResults.map((p) =>
          p.id === profileId ? { ...p, isFollowing: false } : p
        )
      )
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
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {profile.username.charAt(0).toUpperCase()}
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{profile.username}</h3>
            {profile.bio && (
              <p className="text-sm text-gray-400 line-clamp-2 mt-1">{profile.bio}</p>
            )}
            <div className="flex gap-2 mt-2">
              {profile.isFollower && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                  Follows you
                </span>
              )}
              {profile.isFollowing && profile.isFollower && (
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                  Friends
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Follow Button */}
        <button
          onClick={() =>
            profile.isFollowing ? handleUnfollow(profile.id) : handleFollow(profile.id)
          }
          className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
            profile.isFollowing
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
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
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-6">People</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-1">
          {[
            { id: 'search', label: 'Search' },
            { id: 'followers', label: `Followers (${followers.length})` },
            { id: 'following', label: `Following (${following.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for people..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            <div className="space-y-3">
              {searchResults.length === 0 && searchQuery.trim().length >= 2 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No users found matching "{searchQuery}"</p>
                </div>
              )}
              {searchResults.length === 0 && searchQuery.trim().length < 2 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400">Start typing to search for people</p>
                </div>
              )}
              {searchResults.map(renderProfileCard)}
            </div>
          </div>
        )}

        {/* Followers Tab */}
        {activeTab === 'followers' && (
          <div className="space-y-3">
            {followers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No followers yet</p>
              </div>
            ) : (
              followers.map(renderProfileCard)
            )}
          </div>
        )}

        {/* Following Tab */}
        {activeTab === 'following' && (
          <div className="space-y-3">
            {following.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Not following anyone yet</p>
              </div>
            ) : (
              following.map(renderProfileCard)
            )}
          </div>
        )}
      </div>
    </div>
  )
}

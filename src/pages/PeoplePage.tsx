import { useState, useEffect, useLayoutEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Search, UserPlus, UserCheck, Users, Compass } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useSocialStore, type ProfileWithFollowStatus } from '../store/socialStore'
import { useQueryClient } from '@tanstack/react-query'
import { peopleKeys } from '../lib/queryClient'
import {
  usePeopleCounts,
  useFollowers,
  useFollowing,
  useExploreUsers,
  useFollowUser,
  useUnfollowUser,
  useSearchPeople,
} from '../hooks/queries/usePeopleQueries'
import { Link } from 'react-router-dom'


export default function PeoplePage() {
  const { user } = useAuthStore(useShallow(s => ({ user: s.user })))
  const {
    peopleScrollPos,
    setPeopleScrollPos,
    peopleActiveTab,
    setPeopleActiveTab,
  } = useSocialStore(useShallow(s => ({
    peopleScrollPos: s.peopleScrollPos,
    setPeopleScrollPos: s.setPeopleScrollPos,
    peopleActiveTab: s.peopleActiveTab,
    setPeopleActiveTab: s.setPeopleActiveTab,
  })))

  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  // TanStack Query data
  const { data: counts } = usePeopleCounts(user?.id ?? '')
  const { data: followersData = [], isLoading: followersLoading } = useFollowers(user?.id ?? '')
  const { data: followingData = [], isLoading: followingLoading } = useFollowing(user?.id ?? '')
  const { data: exploreData = [], isLoading: exploreLoading } = useExploreUsers(
    peopleActiveTab === 'explore' ? (user?.id ?? '') : ''
  )
  const { data: searchResults = [] } = useSearchPeople(user?.id ?? '', searchQuery)

  const { mutate: followUser } = useFollowUser(user?.id ?? '')
  const { mutate: unfollowUser } = useUnfollowUser(user?.id ?? '')

  const followersCount = counts?.followersCount ?? 0
  const followingCount = counts?.followingCount ?? 0
  const peopleLoaded = !followersLoading && !followingLoading

  useLayoutEffect(() => {
    if (peopleScrollPos > 0) {
      window.scrollTo(0, peopleScrollPos)
    }
    return () => {
      setPeopleScrollPos(window.scrollY)
    }
  }, [peopleScrollPos, setPeopleScrollPos])

  // Realtime subscriptions for follows table
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`follows-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: peopleKeys.counts(user.id) })
        queryClient.invalidateQueries({ queryKey: peopleKeys.following(user.id) })
        queryClient.invalidateQueries({ queryKey: peopleKeys.explore(user.id) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: peopleKeys.counts(user.id) })
        queryClient.invalidateQueries({ queryKey: peopleKeys.followers(user.id) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  const handleFollow = (profileId: string) => {
    if (!user) return
    followUser(profileId)
  }

  const handleUnfollow = (profileId: string) => {
    if (!user) return
    unfollowUser(profileId)
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username…"
                    className="w-full bg-transparent border-none py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-base font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery('') }} className="mr-3 p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
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
              ) : exploreData.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Compass className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-semibold">You follow everyone!</p>
                  <p className="text-gray-600 text-sm mt-1">No new users to discover right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {exploreData.map(profile => renderExploreCard(profile))}
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
              ) : followersData.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-semibold">No followers yet</p>
                  <p className="text-gray-600 text-sm mt-1">Share your profile to get your first follower</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followersData.map(renderProfileCard)}
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
              ) : followingData.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-semibold">Not following anyone</p>
                  <p className="text-gray-600 text-sm mt-1 mb-6">Discover people to follow</p>
                  <button
                    onClick={() => { setPeopleActiveTab('explore') }}
                    className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-colors"
                  >
                    Discover people
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {followingData.map(renderProfileCard)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

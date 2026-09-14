import { useDeferredValue, useState, useEffect, useLayoutEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Search, UserPlus, UserCheck, X } from 'lucide-react'
import PalMark from '../components/brand/PalMark'
import PillTabs from '../features/profile/PillTabs'
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
import ProfileLink from '../components/ProfileLink'


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
  const deferredSearchQuery = useDeferredValue(searchQuery)

  // TanStack Query data
  const { data: counts } = usePeopleCounts(user?.id ?? '')
  const { data: followersData = [], isLoading: followersLoading } = useFollowers(user?.id ?? '', peopleActiveTab === 'followers')
  const { data: followingData = [], isLoading: followingLoading } = useFollowing(user?.id ?? '', peopleActiveTab === 'following')
  const { data: exploreData = [], isLoading: exploreLoading } = useExploreUsers(user?.id ?? '', peopleActiveTab === 'explore')
  const { data: searchResults = [] } = useSearchPeople(user?.id ?? '', deferredSearchQuery)

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
    const subscribe = () => supabase.channel(`follows-${user.id}`)
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

    let channel = subscribe()
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const state = channel.state
      if (state === 'closed' || state === 'errored') {
        supabase.removeChannel(channel)
        channel = subscribe()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
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
      className="app-panel rounded-2xl p-3 flex items-center gap-3"
    >
      <ProfileLink
        username={profile.username}
        currentUserId={user?.id}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <span className="app-avatar h-12 w-12 text-lg">
          {profile.avatar_url ? (
            <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.username} />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-50 hover:text-accent-soft transition-colors truncate">
              {profile.username}
            </span>
            {profile.isFollowing && profile.isFollower && (
              <span className="rounded-full bg-butter-400/15 px-2 py-0.5 text-xs font-semibold text-butter-300 flex-shrink-0">
                Friends
              </span>
            )}
            {!profile.isFollowing && profile.isFollower && (
              <span className="text-xs text-muted flex-shrink-0">Follows you</span>
            )}
          </div>
          {profile.bio ? (
            <p className="text-xs text-muted line-clamp-1 mt-0.5">{profile.bio}</p>
          ) : (
            <p className="text-xs text-gray-500 italic mt-0.5">No bio</p>
          )}
        </div>
      </ProfileLink>

      <button
        type="button"
        onClick={() => profile.isFollowing ? handleUnfollow(profile.id) : handleFollow(profile.id)}
        className={`flex-shrink-0 app-button-sm !rounded-full ${
          profile.isFollowing ? 'app-button-secondary' : 'app-button-primary'
        }`}
      >
        {profile.isFollowing ? (
          <><UserCheck size={16} /> Following</>
        ) : (
          <><UserPlus size={16} /> Follow</>
        )}
      </button>
    </div>
  )

  const renderExploreCard = (profile: ProfileWithFollowStatus) => (
    <div
      key={profile.id}
      className="app-panel rounded-2xl p-4 flex flex-col items-center text-center"
    >
      <ProfileLink
        username={profile.username}
        currentUserId={user?.id}
        className="flex flex-col items-center mb-3 w-full"
      >
        <span className="app-avatar h-16 w-16 text-xl mb-3">
          {profile.avatar_url ? (
            <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.username} />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </span>
        <h3 className="font-semibold text-gray-50 hover:text-accent-soft transition-colors truncate w-full text-sm">
          {profile.username}
        </h3>
        {profile.isFollower && (
          <span className="text-xs text-muted mt-0.5">Follows you</span>
        )}
        {profile.bio ? (
          <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">{profile.bio}</p>
        ) : (
          <p className="text-xs text-gray-500 italic mt-1">No bio</p>
        )}
      </ProfileLink>
      <button
        type="button"
        onClick={() => handleFollow(profile.id)}
        className="app-button-primary app-button-sm w-full mt-auto"
      >
        <UserPlus size={16} /> Follow
      </button>
    </div>
  )

  return (
    <div className="app-page">
      <div className="max-w-3xl mx-auto px-5 py-8">
        <header className="mb-6"><h1 className="app-title">Find your people<span className="text-accent-soft">.</span></h1></header>
        {/* Tab Bar */}
        <div className="mb-6">
          <PillTabs
            ariaLabel="People"
            value={peopleActiveTab}
            onChange={(id) => setPeopleActiveTab(id as typeof peopleActiveTab)}
            tabs={[
              { id: 'search', label: 'Search' },
              { id: 'explore', label: 'Discover' },
              { id: 'followers', label: 'Followers', count: followersCount },
              { id: 'following', label: 'Following', count: followingCount },
            ]}
          />
        </div>

        {/* Content */}
        <div className="min-h-[400px]">

          {/* Search Tab */}
          {peopleActiveTab === 'search' && (
            <div>
              <div className="app-search mb-6">
                <Search size={18} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search people by username"
                  placeholder="Search by username…"
                  autoComplete="off"
                  enterKeyHint="search"
                  className={`app-input !min-h-14 ${searchQuery ? 'pr-14' : ''}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery('') }}
                    aria-label="Clear search"
                    className="app-icon-button absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="text-center py-16">
                  <p className="text-gray-200 font-semibold">No users found for "{searchQuery}"</p>
                  <p className="text-muted text-sm mt-1">Try a different username</p>
                </div>
              )}
              {searchResults.length === 0 && searchQuery.trim().length < 2 && (
                <div className="app-empty">
                  <div className="mx-auto mb-4 flex justify-center">
                    <PalMark size={56} />
                  </div>
                  <h3>Find people you know</h3>
                  <p>Search by username to connect with friends.</p>
                </div>
              )}
              <div className="space-y-3">
                {searchResults.map(renderProfileCard)}
              </div>
            </div>
          )}

          {/* Discover Tab */}
          {peopleActiveTab === 'explore' && (
            <div>
              {exploreLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 motion-safe:animate-pulse" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-surface rounded-2xl p-4 flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-surface-strong" />
                      <div className="h-3 bg-surface-strong rounded-full w-20" />
                      <div className="h-2 bg-surface-strong rounded-full w-16" />
                      <div className="h-11 bg-surface-strong rounded-xl w-full" />
                    </div>
                  ))}
                </div>
              ) : exploreData.length === 0 ? (
                <div className="app-empty">
                  <div className="mx-auto mb-4 flex justify-center">
                    <PalMark size={56} />
                  </div>
                  <h3>You follow everyone!</h3>
                  <p>No new users to discover right now.</p>
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
            <div>
              {!peopleLoaded ? (
                <div className="space-y-3 motion-safe:animate-pulse" aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[72px] bg-surface rounded-2xl" />
                  ))}
                </div>
              ) : followersData.length === 0 ? (
                <div className="app-empty">
                  <div className="mx-auto mb-4 flex justify-center">
                    <PalMark size={56} />
                  </div>
                  <h3>No followers yet</h3>
                  <p>Share your profile to get your first follower.</p>
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
            <div>
              {!peopleLoaded ? (
                <div className="space-y-3 motion-safe:animate-pulse" aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[72px] bg-surface rounded-2xl" />
                  ))}
                </div>
              ) : followingData.length === 0 ? (
                <div className="app-empty">
                  <div className="mx-auto mb-4 flex justify-center">
                    <PalMark size={56} />
                  </div>
                  <h3>Not following anyone</h3>
                  <p>Discover people to follow.</p>
                  <button
                    type="button"
                    onClick={() => { setPeopleActiveTab('explore') }}
                    className="app-button-primary mt-5"
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

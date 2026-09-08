import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Film, Tv, Gamepad2, Book, UserPlus, UserCheck, ArrowLeft, Loader2, Heart, MessageCircle, Crown, Beaker, Star, X, Search, Library } from 'lucide-react'
import ProfileSkeleton from '../components/ProfileSkeleton'
import { useUserProfilePage } from '../hooks/useUserProfilePage'
import UserAvatar from '../components/UserAvatar'

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuthStore()

  const {
    profile,
    userBadges,
    posts,
    followersCount,
    followingCount,
    isFollowing,
    favorites,
    recentActivity,
    showLibraryModal,
    setShowLibraryModal,
    showFollowersModal,
    setShowFollowersModal,
    showFollowingModal,
    setShowFollowingModal,
    followersList,
    followingList,
    librarySearchQuery,
    setLibrarySearchQuery,
    libraryFilterType,
    setLibraryFilterType,
    inspectedEntry,
    setInspectedEntry,
    isDesktop,
    initialLoading,
    loading,
    followLoading,
    libraryLoading,
    followersListLoading,
    followingListLoading,
    postsLoaded,
    recentActivityLoaded,
    creatorBadge,
    alphaBadge,
    regularBadges,
    isOwnProfile,
    handleFollow,
    handleLike,
    handleFollowUser,
    navigateToProfile,
    getFilteredLibrary,
    navigate,
  } = useUserProfilePage(username, currentUser)

  // Which of their top tens is being viewed.
  const [visitorList, setVisitorList] = useState('all')
  const visitorLists = useMemo(() => {
    const counts = favorites.reduce<Record<string, number>>((acc, fav) => {
      const list = fav.list ?? 'all'
      acc[list] = (acc[list] ?? 0) + 1
      return acc
    }, {})
    const labels: Record<string, string> = {
      all: 'All time', movie: 'Movies', show: 'Shows', game: 'Games', book: 'Books',
    }
    return Object.keys(counts)
      .sort((a, b) => (a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b)))
      .map((id) => ({ id, label: labels[id] ?? id.replace('year-', ''), count: counts[id] }))
  }, [favorites])
  const shownFavorites = useMemo(
    () => favorites.filter((fav) => (fav.list ?? 'all') === visitorList),
    [favorites, visitorList]
  )

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'movie': return Film
      case 'show': return Tv
      case 'game': return Gamepad2
      case 'book': return Book
      default: return Film
    }
  }

  // Shared badge renderer used in both profile pages
  const renderBadges = () => {
    if (!userBadges.length) return null
    const colorEffects: Record<string, { gradient: string; glow: string }> = {
      'purple-500': { gradient: 'from-purple-600 via-purple-500 to-pink-500', glow: 'shadow-purple-500/50' },
      'blue-500': { gradient: 'from-blue-600 via-cyan-500 to-blue-400', glow: 'shadow-blue-500/50' },
      'green-500': { gradient: 'from-green-600 via-emerald-500 to-green-400', glow: 'shadow-green-500/50' },
      'yellow-500': { gradient: 'from-yellow-500 via-yellow-400 to-orange-500', glow: 'shadow-yellow-500/50' },
      'pink-500': { gradient: 'from-pink-600 via-pink-500 to-rose-500', glow: 'shadow-pink-500/50' },
      'red-500': { gradient: 'from-accent via-accent-soft to-butter-500', glow: 'shadow-red-500/50' },
      'orange-500': { gradient: 'from-orange-600 via-orange-500 to-yellow-500', glow: 'shadow-orange-500/50' },
      'cyan-500': { gradient: 'from-cyan-600 via-cyan-500 to-blue-400', glow: 'shadow-cyan-500/50' },
      'emerald-500': { gradient: 'from-emerald-600 via-emerald-500 to-green-400', glow: 'shadow-emerald-500/50' },
      'violet-500': { gradient: 'from-violet-600 via-violet-500 to-purple-400', glow: 'shadow-violet-500/50' },
      'amber-500': { gradient: 'from-amber-600 via-amber-500 to-orange-400', glow: 'shadow-amber-500/50' },
    }
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {creatorBadge && (
          <div className="relative overflow-hidden rounded-full shadow-[0_0_20px_rgba(246,205,102,0.5)] ring-2 ring-butter-400/40">
            {creatorBadge.badges?.gif_url
              ? <div className="absolute inset-0" style={{ opacity: (creatorBadge.badges.opacity || 80) / 100 }}><img loading="lazy" decoding="async" src={creatorBadge.badges.gif_url} alt="" className="w-full h-full object-cover"/></div>
              : <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500"/>}
            <div className="relative px-3 py-1 flex items-center gap-1.5">
              <Crown className="w-3 h-3 text-yellow-300" />
              <span className="text-xs font-black text-white uppercase tracking-wider drop-shadow-md">CREATOR</span>
            </div>
          </div>
        )}
        {alphaBadge && (
          <div className="relative overflow-hidden rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)] ring-2 ring-cyan-500/40">
            {alphaBadge.badges?.gif_url
              ? <div className="absolute inset-0" style={{ opacity: (alphaBadge.badges.opacity || 80) / 100 }}><img loading="lazy" decoding="async" src={alphaBadge.badges.gif_url} alt="" className="w-full h-full object-cover"/></div>
              : <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-500"/>}
            <div className="relative px-3 py-1 flex items-center gap-1.5">
              <Beaker className="w-3 h-3 text-cyan-300" />
              <span className="text-xs font-black text-white uppercase tracking-wider drop-shadow-md">ALPHA TESTER</span>
            </div>
          </div>
        )}
        {regularBadges.map((ub) => {
          if (!ub.badges) return null
          const badge = ub.badges
          const fx = colorEffects[badge.color] || { gradient: 'from-gray-600 to-gray-500', glow: 'shadow-gray-500/40' }
          return (
            <div key={ub.id} className={`relative overflow-hidden rounded-full shadow-sm ${fx.glow}`}>
              {badge.gif_url
                ? <div className="absolute inset-0" style={{ opacity: (badge.opacity || 80) / 100 }}><img loading="lazy" decoding="async" src={badge.gif_url} alt="" className="w-full h-full object-cover"/></div>
                : <div className={`absolute inset-0 bg-gradient-to-br ${fx.gradient}`} style={{ opacity: (badge.opacity || 80) / 100 }}/>}
              <div className="relative px-3 py-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
                <span className="text-xs font-bold text-white uppercase tracking-wide drop-shadow-lg">{badge.name}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderUserListItem = (user: any, listType: 'followers' | 'following') => (
    <li key={user.id} className="flex items-center gap-3 py-3">
      <button className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity" onClick={() => navigateToProfile(user.username)}>
        <UserAvatar avatarUrl={user.avatar_url} avatarCrop={user.avatar_crop} username={user.username} />
        {!user.avatar_url && <span className="text-sm font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>}
      </button>
      <button className="flex-1 min-w-0 text-left" onClick={() => navigateToProfile(user.username)}>
        <span className="font-semibold text-white hover:text-red-400 transition-colors text-sm">@{user.username}</span>
        {user.full_name && <p className="text-gray-500 text-xs truncate">{user.full_name}</p>}
      </button>
      {currentUser && currentUser.id !== user.id && (
        <button onClick={(e) => { e.stopPropagation(); handleFollowUser(user.id, user.isFollowing, listType) }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
            user.isFollowing ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-red-500/50 hover:text-red-400' : 'bg-accent text-accent-deep'
          }`}>
          {user.isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </li>
  )

  if (initialLoading) {
    return <ProfileSkeleton />
  }

  if (!profile) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">User not found</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      {loading && <div className="fixed top-0 left-0 right-0 h-0.5 bg-accent z-50 animate-pulse"/>}

      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <div className="px-4 pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* ── PROFILE HEADER ─────────────────────────── */}
        <div className="relative mb-0">
          {/* Banner — only rendered when user has a background */}
          {profile.bg_url && (() => {
            const cropData = profile.bg_crop ? (isDesktop ? profile.bg_crop.desktop : profile.bg_crop.mobile) : null
            return (
              <div className="h-36 sm:h-48 relative overflow-hidden rounded-2xl mb-0">
                <img
                  src={profile.bg_url}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    objectFit: 'cover',
                    objectPosition: cropData ? `${cropData.x}% ${cropData.y}%` : 'center',
                    transform: cropData ? `scale(${Math.max(1, cropData.scale / 100)})` : 'none',
                    transformOrigin: cropData ? `${cropData.x}% ${cropData.y}%` : 'center',
                    opacity: (profile.bg_opacity || 80) / 100,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/80"/>
              </div>
            )
          })()}

          {/* Avatar + actions row — z-10 so avatar always sits above banner */}
          <div className={`px-4 sm:px-6 relative z-10 ${profile.bg_url ? '' : 'pt-4'}`}>
            <div className={`flex items-end justify-between ${profile.bg_url ? '-mt-10 sm:-mt-14' : ''} mb-3`}>
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-3xl sm:text-4xl font-bold border-4 border-gray-900 shadow-xl flex-shrink-0">
                <UserAvatar avatarUrl={profile.avatar_url} avatarCrop={profile.avatar_crop} username={profile.username} />
                {!profile.avatar_url && profile.username.charAt(0).toUpperCase()}
              </div>
              {!isOwnProfile && currentUser && (
                <button onClick={handleFollow} disabled={followLoading}
                  className={`h-9 px-5 rounded-full font-bold text-sm transition-all active:scale-95 flex items-center gap-2 ${
                    isFollowing
                      ? 'bg-gray-800 text-white border border-gray-600 hover:border-red-500/50 hover:text-red-400'
                      : 'bg-accent text-accent-deep shadow-lg shadow-red-900/30'
                  }`}>
                  {followLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : isFollowing ? <><UserCheck className="w-4 h-4"/> Following</> : <><UserPlus className="w-4 h-4"/> Follow</>}
                </button>
              )}
              {isOwnProfile && (
                <button onClick={() => navigate('/profile')}
                  className="h-9 px-5 rounded-full font-bold text-sm bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 transition-all active:scale-95">
                  Edit profile
                </button>
              )}
            </div>

            {/* Name / bio / stats */}
            <div className="pb-2 mt-3 bg-gray-900/50 border border-gray-800/60 rounded-2xl px-4 pt-4 pb-4">
              <h2 className="text-xl font-bold text-white leading-tight">@{profile.username}</h2>
              {profile.full_name && <p className="text-gray-400 text-sm mt-0.5">{profile.full_name}</p>}
              {profile.bio
                ? <p className="text-gray-300 text-sm mt-2 leading-relaxed">{profile.bio}</p>
                : <p className="text-gray-600 text-sm mt-2 italic">No bio yet.</p>}

              {renderBadges()}

              <div className="flex gap-5 mt-4">
                <button onClick={() => setShowFollowersModal(true)} className="text-left group">
                  <span className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">{followersCount}</span>
                  <span className="text-gray-500 text-sm ml-1.5">Followers</span>
                </button>
                <button onClick={() => setShowFollowingModal(true)} className="text-left group">
                  <span className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">{followingCount}</span>
                  <span className="text-gray-500 text-sm ml-1.5">Following</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-800 mb-6"/>

        <div className="px-4 sm:px-6 space-y-8">
          {/* Favorites */}
          {favorites.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Top Picks</p>
              </div>
              {/* Their lists, not yours: only tabs they have actually filled
                  are offered, so nobody browses a wall of empty shelves. */}
              {visitorLists.length > 1 && (
                <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1" role="tablist">
                  {visitorLists.map(({ id, label, count }) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={visitorList === id}
                      onClick={() => setVisitorList(id)}
                      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                        visitorList === id
                          ? 'border-accent bg-accent/10 text-accent-soft'
                          : 'border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {label}
                      <span className={visitorList === id ? 'text-accent-soft/70' : 'text-gray-600'}>{count}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {shownFavorites.map((fav, index) => (
                  <div key={fav.id} className="relative group flex-shrink-0 w-20 sm:w-24 cursor-pointer" onClick={() => setInspectedEntry(fav.media_entry)}>
                    <div className="aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/5 group-hover:ring-white/20 transition-all">
                      {fav.media_entry?.cover_image_url
                        ? <img loading="lazy" decoding="async" src={fav.media_entry.cover_image_url} alt={fav.media_entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                        : <div className="w-full h-full flex items-center justify-center text-gray-600"><Film className="w-6 h-6"/></div>}
                      <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{index + 1}</div>
                    </div>
                    <p className="text-[11px] text-center mt-1.5 truncate text-gray-500 group-hover:text-white transition-colors">{fav.media_entry?.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Library button */}
          <button onClick={() => { setLibrarySearchQuery(''); setLibraryFilterType(null); setShowLibraryModal(true) }}
            className="w-full flex items-center justify-between px-5 py-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-2xl transition-all active:scale-[0.99] group">
            <div className="flex items-center gap-3">
              <Library className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors"/>
              <span className="font-semibold text-gray-300 group-hover:text-white transition-colors text-sm">{profile.username}'s Library</span>
            </div>
            <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180 group-hover:text-gray-400 transition-colors"/>
          </button>

          {/* Recent Activity */}
          {!recentActivityLoaded ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800/40 rounded-2xl"/>)}
            </div>
          ) : recentActivity.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Activity</p>
              <div className="space-y-2">
                {recentActivity.map((entry) => {
                  const Icon = getMediaIcon(entry.media_type)
                  return (
                    <div key={entry.id} onClick={() => setInspectedEntry(entry)}
                      className="flex gap-3 p-3 bg-gray-800/30 hover:bg-gray-800/60 rounded-2xl border border-gray-700/30 hover:border-gray-600/50 transition-all cursor-pointer group">
                      <div className="w-10 h-14 bg-gray-900 rounded-lg flex-shrink-0 overflow-hidden">
                        {entry.cover_image_url
                          ? <img loading="lazy" decoding="async" src={entry.cover_image_url} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-gray-600"><Icon className="w-4 h-4"/></div>}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="font-semibold text-sm text-white truncate group-hover:text-red-400 transition-colors">{entry.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-700/80 text-gray-400">{entry.status.replace('-', ' ')}</span>
                          {entry.rating && <span className="text-[11px] text-yellow-400 font-bold">★ {entry.rating}</span>}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 self-start pt-1 flex-shrink-0">{new Date(entry.updated_at).toLocaleDateString()}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Posts */}
          {!postsLoaded ? (
            <div className="space-y-4 animate-pulse">
              {[1,2].map(i => <div key={i} className="h-32 bg-gray-800/40 rounded-2xl"/>)}
            </div>
          ) : posts.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Posts</p>
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-gray-800/30 border border-gray-700/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        <UserAvatar avatarUrl={profile.avatar_url} avatarCrop={profile.avatar_crop} username={profile.username} />
                        {!profile.avatar_url && profile.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-white">@{profile.username}</span>
                      <span className="text-gray-600 text-xs ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>
                    {post.media_entries && (
                      <div className="bg-gray-900/60 rounded-xl p-3 mb-3 flex items-center gap-3 border border-gray-700/40">
                        {post.media_entries.cover_image_url && <img loading="lazy" decoding="async" src={post.media_entries.cover_image_url} className="w-10 h-14 object-cover rounded-lg bg-gray-800 flex-shrink-0"/>}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate text-white">{post.media_entries.title}</p>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">{post.media_entries.media_type}</p>
                        </div>
                        {post.media_entries.rating && (
                          <span className="flex-shrink-0 text-xs font-bold text-yellow-400">★ {post.media_entries.rating}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-5 pt-2 border-t border-gray-700/30">
                      <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 text-sm font-medium transition-colors active:scale-95 ${post.user_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'}`}>
                        <Heart className={`w-4 h-4 ${post.user_liked ? 'fill-current' : ''}`}/> {post.likes_count}
                      </button>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MessageCircle className="w-4 h-4"/> {post.comments_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-8"/>
      </div>

      {/* Library Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 w-full sm:max-w-4xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-bold text-white">{profile.username}'s Library</h2>
              <button onClick={() => setShowLibraryModal(false)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
            </div>
            <div className="px-4 py-3 border-b border-gray-800 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                <input type="text" value={librarySearchQuery} onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  placeholder="Search library…"
                  className="w-full bg-gray-800/80 border border-gray-700/60 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 text-sm"/>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {[{ id: null, label: 'All' }, { id: 'movie', label: 'Movies' }, { id: 'show', label: 'TV' }, { id: 'game', label: 'Games' }, { id: 'book', label: 'Books' }].map((type: any) => (
                  <button key={type.id ?? 'all'} onClick={() => setLibraryFilterType(type.id)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${libraryFilterType === type.id ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {libraryLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 animate-pulse">
                  {Array.from({length:10}).map((_,i) => <div key={i} className="aspect-[2/3] bg-gray-800 rounded-xl"/>)}
                </div>
              ) : getFilteredLibrary().length === 0 ? (
                <div className="text-center py-12 text-gray-600">No entries found.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {getFilteredLibrary().map((entry) => {
                    const Icon = getMediaIcon(entry.media_type)
                    return (
                      <div key={entry.id} className="group relative cursor-pointer" onClick={() => setInspectedEntry(entry)}>
                        <div className="aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden ring-1 ring-white/5 group-hover:ring-white/20 transition-all">
                          {entry.cover_image_url
                            ? <img loading="lazy" decoding="async" src={entry.cover_image_url} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                            : <div className="w-full h-full flex items-center justify-center text-gray-600"><Icon className="w-7 h-7"/></div>}
                          {entry.rating && (
                            <div className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[10px] font-bold text-yellow-400 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current"/> {entry.rating}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-center mt-1.5 truncate text-gray-500 group-hover:text-white transition-colors" title={entry.title}>{entry.title}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Entry Inspection Modal */}
      {inspectedEntry && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100vh-40px)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{inspectedEntry.media_type}</span>
                  {inspectedEntry.year && <span className="text-[10px] text-gray-600">{inspectedEntry.year}</span>}
                </div>
                <h2 className="text-base font-bold text-white leading-tight truncate">{inspectedEntry.title}</h2>
              </div>
              <button onClick={() => setInspectedEntry(null)} className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <div className="flex gap-4 p-4 overflow-y-auto">
              {inspectedEntry.cover_image_url && (
                <div className="w-24 flex-shrink-0">
                  <img loading="lazy" decoding="async" src={inspectedEntry.cover_image_url} alt={inspectedEntry.title} className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg border border-white/5"/>
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-800/50 rounded-xl p-2.5 border border-gray-700/40 text-center">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Status</div>
                    <div className="text-xs text-white font-medium capitalize">{inspectedEntry.status.replace('-', ' ')}</div>
                  </div>
                  {inspectedEntry.rating && (
                    <div className="flex-1 bg-gray-800/50 rounded-xl p-2.5 border border-gray-700/40 text-center">
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Rating</div>
                      <div className="text-xs text-yellow-400 font-bold flex items-center justify-center gap-1">{inspectedEntry.rating} <Star className="w-3 h-3 fill-current"/></div>
                    </div>
                  )}
                </div>
                {inspectedEntry.notes && (
                  <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/40 text-gray-300 text-xs leading-relaxed italic">
                    "{inspectedEntry.notes}"
                  </div>
                )}
                <p className="text-[10px] text-gray-700 mt-auto">Updated {new Date(inspectedEntry.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Followers / Following Modals */}
      {(showFollowersModal || showFollowingModal) && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-bold text-white">{showFollowersModal ? 'Followers' : 'Following'}</h2>
              <button onClick={() => showFollowersModal ? setShowFollowersModal(false) : setShowFollowingModal(false)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 min-h-0">
              {(showFollowersModal ? followersListLoading : followingListLoading) ? (
                <div className="space-y-3 py-4 animate-pulse">{Array.from({length:4}).map((_,i) => <div key={i} className="h-12 bg-gray-800/40 rounded-xl"/>)}</div>
              ) : (showFollowersModal ? followersList : followingList).length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-sm">{showFollowersModal ? 'No followers yet.' : 'Not following anyone yet.'}</div>
              ) : (
                <ul className="divide-y divide-gray-800/60">
                  {(showFollowersModal ? followersList : followingList).map(user => renderUserListItem(user, showFollowersModal ? 'followers' : 'following'))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

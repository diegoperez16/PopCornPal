import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  Film,
  Tv,
  Gamepad2,
  Book,
  UserPlus,
  UserCheck,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Heart,
  MessageCircle,
  Search,
  Share2,
  Check,
  Pencil,
  ListOrdered,
  GalleryHorizontal,
} from 'lucide-react'
import ProfileSkeleton from '../components/ProfileSkeleton'
import Brand from '../components/brand/Brand'
import PalMark from '../components/brand/PalMark'
import Sheet from '../components/Sheet'
import Reveal from '../components/motion/Reveal'
import ProfileStats from '../features/profile/ProfileStats'
import PillTabs from '../features/profile/PillTabs'
import SectionHeader from '../features/profile/SectionHeader'
import AuroraBanner from '../features/profile/AuroraBanner'
import PeopleListSheet from '../features/profile/PeopleListSheet'
import BadgeRow from '../features/profile/BadgeRow'
import HouseRing from '../features/house/HouseRing'
import VerdictMark from '../features/verdict/VerdictMark'
import { verdictFor } from '../features/verdict/verdictModel'
import { statusLabel } from '../features/library/libraryModel'
import { buildVisitorTabs, labelForList } from '../features/profile/favoriteLists'
import { useUserProfilePage } from '../hooks/useUserProfilePage'
import UserAvatar from '../components/UserAvatar'

const TYPE_NAMES: Record<string, string> = { movie: 'Movie', show: 'Show', game: 'Game', book: 'Book' }
const TYPE_ICONS = { movie: Film, show: Tv, game: Gamepad2, book: Book } as const

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
    favoriteLists,
    shelfSummary,
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
    topPicksView,
    setTopPicksView,
    isOwnProfile,
    handleFollow,
    handleLike,
    handleShareProfile,
    shareStatus,
    handleFollowUser,
    navigateToProfile,
    getFilteredLibrary,
    navigate,
  } = useUserProfilePage(username, currentUser)

  // Which of their top tens is being viewed.
  const [visitorList, setVisitorList] = useState('all')
  const visitorLists = useMemo(
    () => buildVisitorTabs(favorites, favoriteLists),
    [favorites, favoriteLists]
  )
  const activeList = visitorLists.some((tab) => tab.id === visitorList)
    ? visitorList
    : (visitorLists[0]?.id ?? 'all')
  const shownFavorites = useMemo(
    () => favorites.filter((fav) => (fav.list ?? 'all') === activeList),
    [favorites, activeList]
  )
  const activeListLabel = labelForList(activeList, favoriteLists)

  // A visited profile's entries arrive with a plain-string status.
  const labelOf = (status: string) => statusLabel(status as Parameters<typeof statusLabel>[0])

  /** Poppy's verdict beside the number — the app's own star. */
  const renderRating = (rating: number | null | undefined, size = 18, textClass = 'text-sm') => {
    const verdict = verdictFor(rating)
    if (!rating || !verdict) return null
    return (
      <span className={`flex shrink-0 items-center gap-1 font-bold tabular-nums text-butter-gold ${textClass}`} title={verdict.name}>
        <VerdictMark verdict={verdict.id} size={size} />
        {rating}
      </span>
    )
  }

  if (initialLoading) {
    return <ProfileSkeleton />
  }

  if (!profile) {
    return (
      <div className="app-page">
        <div className="mx-auto max-w-3xl px-5 pt-8">
          <div className="app-empty">
            <div className="flex justify-center"><PalMark size={56} /></div>
            <h3 className="mt-3">User not found</h3>
            <p>Nobody by that name here.</p>
            <button type="button" onClick={() => navigate(-1)} className="app-button-secondary mt-5">Go back</button>
          </div>
        </div>
      </div>
    )
  }

  const bannerCrop = profile.bg_crop ? (isDesktop ? profile.bg_crop.desktop : profile.bg_crop.mobile) : null
  const bannerStyle = {
    objectFit: 'cover' as const,
    objectPosition: bannerCrop ? `${bannerCrop.x}% ${bannerCrop.y}%` : 'center',
    transform: bannerCrop ? `scale(${Math.max(1, bannerCrop.scale / 100)})` : 'none',
    transformOrigin: bannerCrop ? `${bannerCrop.x}% ${bannerCrop.y}%` : 'center',
    opacity: (profile.bg_opacity || 80) / 100,
  }

  return (
    <div className="app-page">
      {loading && <div className="fixed left-0 right-0 top-0 z-50 h-0.5 animate-pulse bg-accent"/>}

      <main className="mx-auto max-w-3xl px-5 pt-4 sm:pt-6">
        {/* Signed in, this is a page you navigated to; signed out, it is the
            whole app you have seen so far, so it introduces itself instead. */}
        <div className="pb-3">
          {currentUser ? (
            <button type="button" onClick={() => navigate(-1)} className="app-button-ghost app-button-sm -ml-3">
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Brand />
              <Link to="/auth" className="app-button-primary app-button-sm rounded-full">
                Join PopcornPal
              </Link>
            </div>
          )}
        </div>

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="relative h-40 overflow-hidden rounded-2xl border border-line-soft sm:h-52">
            {profile.bg_url ? (
              <img src={profile.bg_url} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={bannerStyle} />
            ) : (
              <AuroraBanner />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-bg/60 to-transparent" />
          </div>

          <div className="relative z-20 -mt-10 px-1 sm:-mt-14 sm:px-2">
            <div className="flex items-end justify-between gap-3">
              <HouseRing house={profile.house} beast>
                <div className="app-avatar h-20 w-20 border-4 border-bg text-3xl sm:h-28 sm:w-28 sm:text-4xl">
                  <UserAvatar avatarUrl={profile.avatar_url} avatarCrop={profile.avatar_crop} username={profile.username} />
                  {!profile.avatar_url && profile.username.charAt(0).toUpperCase()}
                </div>
              </HouseRing>

              {/* Sits clear of the banner's bottom edge; only the avatar overlaps it. */}
              <div className="flex translate-y-2 items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareProfile}
                  title={`Share @${profile.username}'s profile`}
                  className={`app-button-secondary app-button-sm rounded-full ${
                    shareStatus === 'failed' ? 'text-danger' : shareStatus === 'idle' ? '' : 'text-butter-300'
                  }`}
                >
                  {shareStatus === 'idle' ? <Share2 size={16} /> : <Check size={16} />}
                  {shareStatus === 'idle' ? 'Share' : shareStatus === 'copied' ? 'Link copied' : shareStatus === 'shared' ? 'Shared' : 'Copy failed'}
                </button>
                {!isOwnProfile && currentUser && (
                  <button type="button" onClick={handleFollow} disabled={followLoading}
                    className={isFollowing ? 'app-button-secondary app-button-sm rounded-full' : 'app-button-primary app-button-sm rounded-full'}>
                    {followLoading ? <Loader2 size={16} className="animate-spin"/> : isFollowing ? <><UserCheck size={16}/> Following</> : <><UserPlus size={16}/> Follow</>}
                  </button>
                )}
                {isOwnProfile && (
                  <button type="button" onClick={() => navigate('/profile')} aria-label="Edit profile" className="app-icon-button">
                    <Pencil size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="name-shine text-[27px] font-bold leading-none tracking-tight">@{profile.username}</h2>
                  {profile.full_name && <p className="text-sm text-muted">{profile.full_name}</p>}
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-200">
                  {profile.bio ? profile.bio : <span className="italic text-muted">No bio yet.</span>}
                </p>
              </div>

              <div className="flex gap-5">
                <button type="button" onClick={() => setShowFollowersModal(true)} className="group min-h-11 text-left">
                  <span className="text-base font-bold tabular-nums text-gray-50 transition-colors group-hover:text-accent-soft">{followersCount}</span>
                  <span className="ml-1.5 text-sm text-muted">Followers</span>
                </button>
                <button type="button" onClick={() => setShowFollowingModal(true)} className="group min-h-11 text-left">
                  <span className="text-base font-bold tabular-nums text-gray-50 transition-colors group-hover:text-accent-soft">{followingCount}</span>
                  <span className="ml-1.5 text-sm text-muted">Following</span>
                </button>
              </div>

              <BadgeRow badges={userBadges} />

              {shelfSummary && <ProfileStats stats={shelfSummary} />}
            </div>
          </div>
        </div>

        {/* ── Top picks: their ranked ten, hero at number one ── */}
        {favorites.length > 0 && (
          <Reveal className="mb-10">
            <SectionHeader title="Top picks" count={shownFavorites.length} />

            <div className="mb-3 space-y-2">
              {/* Their lists, not yours: only tabs they have actually filled
                  are offered, so nobody browses a wall of empty shelves. */}
              {visitorLists.length > 1 && (
                <PillTabs
                  ariaLabel="Which top ten"
                  value={activeList}
                  onChange={setVisitorList}
                  tabs={visitorLists}
                />
              )}
              <div className="flex">
                <div className="app-segmented !gap-0.5 !p-0.5" role="group" aria-label="Top picks layout">
                  <button
                    type="button"
                    aria-pressed={topPicksView === 'list'}
                    onClick={() => setTopPicksView('list')}
                    className="!min-h-10 !px-3 !text-[13px]"
                  >
                    <ListOrdered size={16} aria-hidden="true" /> List
                  </button>
                  <button
                    type="button"
                    aria-pressed={topPicksView === 'shelf'}
                    onClick={() => setTopPicksView('shelf')}
                    className="!min-h-10 !px-3 !text-[13px]"
                  >
                    <GalleryHorizontal size={16} aria-hidden="true" /> Shelf
                  </button>
                </div>
              </div>
            </div>

            {topPicksView === 'shelf' ? (
              <ol className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 pt-3" aria-label={`${activeListLabel} top ten`}>
                {shownFavorites.map((fav, index) => {
                  const entry = fav.media_entry
                  const title = entry?.title ?? 'Untitled'
                  const Icon = entry ? TYPE_ICONS[entry.media_type] ?? Film : Film
                  return (
                    <li key={fav.id} className="relative w-[104px] shrink-0">
                      <button
                        type="button"
                        disabled={!entry}
                        onClick={() => entry && setInspectedEntry(entry)}
                        aria-label={`Number ${index + 1}: ${title}`}
                        className="group block w-full text-left"
                      >
                        <div className="relative aspect-[2/3] rounded-xl border border-line bg-surface-strong">
                          <div className="h-full w-full overflow-hidden rounded-[inherit]">
                            {entry?.cover_image_url ? (
                              <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" draggable={false} />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted"><Icon size={22} strokeWidth={1.4} /></div>
                            )}
                          </div>
                          <span
                            aria-hidden="true"
                            className={`absolute -left-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg text-sm font-bold tabular-nums shadow-md ${
                              index === 0 ? 'bg-butter-400 text-ink' : 'bg-surface-raised text-gray-50'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-gray-50">{title}</p>
                        {entry?.year && <p className="mt-0.5 text-xs text-muted">{entry.year}</p>}
                      </button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <ol className="space-y-2" aria-label={`${activeListLabel} top ten`}>
                {shownFavorites.map((fav, index) => {
                  const entry = fav.media_entry
                  const title = entry?.title ?? 'Untitled'
                  const verdict = verdictFor(entry?.rating)
                  const hero = index === 0
                  const meta = [entry ? TYPE_NAMES[entry.media_type] ?? entry.media_type : null, entry?.year].filter(Boolean).join(' · ')
                  const Icon = entry ? TYPE_ICONS[entry.media_type] ?? Film : Film
                  return (
                    <li key={fav.id} className={`app-panel flex items-center rounded-2xl ${hero ? 'gap-4 p-4' : 'gap-3 p-2 pr-2'}`}>
                      {!hero && (
                        <span className="w-7 shrink-0 text-center text-base font-bold tabular-nums text-muted" aria-hidden="true">
                          {index + 1}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={!entry}
                        onClick={() => entry && setInspectedEntry(entry)}
                        aria-label={`Number ${index + 1}: ${title}`}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                      >
                        <div className={`relative shrink-0 rounded-lg border border-line bg-surface-strong ${hero ? 'h-[126px] w-[84px] rounded-xl' : 'h-16 w-11'}`}>
                          <div className="h-full w-full overflow-hidden rounded-[inherit]">
                            {entry?.cover_image_url ? (
                              <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="h-full w-full object-cover" draggable={false} />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted"><Icon size={hero ? 24 : 16} /></div>
                            )}
                          </div>
                          {hero && (
                            <span
                              aria-hidden="true"
                              className="absolute -left-2.5 -top-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-butter-400 text-base font-bold tabular-nums text-ink shadow-md"
                            >
                              1
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={hero ? 'text-lg font-semibold leading-tight text-gray-50' : 'truncate text-sm font-semibold text-gray-50'}>
                            {title}
                          </p>
                          {meta && <p className="mt-0.5 text-xs text-muted">{meta}</p>}
                          {hero && entry?.notes && (
                            <p className="mt-2 line-clamp-2 text-sm italic leading-snug text-muted">{entry.notes}</p>
                          )}
                        </div>
                      </button>
                      {verdict && entry?.rating ? (
                        <span className="flex shrink-0 items-center gap-1 pr-1 text-sm font-semibold tabular-nums text-butter-gold" title={verdict.name}>
                          <VerdictMark verdict={verdict.id} size={hero ? 28 : 22} />
                          {entry.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            )}
          </Reveal>
        )}

        {/* Their shelf, their week and their posts are for people who are
            here properly; a shared link stops at the top tens. Signed out,
            none of it is fetched either. */}
        {currentUser && (<>
          {/* ── Recent activity: the last few things they logged, as posters ── */}
          <Reveal className="mb-10">
            <SectionHeader
              title="Recent activity"
              action={
                <button
                  type="button"
                  onClick={() => { setLibrarySearchQuery(''); setLibraryFilterType(null); setShowLibraryModal(true) }}
                  className="app-button-ghost app-button-sm shrink-0"
                >
                  Library <ChevronRight size={16} />
                </button>
              }
            />
            {!recentActivityLoaded ? (
              <div className="flex gap-3 animate-pulse" aria-hidden="true">
                {[1, 2, 3].map((i) => <div key={i} className="aspect-[2/3] w-[104px] shrink-0 rounded-xl bg-surface-strong" />)}
              </div>
            ) : recentActivity.length > 0 ? (
              <ol className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1" aria-label={`${profile.username}'s recent activity`}>
                {recentActivity.map((entry) => {
                  const Icon = TYPE_ICONS[entry.media_type] ?? Film
                  return (
                    <li key={entry.id} className="w-[104px] shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectedEntry(entry)}
                        aria-label={`${entry.title}, ${labelOf(entry.status)}`}
                        className="group block w-full text-left"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-surface-strong">
                          {entry.cover_image_url ? (
                            <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted"><Icon size={22} strokeWidth={1.4} /></div>
                          )}
                          {entry.rating ? (
                            <span className="absolute right-1.5 top-1.5 rounded-md border border-line bg-bg/90 py-0.5 pl-0.5 pr-1.5 backdrop-blur">
                              {renderRating(entry.rating, 18, 'text-xs')}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-gray-50 transition-colors group-hover:text-accent-soft">{entry.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{labelOf(entry.status)}</p>
                      </button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="app-empty">
                <div className="flex justify-center"><PalMark size={56} /></div>
                <h3 className="mt-3">Nothing logged yet</h3>
                <p>When they log something, it shows up here.</p>
              </div>
            )}
          </Reveal>

          {/* Posts */}
          {!postsLoaded ? (
            <div className="space-y-4 animate-pulse" aria-hidden="true">
              {[1,2].map(i => <div key={i} className="h-32 rounded-2xl bg-surface-strong"/>)}
            </div>
          ) : posts.length > 0 && (
            <Reveal>
              <SectionHeader title="Posts" count={posts.length} />
              <div className="space-y-4">
                {posts.map((post) => (
                  <article key={post.id} className="app-panel rounded-2xl p-4">
                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="app-avatar h-8 w-8 text-xs">
                        <UserAvatar avatarUrl={profile.avatar_url} avatarCrop={profile.avatar_crop} username={profile.username} />
                        {!profile.avatar_url && profile.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-50">@{profile.username}</span>
                      <span className="ml-auto text-xs text-muted">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-200">{post.content}</p>
                    {post.media_entries && (
                      <div className="mb-3 flex items-center gap-3 rounded-xl border border-line-soft bg-surface-sunken p-3">
                        {post.media_entries.cover_image_url && <img loading="lazy" decoding="async" src={post.media_entries.cover_image_url} alt="" className="h-14 w-10 shrink-0 rounded-lg bg-surface-strong object-cover"/>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-50">{post.media_entries.title}</p>
                          <p className="mt-0.5 text-xs capitalize text-muted">{post.media_entries.media_type}</p>
                        </div>
                        {renderRating(post.media_entries.rating, 18, 'text-xs')}
                      </div>
                    )}
                    <div className="flex items-center gap-4 border-t border-line-soft pt-1">
                      <button
                        type="button"
                        onClick={() => (currentUser ? handleLike(post.id) : navigate('/auth'))}
                        aria-pressed={Boolean(post.user_liked)}
                        className={`flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium transition-colors ${post.user_liked ? 'text-accent-soft' : 'text-muted hover:text-accent-soft'}`}
                      >
                        <Heart size={16} className={post.user_liked ? 'fill-current' : ''}/> {post.likes_count}
                      </button>
                      <span className="flex min-h-11 items-center gap-1.5 text-sm text-muted">
                        <MessageCircle size={16}/> {post.comments_count}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          )}
        </>)}

        {!currentUser && (
          <div className="app-empty mt-8">
            <div className="flex justify-center"><PalMark size={56} /></div>
            <h3 className="mt-3">Build your own shelves</h3>
            <p>
              Keep every film, show, game and book you finish — and a top ten worth arguing about.
            </p>
            <Link to="/auth" className="app-button-primary mt-5">
              Join PopcornPal
            </Link>
          </div>
        )}
      </main>

      {/* Library */}
      {showLibraryModal && (
        <Sheet title={`${profile.username}'s library`} onClose={() => setShowLibraryModal(false)} size="wide">
          <div className="space-y-3">
            <div className="app-search">
              <Search size={18}/>
              <input
                type="search"
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                placeholder="Search their library"
                aria-label={`Search ${profile.username}'s library`}
                enterKeyHint="search"
                className="app-input"
              />
            </div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {[{ id: null, label: 'All' }, { id: 'movie', label: 'Movies' }, { id: 'show', label: 'TV' }, { id: 'game', label: 'Games' }, { id: 'book', label: 'Books' }].map((type: any) => (
                <button key={type.id ?? 'all'} type="button" aria-pressed={libraryFilterType === type.id} onClick={() => setLibraryFilterType(type.id)} className="app-chip">
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            {libraryLoading ? (
              <div className="grid grid-cols-3 gap-3 animate-pulse sm:grid-cols-5">
                {Array.from({length:10}).map((_,i) => <div key={i} className="aspect-[2/3] rounded-xl bg-surface-strong"/>)}
              </div>
            ) : getFilteredLibrary().length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No entries found.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {getFilteredLibrary().map((entry) => {
                  const Icon = TYPE_ICONS[entry.media_type] ?? Film
                  return (
                    <button key={entry.id} type="button" className="group text-left" onClick={() => setInspectedEntry(entry)}>
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line-soft bg-surface-strong">
                        {entry.cover_image_url
                          ? <img loading="lazy" decoding="async" src={entry.cover_image_url} alt={entry.title} className="h-full w-full object-cover"/>
                          : <div className="flex h-full w-full items-center justify-center text-gray-500"><Icon size={28}/></div>}
                        {entry.rating ? (
                          <div className="absolute right-1.5 top-1.5 rounded-full border border-line bg-gray-900/85 px-1.5 py-0.5">
                            {renderRating(entry.rating, 14, 'text-xs')}
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-1.5 truncate text-center text-xs text-muted transition-colors group-hover:text-gray-50" title={entry.title}>{entry.title}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* One entry, up close */}
      {inspectedEntry && (
        <Sheet
          header={
            <div className="pt-2">
              <p className="text-xs text-muted">
                <span className="capitalize">{inspectedEntry.media_type}</span>
                {inspectedEntry.year && <> · {inspectedEntry.year}</>}
              </p>
              <h2 className="truncate text-lg font-semibold leading-snug tracking-tight text-gray-50">{inspectedEntry.title}</h2>
            </div>
          }
          ariaLabel={inspectedEntry.title}
          onClose={() => setInspectedEntry(null)}
        >
          <div className="flex gap-4">
            {inspectedEntry.cover_image_url && (
              <img loading="lazy" decoding="async" src={inspectedEntry.cover_image_url} alt="" className="aspect-[2/3] w-24 shrink-0 rounded-lg border border-line-soft object-cover"/>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-line-soft bg-surface-sunken p-3">
                  <p className="text-xs text-muted">Status</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-50">{labelOf(inspectedEntry.status)}</p>
                </div>
                {inspectedEntry.rating ? (
                  <div className="rounded-xl border border-line-soft bg-surface-sunken p-3">
                    <p className="text-xs text-muted">Rating</p>
                    <div className="mt-0.5">{renderRating(inspectedEntry.rating)}</div>
                  </div>
                ) : null}
              </div>
              {inspectedEntry.notes && (
                <p className="rounded-xl bg-surface-sunken p-3 text-sm leading-relaxed text-gray-200">
                  "{inspectedEntry.notes}"
                </p>
              )}
              <p className="mt-auto text-xs text-muted">Updated {new Date(inspectedEntry.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </Sheet>
      )}

      {/* Followers / Following */}
      {(showFollowersModal || showFollowingModal) && (
        <PeopleListSheet
          title={showFollowersModal ? 'Followers' : 'Following'}
          people={showFollowersModal ? followersList : followingList}
          loading={showFollowersModal ? followersListLoading : followingListLoading}
          currentUserId={currentUser?.id}
          onClose={() => (showFollowersModal ? setShowFollowersModal(false) : setShowFollowingModal(false))}
          onOpenProfile={navigateToProfile}
          onToggleFollow={(id, following) => handleFollowUser(id, following, showFollowersModal ? 'followers' : 'following')}
        />
      )}
    </div>
  )
}

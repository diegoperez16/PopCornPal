import { Link } from 'react-router-dom'
import {
  Book,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Film,
  GalleryHorizontal,
  Gamepad2,
  GripVertical,
  ListOrdered,
  ListPlus,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Tv,
  X,
} from 'lucide-react'
import PalMark from '../components/brand/PalMark'
import Sheet from '../components/Sheet'
import RatingField from '../components/RatingField'
import NoteField from '../components/NoteField'
import VerdictMark from '../features/verdict/VerdictMark'
import HouseRing from '../features/house/HouseRing'
import HouseCard from '../features/house/HouseCard'
import { verdictFor } from '../features/verdict/verdictModel'
import ThemePicker from '../components/ThemePicker'
import SectionHeader from '../features/profile/SectionHeader'
import PillTabs from '../features/profile/PillTabs'
import AuroraBanner from '../features/profile/AuroraBanner'
import PeopleListSheet from '../features/profile/PeopleListSheet'
import BadgeRow, { BadgeMedal } from '../features/profile/BadgeRow'
import { sortBadges } from '../features/profile/badges'
import Reveal from '../components/motion/Reveal'
import { addedYearOf, collectUniqueMedia, parseYearFilter, statusLabel } from '../features/library/libraryModel'
import { isCustomList, labelForList, LIST_TITLE_MAX } from '../features/profile/favoriteLists'
import GifPicker from '../components/GifPicker'
import ProfileSkeleton from '../components/ProfileSkeleton'
import ImageCropper from '../components/ImageCropper'
import AvatarCropper from '../components/AvatarCropper'
import { useProfilePage } from '../hooks/useProfilePage'

const ENTRY_STATUSES = ['completed', 'in-progress', 'planned', 'logged'] as const
const TYPE_NAMES: Record<string, string> = { movie: 'Movie', show: 'Show', game: 'Game', book: 'Book' }
const TYPE_ICONS = { movie: Film, show: Tv, game: Gamepad2, book: Book } as const

export default function ProfilePage() {
  const {
    user,
    profile,
    entries,
    favorites,
    favoriteList,
    setFavoriteList,
    favoriteTabs,
    customLists,
    userBadges,
    availableBadges,
    initialLoading,
    isEditing,
    setIsEditing,
    username,
    setUsername,
    usernameError,
    saveError,
    fullName,
    setFullName,
    bio,
    setBio,
    avatarUrl,
    uploadedAvatar,
    setUploadedAvatar,
    savingProfile,
    selectedBadgeIds,
    setSelectedBadgeIds,
    showAvatarGifPicker,
    setShowAvatarGifPicker,
    showAvatarCropper,
    avatarToCrop,
    pendingAvatarGifCrop,
    avatarFileInputRef,
    profileBgUrl,
    profileBgOpacity,
    setProfileBgOpacity,
    showGifPickerModal,
    setShowGifPickerModal,
    uploadedBgImage,
    showImageCropper,
    imageToCrop,
    originalBgImageUrl,
    desktopCropData,
    mobileCropData,
    mobileHeaderAspectRatio,
    pendingBgImage,
    bgFileInputRef,
    profileHeaderRef,
    selectedEntry,
    setSelectedEntry,
    statusFilter,
    setStatusFilter,
    editRating,
    setEditRating,
    editStatus,
    setEditStatus,
    editNotes,
    setEditNotes,
    draggedFavIndex,
    showMediaSelector,
    setShowMediaSelector,
    mediaSearchQuery,
    setMediaSearchQuery,
    mediaFilterType,
    setMediaFilterType,
    mediaFilterYear,
    setMediaFilterYear,
    mediaYears,
    isManagingFavorites,
    setIsManagingFavorites,
    topPicksView,
    setTopPicksView,
    recentActivityRef,
    profileBgRef,
    isDesktop,
    cropperUserPreview,
    followersCount,
    followingCount,
    peopleSheet,
    setPeopleSheet,
    followersList,
    followingList,
    peopleListLoading,
    toggleFollow,
    updateProfile,
    handleSignOut,
    handleSaveProfile,
    handleBgUpload,
    handleBgUrl,
    handleGifPickerSelect,
    handleCropComplete,
    handleCropCancel,
    handleRemoveBg,
    handleAvatarUpload,
    handleAvatarCropComplete,
    handleAvatarCropCancel,
    handleAvatarGifPickerSelect,
    handleAvatarUrl,
    handleRemoveAvatar,
    handleUpdateEntry,
    handleDeleteEntry,
    handleAddFavorite,
    handleRemoveFavorite,
    handleShareProfile,
    shareStatus,
    handleDeleteList,
    listDraft,
    setListDraft,
    startNewList,
    startRenameList,
    cancelListDraft,
    submitListDraft,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    navigate,
  } = useProfilePage()

  if (initialLoading) {
    return <ProfileSkeleton />
  }

  if (!user || !profile) return null

  const avatarSrc = uploadedAvatar || avatarUrl || profile.avatar_url
  const avatarFallback = profile.username.charAt(0).toUpperCase()
  const avatarImage = avatarSrc ? (
    pendingAvatarGifCrop ? (
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `url(${avatarSrc})`,
          backgroundSize: `${pendingAvatarGifCrop.scale}%`,
          backgroundPosition: `${pendingAvatarGifCrop.x}% ${pendingAvatarGifCrop.y}%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
    ) : (
      <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
    )
  ) : (
    avatarFallback
  )

  const bannerSrc = pendingBgImage || originalBgImageUrl || uploadedBgImage || profileBgUrl || ''
  const bannerCrop = (pendingBgImage || originalBgImageUrl) ? (isDesktop ? desktopCropData : mobileCropData) : null
  const bannerStyle = {
    objectFit: 'cover' as const,
    objectPosition: bannerCrop ? `${bannerCrop.x}% ${bannerCrop.y}%` : 'center',
    transform: bannerCrop ? `scale(${Math.max(1, bannerCrop.scale / 100)})` : 'none',
    transformOrigin: bannerCrop ? `${bannerCrop.x}% ${bannerCrop.y}%` : 'center',
    opacity: (profileBgOpacity ?? 80) / 100,
  }

  const closeEditor = () => {
    setIsEditing(false)
    setUploadedAvatar(null)
    if (avatarFileInputRef.current) avatarFileInputRef.current.value = ''
  }

  const activity = entries.filter((entry) => entry.status !== 'logged')
  const shownEntries = activity.filter((entry) => statusFilter === 'all' || entry.status === statusFilter)
  const countOf = (status: string) => activity.filter((entry) => entry.status === status).length

  return (
    <div className="app-page">
      <main className="mx-auto max-w-3xl px-5 pt-4 sm:pt-6">

        {/* ── Header ── */}
        <div className="mb-8">
          <div
            ref={profileHeaderRef}
            className="relative h-40 overflow-hidden rounded-2xl border border-line-soft sm:h-52"
          >
            {bannerSrc ? (
              <div ref={profileBgRef} className="absolute inset-0 z-0">
                <img src={bannerSrc} alt="" draggable={false} className="h-full w-full" style={bannerStyle} />
              </div>
            ) : (
              <AuroraBanner />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-bg/60 to-transparent" />
          </div>

          <div className="relative z-20 -mt-10 px-1 sm:-mt-14 sm:px-2">
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <HouseRing house={profile.house} beast>
                  <div className="app-avatar h-20 w-20 border-4 border-bg text-3xl sm:h-28 sm:w-28 sm:text-4xl">
                    {avatarImage}
                  </div>
                </HouseRing>
              </div>

              {/* Sits clear of the banner's bottom edge; only the avatar overlaps it. */}
              <div className="flex translate-y-2 items-center gap-1">
                {profile.is_admin && (
                  <button type="button" onClick={() => navigate('/admin/badges')} aria-label="Badge control" className="app-icon-button">
                    <Sparkles size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleShareProfile}
                  className={`app-button-secondary app-button-sm rounded-full ${
                    shareStatus === 'failed' ? 'text-danger' : shareStatus === 'idle' ? '' : 'text-butter-300'
                  }`}
                >
                  {shareStatus === 'idle' ? <Share2 size={16} /> : <Check size={16} />}
                  {shareStatus === 'idle' ? 'Share' : shareStatus === 'copied' ? 'Link copied' : shareStatus === 'shared' ? 'Shared' : 'Copy failed'}
                </button>
                <button type="button" onClick={() => setIsEditing(true)} aria-label="Edit profile" className="app-icon-button">
                  <Pencil size={18} />
                </button>
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
                <button type="button" onClick={() => setPeopleSheet('followers')} className="group min-h-11 text-left">
                  <span className="text-base font-bold tabular-nums text-gray-50 transition-colors group-hover:text-accent-soft">{followersCount}</span>
                  <span className="ml-1.5 text-sm text-muted">Followers</span>
                </button>
                <button type="button" onClick={() => setPeopleSheet('following')} className="group min-h-11 text-left">
                  <span className="text-base font-bold tabular-nums text-gray-50 transition-colors group-hover:text-accent-soft">{followingCount}</span>
                  <span className="ml-1.5 text-sm text-muted">Following</span>
                </button>
              </div>

              <BadgeRow badges={userBadges} />
            </div>
          </div>
        </div>

        {/* Your house, only in the Wizarding season */}
        <Reveal className="mb-8">
          <HouseCard house={profile.house} entries={entries} onChoose={(house) => void updateProfile({ house })} />
        </Reveal>

        {/* ── Top picks: a ranked ten with a hero at number one ── */}
        <Reveal className="mb-10">
          <SectionHeader
            title="Top picks"
            count={favorites.length}
            action={
              favorites.length < 10 ? (
                <button type="button" onClick={() => setShowMediaSelector(true)} className="app-button-primary app-button-sm shrink-0">
                  <Plus size={16} /> Add
                </button>
              ) : undefined
            }
          />

          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <PillTabs ariaLabel="Which top ten" value={favoriteList} onChange={setFavoriteList} tabs={favoriteTabs} />
              </div>
              <button type="button" onClick={startNewList} aria-label="New list" className="app-button-ghost app-button-sm shrink-0">
                <ListPlus size={16} />
                <span className="hidden sm:inline">New list</span>
              </button>
            </div>

            {/* How to look at the list, and, in the ranked view, how to rearrange it. */}
            <div className="flex items-center justify-between gap-2">
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
              {favorites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsManagingFavorites(!isManagingFavorites)}
                  className={isManagingFavorites ? 'app-button-primary app-button-sm' : 'app-button-secondary app-button-sm'}
                >
                  {isManagingFavorites ? <><Check size={16} /> Done</> : <><Pencil size={16} /> Edit</>}
                </button>
              )}
            </div>

            {listDraft && (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={listDraft.title}
                  maxLength={LIST_TITLE_MAX}
                  aria-label={listDraft.mode === 'create' ? 'New list name' : 'List name'}
                  enterKeyHint="done"
                  onChange={(e) => setListDraft({ ...listDraft, title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitListDraft()
                    if (e.key === 'Escape') cancelListDraft()
                  }}
                  placeholder={listDraft.mode === 'create' ? 'Favorite Spider-Man movies' : 'Rename this list'}
                  className="app-input min-w-0 flex-1"
                />
                <button type="button" onClick={() => void submitListDraft()} disabled={!listDraft.title.trim()} className="app-button-primary app-button-sm">
                  {listDraft.mode === 'create' ? 'Create' : 'Save'}
                </button>
                <button type="button" onClick={cancelListDraft} className="app-button-ghost app-button-sm">
                  Cancel
                </button>
              </div>
            )}

            {isCustomList(favoriteList) && !listDraft && (
              <div className="flex items-center gap-1">
                <span className="truncate text-xs text-muted">{labelForList(favoriteList, customLists)}</span>
                <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-line-soft" />
                <button type="button" onClick={() => startRenameList(favoriteList)} className="app-button-ghost app-button-sm">
                  <Pencil size={14} /> Rename
                </button>
                <button type="button" onClick={() => void handleDeleteList(favoriteList)} className="app-button-ghost app-button-sm hover:text-danger">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="app-empty">
              <div className="flex justify-center"><PalMark size={56} /></div>
              <h3 className="mt-3">Nothing on this list yet</h3>
              <p>Ten titles you would defend to the end. Start with one.</p>
              <button type="button" onClick={() => setShowMediaSelector(true)} className="app-button-primary mt-5">
                <Plus size={16} /> Add a title
              </button>
            </div>
          ) : topPicksView === 'shelf' ? (
            <ol
              className={
                isManagingFavorites
                  ? 'grid grid-cols-3 gap-x-3 gap-y-4 pt-3 sm:grid-cols-4 md:grid-cols-5'
                  : 'no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 pt-3'
              }
              aria-label={`${labelForList(favoriteList, customLists)} top ten`}
            >
              {favorites.map((fav, index) => {
                const entry = fav.media_entry
                const title = entry?.title ?? 'Untitled'
                const Icon = entry ? TYPE_ICONS[entry.media_type] ?? Film : Film
                return (
                  <li
                    key={fav.id}
                    data-fav-index={index}
                    draggable={isManagingFavorites}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (isManagingFavorites) handleDragOver(e, index)
                    }}
                    onDragEnd={handleDragEnd}
                    onTouchStart={() => isManagingFavorites && handleTouchStart(index)}
                    onTouchMove={(e) => isManagingFavorites && handleTouchMove(e)}
                    onTouchEnd={() => isManagingFavorites && handleTouchEnd()}
                    className={`relative ${isManagingFavorites ? 'min-w-0 cursor-grab touch-none active:cursor-grabbing' : 'w-[104px] shrink-0'} ${
                      draggedFavIndex === index ? 'opacity-40' : ''
                    }`}
                  >
                    {isManagingFavorites && (
                      <button
                        type="button"
                        aria-label={`Remove ${title} from list`}
                        onClick={() => handleRemoveFavorite(fav.id)}
                        className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg bg-surface-raised text-gray-50 shadow-md hover:text-danger"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!entry || isManagingFavorites}
                      onClick={() => entry && setSelectedEntry(entry)}
                      aria-label={`Number ${index + 1}: ${title}`}
                      className="group block w-full text-left disabled:cursor-inherit"
                    >
                      <div className="relative aspect-[2/3] rounded-xl border border-line bg-surface-strong">
                        {isManagingFavorites && (
                          <span aria-hidden="true" className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-bg/70 text-gray-50 backdrop-blur">
                            <GripVertical size={20} />
                          </span>
                        )}
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
            <ol className="space-y-2" aria-label={`${labelForList(favoriteList, customLists)} top ten`}>
              {favorites.map((fav, index) => {
                const entry = fav.media_entry
                const title = entry?.title ?? 'Untitled'
                const verdict = verdictFor(entry?.rating, Boolean(entry?.dumpstered))
                const hero = index === 0 && !isManagingFavorites
                const meta = [entry ? TYPE_NAMES[entry.media_type] ?? entry.media_type : null, entry?.year].filter(Boolean).join(' · ')
                const Icon = entry ? TYPE_ICONS[entry.media_type] ?? Film : Film
                return (
                  <li
                    key={fav.id}
                    data-fav-index={index}
                    draggable={isManagingFavorites}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (isManagingFavorites) handleDragOver(e, index)
                    }}
                    onDragEnd={handleDragEnd}
                    className={`app-panel flex items-center rounded-2xl transition-opacity ${
                      hero ? 'gap-4 p-4' : 'gap-3 p-2 pr-2'
                    } ${draggedFavIndex === index ? 'opacity-40' : ''}`}
                  >
                    {isManagingFavorites && (
                      <button
                        type="button"
                        aria-label={`Drag to reorder ${title}`}
                        className="app-icon-button -ml-1 cursor-grab touch-none text-muted active:cursor-grabbing"
                        onTouchStart={() => handleTouchStart(index)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <GripVertical size={20} />
                      </button>
                    )}
                    {!hero && (
                      <span
                        className={`shrink-0 text-center text-base font-bold tabular-nums text-muted ${isManagingFavorites ? 'w-5' : 'w-7'}`}
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={!entry || isManagingFavorites}
                      onClick={() => entry && setSelectedEntry(entry)}
                      aria-label={`Number ${index + 1}: ${title}`}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                    >
                      <div
                        className={`relative shrink-0 rounded-lg border border-line bg-surface-strong ${
                          hero ? 'h-[126px] w-[84px] rounded-xl' : isManagingFavorites ? 'h-12 w-8' : 'h-16 w-11'
                        }`}
                      >
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
                    {verdict && !isManagingFavorites && (
                      <span className="flex shrink-0 items-center gap-1 pr-1 text-sm font-semibold tabular-nums text-butter-gold" title={verdict.name}>
                        <VerdictMark verdict={verdict.id} size={hero ? 28 : 22} />
                        {entry?.dumpstered ? <span className="sr-only">{verdict.name}</span> : entry?.rating?.toFixed(1)}
                      </span>
                    )}
                    {isManagingFavorites && (
                      <button
                        type="button"
                        aria-label={`Remove ${title} from list`}
                        onClick={() => handleRemoveFavorite(fav.id)}
                        className="app-icon-button hover:text-danger"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </Reveal>

        {/* ── Your collection: what you have been up to, as posters ── */}
        <Reveal>
          <div ref={recentActivityRef}>
            <SectionHeader
              title="Your collection"
              count={activity.length}
              action={
                <Link to="/library" className="app-button-ghost app-button-sm shrink-0">
                  Library <ChevronRight size={16} />
                </Link>
              }
            />
            <PillTabs
              ariaLabel="Filter your collection"
              value={statusFilter}
              onChange={(id) => setStatusFilter(id as typeof statusFilter)}
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'completed', label: statusLabel('completed'), count: countOf('completed') },
                { id: 'in-progress', label: statusLabel('in-progress'), count: countOf('in-progress') },
                { id: 'planned', label: statusLabel('planned'), count: countOf('planned') },
              ]}
            />

            {shownEntries.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
                {shownEntries.map((entry) => {
                  const Icon = TYPE_ICONS[entry.media_type] ?? Film
                  const verdict = verdictFor(entry.rating, Boolean(entry.dumpstered))
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedEntry(entry)}
                      aria-label={`Edit ${entry.title}`}
                      className="group min-w-0 text-left"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-surface-strong">
                        {entry.cover_image_url ? (
                          <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted"><Icon size={22} strokeWidth={1.4} /></div>
                        )}
                        {verdict && (
                          <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md border border-line bg-bg/90 py-0.5 pl-0.5 pr-1.5 text-xs font-semibold tabular-nums text-butter-gold backdrop-blur" title={verdict.name}>
                            <VerdictMark verdict={verdict.id} size={18} />
                            {!entry.dumpstered && entry.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-gray-50 transition-colors group-hover:text-accent-soft">{entry.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {statusFilter === 'all' ? statusLabel(entry.status) : (entry.year ?? TYPE_NAMES[entry.media_type])}
                      </p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="app-empty mt-4">
                <div className="flex justify-center"><PalMark size={56} /></div>
                <h3 className="mt-3">{statusFilter === 'all' ? 'Nothing logged yet' : `Nothing ${statusLabel(statusFilter as 'completed').toLowerCase()} yet`}</h3>
                <p>Log what you watch, play and read, and it shows up here.</p>
                <button type="button" onClick={() => navigate('/add')} className="app-button-primary mt-5">Log a title</button>
              </div>
            )}
          </div>
        </Reveal>

        <button type="button" onClick={handleSignOut} className="app-button-secondary mt-12 w-full md:hidden">
          <LogOut size={16} /> Sign out
        </button>
      </main>

      {/* ── Edit profile: everything about you, in one place ── */}
      {isEditing && (
        <Sheet
          title="Edit profile"
          onClose={closeEditor}
          closeDisabled={savingProfile}
          footer={
            <div className="space-y-3">
              {saveError && <p role="alert" className="app-note app-note-danger">{saveError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={closeEditor} disabled={savingProfile} className="app-button-secondary">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="app-button-primary flex-1">
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Banner */}
            <div>
              <p className="app-label">Banner</p>
              <div className="relative h-24 overflow-hidden rounded-xl border border-line-soft bg-surface-strong">
                {bannerSrc ? (
                  <img src={bannerSrc} alt="" draggable={false} className="h-full w-full" style={bannerStyle} />
                ) : (
                  <AuroraBanner />
                )}
              </div>
              <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => bgFileInputRef.current?.click()} className="app-chip"><Camera size={16} /> Upload</button>
                <button type="button" onClick={handleBgUrl} className="app-chip"><Film size={16} /> URL</button>
                <button type="button" onClick={() => setShowGifPickerModal(true)} className="app-chip"><Sparkles size={16} /> GIFs</button>
                {(bannerSrc || imageToCrop) && (
                  <button type="button" onClick={handleRemoveBg} className="app-chip text-danger hover:text-danger"><X size={16} /> Remove</button>
                )}
              </div>
              {bannerSrc && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="profile-bg-opacity" className="text-sm font-semibold text-gray-50">Brightness</label>
                    <span className="text-xs tabular-nums text-muted">{profileBgOpacity}%</span>
                  </div>
                  <input
                    id="profile-bg-opacity"
                    type="range"
                    min={10}
                    max={100}
                    value={profileBgOpacity}
                    onChange={(e) => setProfileBgOpacity(Number(e.target.value))}
                    className="app-slider"
                    style={{ '--pct': `${((profileBgOpacity - 10) / 90) * 100}%` } as React.CSSProperties}
                  />
                </div>
              )}
            </div>

            {/* Avatar */}
            <div>
              <p className="app-label">Profile picture</p>
              <input ref={avatarFileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <div className="flex items-center gap-4">
                <div className="app-avatar h-16 w-16 text-2xl">{avatarImage}</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => avatarFileInputRef.current?.click()} className="app-chip"><Camera size={16} /> Upload</button>
                  <button type="button" onClick={handleAvatarUrl} className="app-chip"><Film size={16} /> URL</button>
                  <button type="button" onClick={() => setShowAvatarGifPicker(true)} className="app-chip"><Sparkles size={16} /> GIFs</button>
                  {(uploadedAvatar || avatarUrl) && (
                    <button type="button" onClick={handleRemoveAvatar} className="app-chip text-danger hover:text-danger"><X size={16} /> Remove</button>
                  )}
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="profile-username" className="app-label">Username</label>
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted">@</span>
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  maxLength={20}
                  autoComplete="username"
                  autoCapitalize="none"
                  enterKeyHint="next"
                  aria-invalid={usernameError ? true : undefined}
                  className="app-input pl-8"
                  placeholder="username"
                />
              </div>
              {usernameError && <p className="mt-1.5 text-xs text-danger">{usernameError}</p>}
            </div>

            <div>
              <label htmlFor="profile-name" className="app-label">Name</label>
              <input id="profile-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" enterKeyHint="next" className="app-input" placeholder="Full name" />
            </div>

            {/* Bio opens the roomy writing surface, like every note in the app */}
            <NoteField
              id="profile-bio"
              label="Bio"
              optional={false}
              title="Your bio"
              subtitle="Shown at the top of your profile"
              placeholder="A line or two about what you love."
              value={bio}
              onChange={setBio}
            />

            {/* Badges: the ones you earned, then the ones you choose to wear */}
            {(availableBadges.some((b) => !b.admin_only) || userBadges.some((ub) => ub.badges?.admin_only)) && (() => {
              const adminIds = new Set(availableBadges.filter((b) => b.admin_only).map((b) => b.id))
              const chosen = selectedBadgeIds.filter((id) => !adminIds.has(id))
              const earned = sortBadges(userBadges.filter((ub) => ub.badges?.admin_only))
              return (
                <div>
                  <p className="app-label flex items-center justify-between">
                    Badges
                    <small className="tabular-nums">{chosen.length}/5 chosen</small>
                  </p>
                  <ul className="space-y-2">
                    {earned.map((ub) => (
                      <li key={ub.id} className="flex items-center gap-3 rounded-2xl border border-butter-400/30 bg-butter-400/5 p-2 pr-3">
                        <BadgeMedal badge={ub.badges!} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-50">{ub.badges!.name}</span>
                          <span className="block text-xs text-muted">Earned. Always on your profile.</span>
                        </span>
                        <Lock size={16} className="shrink-0 text-butter-300" aria-hidden="true" />
                      </li>
                    ))}
                    {availableBadges.filter((badge) => !badge.admin_only).map((badge) => {
                      const isSelected = selectedBadgeIds.includes(badge.id)
                      const full = !isSelected && chosen.length >= 5
                      return (
                        <li key={badge.id}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            disabled={full}
                            onClick={() => {
                              if (isSelected) setSelectedBadgeIds(selectedBadgeIds.filter((id) => id !== badge.id))
                              else if (!full) setSelectedBadgeIds([...selectedBadgeIds, badge.id])
                            }}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                              isSelected ? 'border-accent/60 bg-accent/10' : 'border-line-soft bg-surface-sunken hover:border-line-strong'
                            }`}
                          >
                            <BadgeMedal badge={badge} size={40} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-gray-50">{badge.name}</span>
                              {badge.description && (
                                <span className="line-clamp-2 block text-xs leading-snug text-muted">{badge.description}</span>
                              )}
                            </span>
                            {isSelected ? (
                              <Check size={18} className="shrink-0 text-accent-bright" aria-hidden="true" />
                            ) : (
                              <Plus size={18} className="shrink-0 text-muted" aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })()}

            {/* Season */}
            <div>
              <p className="app-label">Season</p>
              <ThemePicker heading={null} />
            </div>
          </div>
        </Sheet>
      )}

      {/* ── Followers / following ── */}
      {peopleSheet && (
        <PeopleListSheet
          title={peopleSheet === 'followers' ? 'Followers' : 'Following'}
          people={peopleSheet === 'followers' ? followersList : followingList}
          loading={peopleListLoading}
          currentUserId={user.id}
          onClose={() => setPeopleSheet(null)}
          onOpenProfile={(handle) => {
            setPeopleSheet(null)
            navigate(`/profile/${handle}`)
          }}
          onToggleFollow={toggleFollow}
        />
      )}

      {showGifPickerModal && <GifPicker onSelect={handleGifPickerSelect} onClose={() => setShowGifPickerModal(false)} />}
      {showAvatarGifPicker && <GifPicker onSelect={handleAvatarGifPickerSelect} onClose={() => setShowAvatarGifPicker(false)} />}

      {/* ── Edit an entry ── */}
      {selectedEntry && (
        <Sheet
          header={
            <div className="flex items-center gap-4 pt-1">
              {selectedEntry.cover_image_url ? (
                <img src={selectedEntry.cover_image_url} alt="" className="h-[100px] w-[68px] shrink-0 rounded-xl border border-line-soft bg-surface-strong object-cover" />
              ) : (
                <div className="flex h-[100px] w-[68px] shrink-0 items-center justify-center rounded-xl border border-line-soft bg-surface-strong text-muted"><Film size={26} strokeWidth={1.4} /></div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold leading-tight tracking-tight text-gray-50">{selectedEntry.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {[TYPE_NAMES[selectedEntry.media_type] ?? selectedEntry.media_type, selectedEntry.year].filter(Boolean).join(' · ')}
                </p>
                {selectedEntry.completed_date && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Calendar size={12} /> Finished {new Date(selectedEntry.completed_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          }
          ariaLabel={`Edit ${selectedEntry.title}`}
          onClose={() => setSelectedEntry(null)}
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={handleDeleteEntry} aria-label="Delete entry" className="app-icon-button h-12 w-12 rounded-xl border border-line-soft hover:text-danger">
                <Trash2 size={20} />
              </button>
              <button type="button" onClick={handleUpdateEntry} className="app-button-primary flex-1">
                <Check size={18} /> Save changes
              </button>
            </div>
          }
        >
          <div className="space-y-5 pt-1">
            <div>
              <p className="app-label">On your shelf</p>
              <div className="grid grid-cols-2 gap-2">
                {ENTRY_STATUSES.map((value) => (
                  <button key={value} type="button" aria-pressed={editStatus === value} onClick={() => setEditStatus(value)} className="app-option">
                    {statusLabel(value)}
                  </button>
                ))}
              </div>
            </div>
            <RatingField rating={editRating} onChange={setEditRating} />
            <NoteField
              id="entry-notes"
              label="Notes"
              title={selectedEntry.title}
              subtitle={[TYPE_NAMES[selectedEntry.media_type] ?? selectedEntry.media_type, selectedEntry.year].filter(Boolean).join(' · ')}
              placeholder="What did you think?"
              value={editNotes}
              onChange={setEditNotes}
            />
          </div>
        </Sheet>
      )}

      {/* ── Add to a top ten ── */}
      {showMediaSelector && (
        <Sheet
          title={`Add to ${labelForList(favoriteList, customLists)}`}
          onClose={() => { setShowMediaSelector(false); setMediaSearchQuery(''); setMediaFilterYear('any') }}
        >
          <div className="space-y-3">
            <div className="app-search">
              <Search size={18} />
              <input
                type="search"
                value={mediaSearchQuery}
                onChange={(e) => setMediaSearchQuery(e.target.value)}
                placeholder="Search your library"
                aria-label="Search your library"
                enterKeyHint="search"
                className="app-input"
                autoFocus
              />
            </div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {[{ id: 'all', label: 'All' }, { id: 'movie', label: 'Movies', icon: Film }, { id: 'show', label: 'Shows', icon: Tv }, { id: 'game', label: 'Games', icon: Gamepad2 }, { id: 'book', label: 'Books', icon: Book }].map((type) => {
                const Icon = type.icon
                return (
                  <button key={type.id} type="button" aria-pressed={mediaFilterType === type.id} onClick={() => setMediaFilterType(type.id as typeof mediaFilterType)} className="app-chip">
                    {Icon && <Icon size={16} />}
                    {type.label}
                  </button>
                )
              })}
            </div>
            <label className="flex items-center gap-2">
              <Calendar size={16} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="sr-only">Filter your library by year</span>
              <span className="app-select flex-1">
                <select value={mediaFilterYear} onChange={(e) => setMediaFilterYear(e.target.value)} className="app-input">
                  <option value="any">Any year</option>
                  <optgroup label="Added in">
                    {mediaYears.added.map((year: number) => (
                      <option key={`added-${year}`} value={`added-${year}`}>Added {year}</option>
                    ))}
                  </optgroup>
                  {mediaYears.released.length > 0 && (
                    <optgroup label="Released in">
                      {mediaYears.released.map((year: number) => (
                        <option key={`released-${year}`} value={`released-${year}`}>From {year}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </span>
            </label>
          </div>
          <div className="mt-4 space-y-1">
            {entries.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                <p>Your library is empty.</p>
                <button type="button" onClick={() => { setShowMediaSelector(false); setMediaFilterYear('any'); navigate('/add') }} className="app-button-ghost mt-2">Add your first entry</button>
              </div>
            ) : (() => {
              const { addedYear, releaseYear } = parseYearFilter(mediaFilterYear)
              const filteredEntries = collectUniqueMedia(entries).filter((entry) => {
                // A type list only holds that type. A year list takes
                // anything: a best-of-the-year is about what you watched,
                // not about what the thing is.
                const typeLists = ['movie', 'show', 'game', 'book']
                if (typeLists.includes(favoriteList) && entry.media_type !== favoriteList) return false
                const matchesType = mediaFilterType === 'all' || entry.media_type === mediaFilterType
                const matchesSearch = entry.title.toLowerCase().includes(mediaSearchQuery.toLowerCase())
                const matchesYear =
                  (!addedYear || addedYearOf(entry) === addedYear) &&
                  (!releaseYear || entry.year === releaseYear)
                const notInFavorites = !favorites.some((f) => f.media_entry_id === entry.id)
                return matchesType && matchesSearch && matchesYear && notInFavorites
              })
              if (filteredEntries.length === 0) return <p className="py-8 text-center text-sm text-muted">No matches found.</p>
              return filteredEntries.map((entry) => {
                const Icon = TYPE_ICONS[entry.media_type] ?? Film
                return (
                  <button key={entry.id} type="button" onClick={() => handleAddFavorite(entry.id)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-surface-strong">
                    <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-surface-strong">
                      {entry.cover_image_url ? <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-muted"><Icon size={16} /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-50">{entry.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted"><span>{TYPE_NAMES[entry.media_type] ?? entry.media_type}</span>{entry.year && <span>· {entry.year}</span>}</div>
                    </div>
                    <Plus size={18} className="flex-shrink-0 text-accent-soft" aria-hidden="true" />
                  </button>
                )
              })
            })()}
          </div>
        </Sheet>
      )}

      {showAvatarCropper && avatarToCrop && (
        <AvatarCropper imageSrc={avatarToCrop} onCropComplete={handleAvatarCropComplete} onCancel={handleAvatarCropCancel} />
      )}

      {showImageCropper && imageToCrop && cropperUserPreview && (
        <ImageCropper
          imageSrc={imageToCrop}
          userPreview={cropperUserPreview}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          desktopAspectRatio={3.2}
          mobileAspectRatio={isDesktop ? 0.75 : (mobileHeaderAspectRatio || 0.75)}
          backgroundOpacity={profileBgOpacity}
        />
      )}
    </div>
  )
}

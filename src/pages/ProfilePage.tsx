import { Film, Tv, Gamepad2, Book, Calendar, Edit2, X, Trash2, Camera, LogOut, Sparkles, Crown, Beaker, Search, Settings2, Check, GripVertical, Plus } from 'lucide-react'
import DecimalRating from '../components/DecimalRating'
import GifPicker from '../components/GifPicker'
import ProfileSkeleton from '../components/ProfileSkeleton'
import ImageCropper from '../components/ImageCropper'
import AvatarCropper from '../components/AvatarCropper'
import { useProfilePage } from '../hooks/useProfilePage'

export default function ProfilePage() {
  const {
    user,
    profile,
    entries,
    favorites,
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
    showBgGifPicker,
    setShowBgGifPicker,
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
    selectedFavoriteId,
    setSelectedFavoriteId,
    showMediaSelector,
    setShowMediaSelector,
    mediaSearchQuery,
    setMediaSearchQuery,
    mediaFilterType,
    setMediaFilterType,
    isManagingFavorites,
    setIsManagingFavorites,
    showAddButton,
    recentActivityRef,
    profileBgRef,
    isDesktop,
    carouselRef,
    progressBarRef,
    progressContainerRef,
    creatorBadge,
    alphaBadge,
    regularBadges,
    cropperUserPreview,
    colorEffects,
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
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    navigate,
  } = useProfilePage()

  const getIcon = (type: string) => {
    switch (type) {
      case 'movie': return Film
      case 'show': return Tv
      case 'game': return Gamepad2
      case 'book': return Book
      default: return Film
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (initialLoading) {
    return <ProfileSkeleton />
  }

  if (!user || !profile) return null

  return (

    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Profile Header — banner + avatar overlap */}
        <div className="mb-6">
          {/* Banner */}
          <div
            ref={profileHeaderRef}
            className="relative h-36 sm:h-48 rounded-2xl overflow-hidden"
          >
            {(pendingBgImage || originalBgImageUrl || uploadedBgImage || profileBgUrl) ? (
              <div ref={profileBgRef} className="absolute inset-0 z-0">
                {(() => {
                  const activeCropData = (pendingBgImage || originalBgImageUrl)
                    ? (isDesktop ? desktopCropData : mobileCropData)
                    : null
                  return (
                    <img
                      src={pendingBgImage || originalBgImageUrl || uploadedBgImage || profileBgUrl || ''}
                      alt=""
                      draggable={false}
                      className="w-full h-full"
                      style={{
                        objectFit: 'cover',
                        objectPosition: activeCropData ? `${activeCropData.x}% ${activeCropData.y}%` : 'center',
                        transform: activeCropData ? `scale(${Math.max(1, activeCropData.scale / 100)})` : 'none',
                        transformOrigin: activeCropData ? `${activeCropData.x}% ${activeCropData.y}%` : 'center',
                        opacity: (profileBgOpacity ?? 80) / 100,
                      }}
                    />
                  )
                })()}
              </div>
            ) : (
              <div
                className="absolute inset-0 z-0"
                style={{ background: 'linear-gradient(to bottom right, #1e293b, #111827)' }}
              />
            )}
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900/60 to-transparent z-10 pointer-events-none" />
            {/* Edit bg button */}
            {!isEditing && !showBgGifPicker && (
              <button
                onClick={() => setShowBgGifPicker(true)}
                className="absolute top-3 right-3 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white/70 hover:text-white transition-all"
                title="Edit Profile Background"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Avatar + action buttons */}
          <div className="px-1 sm:px-2 -mt-10 sm:-mt-14 relative z-20">
            <div className="flex items-end justify-between">
              {/* Avatar with permanent camera badge */}
              <div className="relative">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-gray-900 overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-lg shadow-black/40">
                  {(uploadedAvatar || avatarUrl || profile.avatar_url) ? (
                    pendingAvatarGifCrop ? (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${uploadedAvatar || avatarUrl || profile.avatar_url})`,
                          backgroundSize: `${pendingAvatarGifCrop.scale}%`,
                          backgroundPosition: `${pendingAvatarGifCrop.x}% ${pendingAvatarGifCrop.y}%`,
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    ) : (
                      <img
                        src={uploadedAvatar || avatarUrl || profile.avatar_url || ''}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = profile.username.charAt(0).toUpperCase()
                        }}
                      />
                    )
                  ) : (
                    profile.username.charAt(0).toUpperCase()
                  )}
                </div>
                {/* Camera badge — always visible */}
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 p-1.5 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded-full shadow-md transition-all"
                  title="Edit profile"
                >
                  <Camera className="w-3 h-3 text-gray-300" />
                </button>
              </div>

              {/* Action buttons */}
              {!showBgGifPicker && (
                <div className="flex items-center gap-2 pb-1">
                  {profile.is_admin && (
                    <button
                      onClick={() => navigate('/admin/badges')}
                      className="p-2 hover:bg-purple-600/20 rounded-full transition-colors text-purple-400 hover:text-purple-300 border border-purple-500/30"
                      title="Admin Badge Panel"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 rounded-full transition-all text-gray-300 hover:text-white"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Name, bio, badges — always visible */}
            {!showBgGifPicker && (
              <div className="mt-3 bg-gray-900/50 border border-gray-800/60 rounded-2xl px-4 py-4">
                <h2 className="text-2xl font-bold">@{profile.username}</h2>
                {profile.full_name && <p className="text-gray-400 mt-0.5 text-base">{profile.full_name}</p>}
                <p className="text-gray-300 mt-2 text-sm leading-relaxed">
                  {profile.bio ? profile.bio : <span className="text-gray-500 italic">No bio yet.</span>}
                </p>

                {/* Badges */}
                {userBadges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {creatorBadge && (
                      <div className="relative overflow-hidden rounded-full shadow-[0_0_20px_rgba(236,72,153,0.6)] ring-2 ring-pink-500/40">
                        {creatorBadge.badges?.gif_url ? (
                          <div className="absolute inset-0" style={{ opacity: (creatorBadge.badges.opacity || 80) / 100 }}>
                            <img loading="lazy" decoding="async" src={creatorBadge.badges.gif_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500" />
                        )}
                        <div className="relative px-3 py-1 flex items-center gap-1.5">
                          <Crown className="w-3 h-3 text-yellow-300" />
                          <span className="text-xs font-black text-white uppercase tracking-wider drop-shadow-md">CREATOR</span>
                        </div>
                      </div>
                    )}
                    {alphaBadge && (
                      <div className="relative overflow-hidden rounded-full shadow-[0_0_20px_rgba(34,211,238,0.6)] ring-2 ring-cyan-500/40">
                        {alphaBadge.badges?.gif_url ? (
                          <div className="absolute inset-0" style={{ opacity: (alphaBadge.badges.opacity || 80) / 100 }}>
                            <img loading="lazy" decoding="async" src={alphaBadge.badges.gif_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-500" />
                        )}
                        <div className="relative px-3 py-1 flex items-center gap-1.5">
                          <Beaker className="w-3 h-3 text-cyan-300" />
                          <span className="text-xs font-black text-white uppercase tracking-wider drop-shadow-md">ALPHA TESTER</span>
                        </div>
                      </div>
                    )}
                    {regularBadges.map((userBadge) => {
                      const badge = userBadge.badges!
                      const effects = colorEffects[badge.color] || { gradient: 'from-gray-600 via-gray-500 to-gray-400', glow: 'shadow-gray-500/50' }
                      return (
                        <div key={userBadge.id} className={`relative overflow-hidden rounded-full shadow-sm ${effects.glow} hover:scale-105 transition-transform`}>
                          {badge.gif_url ? (
                            <div className="absolute inset-0" style={{ opacity: (badge.opacity || 80) / 100 }}>
                              <img loading="lazy" decoding="async" src={badge.gif_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${effects.gradient}`} style={{ opacity: (badge.opacity || 80) / 100 }} />
                          )}
                          <div className="relative px-3 py-1 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-xs font-bold text-white tracking-wide uppercase drop-shadow-lg">{badge.name}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Background editor (inline, triggered by bg camera button) */}
            {showBgGifPicker && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-gray-900/80 rounded-2xl border border-pink-500/30">
                  <h4 className="font-semibold text-pink-400 mb-3 text-sm">Edit Background</h4>
                  <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button type="button" onClick={() => bgFileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-xs transition-colors">
                      <Camera className="w-3.5 h-3.5" /> Upload
                    </button>
                    <button type="button" onClick={handleBgUrl} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-xs transition-colors">
                      <Film className="w-3.5 h-3.5" /> URL
                    </button>
                    <button type="button" onClick={() => setShowGifPickerModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/50 rounded-full text-xs transition-colors">
                      <Sparkles className="w-3.5 h-3.5" /> GIFs
                    </button>
                    {(pendingBgImage || uploadedBgImage || profileBgUrl || originalBgImageUrl || imageToCrop) && (
                      <button type="button" onClick={handleRemoveBg} className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-full text-xs transition-colors">
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-400">Opacity</label>
                      <span className="text-xs text-gray-500">{profileBgOpacity}%</span>
                    </div>
                    <input type="range" min={10} max={100} value={profileBgOpacity} onChange={e => setProfileBgOpacity(Number(e.target.value))} className="w-full" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBgGifPicker(false); handleSaveProfile() }} disabled={savingProfile} className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold px-4 py-2 rounded-full text-sm hover:from-pink-600 hover:to-red-600 transition-all disabled:opacity-50">
                      {savingProfile ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setShowBgGifPicker(false); setProfileBgOpacity(profile?.bg_opacity ?? 80); if (bgFileInputRef.current) bgFileInputRef.current.value = '' }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-full text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── EDIT PROFILE MODAL ───────────────────── */}
        {isEditing && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
                <h3 className="font-bold text-white">Edit Profile</h3>
                <button
                  onClick={() => { setIsEditing(false); setUploadedAvatar(null); if (avatarFileInputRef.current) avatarFileInputRef.current.value = '' }}
                  className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-5 space-y-6">

                  {/* Avatar */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Profile Picture</p>
                    <input ref={avatarFileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-xl font-bold flex-shrink-0">
                        {(uploadedAvatar || avatarUrl || profile.avatar_url) ? (
                          pendingAvatarGifCrop ? (
                            <div
                              className="w-full h-full"
                              style={{
                                backgroundImage: `url(${uploadedAvatar || avatarUrl || profile.avatar_url})`,
                                backgroundSize: `${pendingAvatarGifCrop.scale}%`,
                                backgroundPosition: `${pendingAvatarGifCrop.x}% ${pendingAvatarGifCrop.y}%`,
                                backgroundRepeat: 'no-repeat',
                              }}
                            />
                          ) : (
                            <img loading="lazy" decoding="async" src={uploadedAvatar || avatarUrl || profile.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          profile.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => avatarFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-xs transition-colors">
                          <Camera className="w-3.5 h-3.5" /> Upload
                        </button>
                        <button type="button" onClick={handleAvatarUrl} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-xs transition-colors">
                          <Film className="w-3.5 h-3.5" /> URL
                        </button>
                        <button type="button" onClick={() => setShowAvatarGifPicker(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-full text-xs transition-colors">
                          <Sparkles className="w-3.5 h-3.5" /> GIFs
                        </button>
                        {(uploadedAvatar || avatarUrl) && (
                          <button type="button" onClick={handleRemoveAvatar} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-full text-xs transition-colors">
                            <X className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Username</p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        maxLength={20}
                        className={`w-full pl-8 pr-4 py-2.5 bg-gray-800/60 border rounded-xl text-white placeholder-gray-500 focus:outline-none text-sm ${usernameError ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-gray-500'}`}
                        placeholder="username"
                      />
                    </div>
                    {usernameError && <p className="text-red-400 text-xs mt-1.5">{usernameError}</p>}
                  </div>

                  {/* Name & Bio */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Info</p>
                    <div className="space-y-3">
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 text-sm" placeholder="Full name" />
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 text-sm resize-none" placeholder="Bio" />
                    </div>
                  </div>

                  {/* Badges */}
                  {availableBadges.filter(b => !b.admin_only).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Badges</p>
                        <span className="text-xs text-gray-600">{selectedBadgeIds.length}/5</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableBadges.filter(badge => !badge.admin_only).map((badge) => {
                          const isSelected = selectedBadgeIds.includes(badge.id)
                          return (
                            <button key={badge.id} type="button" onClick={() => { if (isSelected) { setSelectedBadgeIds(selectedBadgeIds.filter(id => id !== badge.id)) } else if (selectedBadgeIds.length < 5) { setSelectedBadgeIds([...selectedBadgeIds, badge.id]) } }} className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected ? 'ring-2 ring-white/60 scale-105' : 'opacity-60 hover:opacity-100'}`} disabled={!isSelected && selectedBadgeIds.length >= 5}>
                              <div className={`absolute inset-0 rounded-full bg-${badge.color}`} />
                              <span className="relative z-10 text-white">{badge.name}</span>
                            </button>
                          )
                        })}
                      </div>
                      {userBadges.some(ub => ub.badges?.admin_only) && (
                        <p className="text-xs text-purple-400 mt-2 flex items-center gap-1.5"><span>✨</span> You have admin-only badges</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-gray-800 space-y-3">
                {saveError && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                    {saveError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(false); setUploadedAvatar(null); if (avatarFileInputRef.current) avatarFileInputRef.current.value = '' }} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold py-2.5 rounded-full text-sm hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50">
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- FAVORITES SHELF --- */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Top Picks</p>

            <div className="flex items-center gap-2">
              {isManagingFavorites && favorites.length < 10 && (
                <button
                  onClick={() => setShowMediaSelector(true)}
                  className="text-xs bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white border border-pink-500/50 px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors animate-in fade-in shadow"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
              <button
                onClick={() => {
                  setIsManagingFavorites(!isManagingFavorites)
                  setSelectedFavoriteId(null)
                }}
                className={`
                  text-xs px-3 py-1.5 rounded-full flex items-center gap-2 transition-all border
                  ${isManagingFavorites
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white border-blue-500/50 shadow'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700'}
                `}
              >
                {isManagingFavorites ? (
                  <>
                    Done <Check className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <Settings2 className="w-3 h-3" /> Manage
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Favorites Grid / Carousel Container */}
          <div className={`
            bg-gray-900/40 border-y border-gray-800/50 rounded-3xl sm:rounded-2xl sm:border transition-colors duration-300
            ${isManagingFavorites ? 'bg-gray-900/60 border-red-500/20 p-4' : 'p-4 sm:p-8'}
          `}>
            <div
              className={
                isManagingFavorites
                  ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 w-full justify-items-center"
                  : "flex gap-6 px-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-full w-full min-w-0"
              }
              ref={carouselRef}
              style={{ overflowX: isManagingFavorites ? 'visible' : 'auto' }}
            >
              {favorites.length === 0 ? (
                <div className="flex-1 flex items-center col-span-full justify-center py-8">
                  <div className="text-gray-500 text-center">
                    <p className="mb-2 italic">No favorites yet.</p>
                    <button
                      onClick={() => {
                        setIsManagingFavorites(true)
                        setShowMediaSelector(true)
                      }}
                      className="text-red-400 hover:text-red-300 text-sm font-medium underline underline-offset-4"
                    >
                      Start your collection
                    </button>
                  </div>
                </div>
              ) : (
                favorites.map((fav, index) => {
                const isSelected = selectedFavoriteId === fav.id

                const draggableProps = {
                  draggable: isManagingFavorites && isSelected,
                  onDragStart: (e: React.DragEvent) => {
                    if (isManagingFavorites && isSelected) {
                      handleDragStart(index)
                    } else {
                      e.preventDefault()
                    }
                  },
                  onDragEnd: handleDragEnd,
                }

                return (
                  <div
                    key={fav.id}
                    data-fav-index={index}
                    className={`
                      relative group flex-shrink-0 w-24 sm:w-28 transition-all duration-200 select-none
                      ${isManagingFavorites && isSelected ? 'cursor-grab active:cursor-grabbing hover:scale-105 hover:z-10' : isManagingFavorites ? 'cursor-pointer' : 'cursor-default'}
                      ${isSelected ? 'scale-105 z-10' : ''}
                      ${draggedFavIndex === index ? 'opacity-20 scale-90' : 'opacity-100'}
                    `}
                    style={{
                      touchAction: isManagingFavorites && isSelected ? 'none' : 'auto',
                      WebkitUserSelect: 'none',
                      userSelect: 'none'
                    }}

                    onDragOver={(e: React.DragEvent) => {
                      e.preventDefault();
                      if (isManagingFavorites && draggedFavIndex !== null) {
                        handleDragOver(e, index)
                      }
                    }}

                    // Touch Handlers
                    onTouchStart={() => isSelected && handleTouchStart(index)}
                    onTouchMove={(e) => isSelected && handleTouchMove(e)}
                    onTouchEnd={() => isSelected && handleTouchEnd()}

                    {...draggableProps}
                    onClick={() => {
                      if (isManagingFavorites) {
                        setSelectedFavoriteId(fav.id === selectedFavoriteId ? null : fav.id)
                      }
                    }}
                  >
                    <div className={`
                      aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden shadow-lg border relative transition-all
                      ${isSelected ? 'border-red-500 ring-2 ring-red-500/50' : 'border-gray-700/50'}
                    `}>
                      {/* Draggable Indicator */}
                      {isManagingFavorites && isSelected && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur-md rounded-lg p-2 pointer-events-none">
                          <GripVertical className="w-6 h-6 text-white/90" />
                        </div>
                      )}
                      {fav.media_entry?.cover_image_url ? (
                        <img loading="lazy" decoding="async"
                          src={fav.media_entry.cover_image_url}
                          alt={fav.media_entry.title}
                          className="w-full h-full object-cover pointer-events-none"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}

                      {/* Rank Badge */}
                      <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white/20 shadow-sm z-20">
                        {index + 1}
                      </div>

                      {/* Remove Button */}
                      {isManagingFavorites && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFavorite(fav.id)
                            setSelectedFavoriteId(null)
                          }}
                          className={`
                            absolute -top-2 -right-2 z-30
                            bg-red-500 text-white p-1.5 rounded-full shadow-lg shadow-black/50
                            transform transition-all duration-200 border-2 border-gray-900
                            ${isSelected
                              ? 'scale-100 opacity-100 pointer-events-auto'
                              : 'scale-100 opacity-100 pointer-events-auto'
                            }
                          `}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-center mt-2 truncate text-gray-400 group-hover:text-white transition-colors px-1 select-none">
                      {fav.media_entry?.title}
                    </p>
                  </div>
                )
              })
              )}

              {/* Add Button */}
              {isManagingFavorites && favorites.length < 10 && (
                <button
                  onClick={() => setShowMediaSelector(true)}
                  className="flex-shrink-0 w-24 sm:w-28 aspect-[2/3] bg-gray-800/30 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all group"
                >
                   <div className="bg-gray-800 group-hover:bg-gray-700 p-3 rounded-full transition-colors">
                     <Plus className="w-5 h-5" />
                   </div>
                   <span className="text-xs font-medium">Add New</span>
                </button>
              )}
            </div>

            {/* Pink gradient scroll slider for carousel */}
            {!isManagingFavorites && (
              <div
                ref={progressContainerRef}
                className="relative mt-4 h-1.5 w-full px-2 transition-opacity duration-300 opacity-0"
              >
                {/* Track */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gray-800/60 w-full" />

                {/* Active Indicator (Direct DOM controlled) */}
                <div
                  ref={progressBarRef}
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-pink-400 shadow-sm shadow-pink-900/20"
                  style={{ width: '0%', left: '0%' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4" ref={recentActivityRef}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Your Collection</p>

          {/* Quick nav */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/library')} className="bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600 rounded-2xl p-4 transition-all flex items-center justify-between group active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Book className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-gray-300 group-hover:text-white font-medium transition-colors text-sm">Library</span>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-lg">→</span>
            </button>
            <button onClick={() => navigate('/activity')} className="bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600 rounded-2xl p-4 transition-all flex items-center justify-between group active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-gray-300 group-hover:text-white font-medium transition-colors text-sm">Timeline</span>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-lg">→</span>
            </button>
          </div>

          {/* Status filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'all' ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>All</button>
            <button onClick={() => setStatusFilter('completed')} className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>Completed</button>
            <button onClick={() => setStatusFilter('in-progress')} className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'in-progress' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>In Progress</button>
            <button onClick={() => setStatusFilter('planned')} className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'planned' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>Planned</button>
          </div>

          {entries.filter(e => e.status !== 'logged' && (statusFilter === 'all' || e.status === statusFilter)).length > 0 ? (
            <div className="space-y-2">
              {entries.filter(e => e.status !== 'logged' && (statusFilter === 'all' || e.status === statusFilter)).map((entry) => {
                const Icon = getIcon(entry.media_type)
                return (
                  <div key={entry.id} onClick={() => setSelectedEntry(entry)}
                    className="flex gap-3 p-3 bg-gray-800/30 hover:bg-gray-800/60 rounded-2xl border border-gray-700/30 hover:border-gray-600/50 transition-all cursor-pointer group active:scale-[0.99]">
                    <div className="w-10 h-14 bg-gray-900 rounded-xl flex-shrink-0 overflow-hidden relative">
                      {entry.cover_image_url
                        ? <img loading="lazy" decoding="async" src={entry.cover_image_url} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-600"><Icon className="w-4 h-4" /></div>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                        <Edit2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-white truncate group-hover:text-red-400 transition-colors">{entry.title}</h4>
                        <span className={`flex-shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${entry.status === 'completed' ? 'bg-green-500/10 text-green-400' : entry.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {entry.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="capitalize">{entry.media_type}</span>
                        {entry.year && <span>· {entry.year}</span>}
                        {entry.completed_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.completed_date)}</span>}
                      </div>
                      {entry.rating && (
                        <div className="mt-1.5">
                          <span className="text-xs font-bold text-yellow-400 tabular-nums">{entry.rating}</span>
                          <span className="text-xs text-gray-600"> / 10</span>
                        </div>
                      )}
                      {entry.notes && <p className="text-gray-500 text-xs mt-1 line-clamp-1 italic">"{entry.notes}"</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600"><Film className="w-7 h-7" /></div>
              <h3 className="text-base font-semibold text-white mb-1">No entries yet</h3>
              <p className="text-gray-500 text-sm mb-5">Start building your collection.</p>
              <button onClick={() => navigate('/add')} className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 py-2.5 rounded-full hover:from-red-600 hover:to-pink-600 transition-all shadow-lg shadow-red-500/20">Add Your First Entry</button>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mt-8 pb-24 md:hidden">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-red-500/10 border border-gray-700 text-gray-400 rounded-full transition-all"><LogOut className="w-5 h-5" /> <span className="font-medium">Sign Out</span></button>
        </div>
      </main>

      {/* Floating Action Button (Add Entry) */}
      <button
        onClick={() => navigate('/add')}
        className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-8 z-[60] bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white p-3 rounded-full shadow-lg shadow-red-900/40 hover:shadow-red-900/60 hover:scale-110 active:scale-95 transition-all duration-300 group ${
          showAddButton
            ? 'translate-y-0 opacity-100'
            : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
        aria-label="Add New Entry"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Modals and GIF Pickers */}
      {showGifPickerModal && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowGifPickerModal(false)}><div className="w-full max-w-lg" onClick={e => e.stopPropagation()}><GifPicker onSelect={handleGifPickerSelect} onClose={() => setShowGifPickerModal(false)} /></div></div>}
      {showAvatarGifPicker && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowAvatarGifPicker(false)}><div className="w-full max-w-lg" onClick={e => e.stopPropagation()}><GifPicker onSelect={handleAvatarGifPickerSelect} onClose={() => setShowAvatarGifPicker(false)} /></div></div>}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl p-5 relative shadow-2xl">
             <button onClick={() => setSelectedEntry(null)} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"><X className="w-4 h-4" /></button>
             <h2 className="text-lg font-bold mb-0.5 pr-8 leading-tight">{selectedEntry.title}</h2>
             <p className="text-gray-400 text-xs mb-4 capitalize">{selectedEntry.media_type}</p>
             <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Status</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[{ value: 'completed', label: 'Completed' }, { value: 'in-progress', label: 'In Progress' }, { value: 'planned', label: 'Plan to Watch' }, { value: 'logged', label: 'Library' }].map((s) => (
                      <button key={s.value} onClick={() => setEditStatus(s.value as any)} className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${editStatus === s.value ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Rating {editRating > 0 && <span className="normal-case font-normal text-gray-500">· {editRating} / 10</span>}</label>
                  <DecimalRating value={editRating} onChange={setEditRating} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Notes</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 text-white" placeholder="What did you think?" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleDeleteEntry} className="px-3 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={handleUpdateEntry} className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold py-2.5 rounded-xl text-sm">Save Changes</button>
                </div>
             </div>
           </div>
        </div>
      )}
      {showMediaSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl p-4 relative shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Select Favorite</h3>
              <button onClick={() => { setShowMediaSelector(false); setMediaSearchQuery(''); }} className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={mediaSearchQuery} onChange={(e) => setMediaSearchQuery(e.target.value)} placeholder="Search your library..." className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" autoFocus />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[{ id: 'all', label: 'All' }, { id: 'movie', label: 'Movies', icon: Film }, { id: 'show', label: 'TV', icon: Tv }, { id: 'game', label: 'Games', icon: Gamepad2 }, { id: 'book', label: 'Books', icon: Book }].map((type) => { const Icon = type.icon; return ( <button key={type.id} onClick={() => setMediaFilterType(type.id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${mediaFilterType === type.id ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>{Icon && <Icon className="w-3.5 h-3.5" />}{type.label}</button> )})}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
              {entries.length === 0 ? (
                <div className="text-center py-8 text-gray-500"><p>Your library is empty.</p><button onClick={() => { setShowMediaSelector(false); navigate('/add') }} className="mt-2 text-red-400 hover:text-red-300 text-sm font-medium">Add your first entry</button></div>
              ) : (() => {
                const seen = new Set<string>()
                const filteredEntries = entries.filter(entry => {
                  const matchesType = mediaFilterType === 'all' || entry.media_type === mediaFilterType
                  const matchesSearch = entry.title.toLowerCase().includes(mediaSearchQuery.toLowerCase())
                  const notInFavorites = !favorites.some(f => f.media_entry_id === entry.id)
                  const key = `${entry.media_type}:${entry.title.trim().toLowerCase()}`
                  if (seen.has(key)) return false
                  seen.add(key)
                  return matchesType && matchesSearch && notInFavorites
                })
                if (filteredEntries.length === 0) return <div className="text-center py-8 text-gray-500"><p>No matches found.</p></div>
                return filteredEntries.map(entry => {
                  const Icon = getIcon(entry.media_type)
                  return (
                    <button key={entry.id} onClick={() => handleAddFavorite(entry.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800 transition-colors text-left group border border-transparent hover:border-gray-700">
                      <div className="w-10 h-14 bg-gray-800 rounded flex-shrink-0 overflow-hidden relative">
                        {entry.cover_image_url ? <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon className="w-4 h-4 text-gray-600" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">{entry.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5"><span className="capitalize">{entry.media_type}</span>{entry.year && <span>• {entry.year}</span>}</div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center group-hover:border-green-500 transition-colors"><Plus className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                    </button>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Cropper Modal */}
      {showAvatarCropper && avatarToCrop && (
        <AvatarCropper
          imageSrc={avatarToCrop}
          onCropComplete={handleAvatarCropComplete}
          onCancel={handleAvatarCropCancel}
        />
      )}

      {/* Image Cropper Modal */}
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

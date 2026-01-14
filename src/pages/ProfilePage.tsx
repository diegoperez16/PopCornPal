import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore, type MediaEntry } from '../store/mediaStore'
import { useNavigate } from 'react-router-dom'
import { Plus, Film, Tv, Gamepad2, Book, Star, Calendar, Edit2, X, Trash2, Camera, LogOut, Users, User, Sparkles, Crown, Beaker, Search, Settings2, Check, GripVertical } from 'lucide-react'
import { supabase, type Badge, type UserBadge } from '../lib/supabase'
import GifPicker from '../components/GifPicker'

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuthStore()
  const { 
    entries, 
    fetchEntries, 
    updateEntry, 
    deleteEntry,
    favorites,
    userBadges,
    availableBadges,
    profileLoaded,
    profileScrollPos,
    setFavorites,
    setUserBadges,
    setAvailableBadges,
    setProfileLoaded,
    setProfileScrollPos
  } = useMediaStore()

  const [refreshing, setRefreshing] = useState(false)

  // Update initialLoading to rely on store
  // If profileLoaded is true, we don't show the full screen loader
  const [initialLoading, setInitialLoading] = useState(!profileLoaded)
  const navigate = useNavigate()
  
  // Profile Editing State
  const [isEditing, setIsEditing] = useState(() => localStorage.getItem('popcorn_profile_is_editing') === 'true')
  
  const [fullName, setFullName] = useState(() => 
    localStorage.getItem('popcorn_profile_fullname') || profile?.full_name || ''
  )
  const [bio, setBio] = useState(() => 
    localStorage.getItem('popcorn_profile_bio') || profile?.bio || ''
  )
  const [avatarUrl, setAvatarUrl] = useState(() => 
    localStorage.getItem('popcorn_profile_avatar_url') || profile?.avatar_url || ''
  )
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null)
  
  const [savingProfile, setSavingProfile] = useState(false)
  // const [availableBadges, setAvailableBadges] = useState<Badge[]>([])
  // const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('popcorn_profile_badges')
    return saved ? JSON.parse(saved) : []
  })
  
  const [showAvatarGifPicker, setShowAvatarGifPicker] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  
  // Profile Background State
  const [profileBgUrl, setProfileBgUrl] = useState(() => 
    localStorage.getItem('popcorn_profile_bg_url') || profile?.bg_url || ''
  )
  const [profileBgOpacity, setProfileBgOpacity] = useState(() => {
    const saved = localStorage.getItem('popcorn_profile_bg_opacity')
    return saved ? parseInt(saved) : (profile?.bg_opacity ?? 80)
  })
  
  const [showBgGifPicker, setShowBgGifPicker] = useState(false) 
  const [showGifPickerModal, setShowGifPickerModal] = useState(false) 
  const [uploadedBgImage, setUploadedBgImage] = useState<string | null>(null)
  const bgFileInputRef = useRef<HTMLInputElement>(null)

  // Entry Management State
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'planned'>('all')
  
  // Edit Entry Form State
  const [editRating, setEditRating] = useState(0)
  const [editStatus, setEditStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>('completed')
  const [editNotes, setEditNotes] = useState('')
  //const [initialLoading, setInitialLoading] = useState(true)

  // --- FAVORITES LOGIC ---
  // const [favorites, setFavorites] = useState<any[]>([])
  const [draggedFavIndex, setDraggedFavIndex] = useState<number | null>(null)
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [mediaFilterType, setMediaFilterType] = useState<'all' | 'movie' | 'show' | 'game' | 'book'>('all')
  
  const [isManagingFavorites, setIsManagingFavorites] = useState(false) 

  // --- Carousel scroll indicator logic (Direct DOM) ---
  const carouselRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = carouselRef.current
    const bar = progressBarRef.current
    const container = progressContainerRef.current
    
    if (!el || isManagingFavorites) return

    let rafId: number | null = null

    const updateBar = () => {
      if (!el || !bar || !container) return
      
      const { scrollLeft, scrollWidth, clientWidth } = el
      
      // Hide bar if content fits (no scrolling needed)
      if (scrollWidth <= clientWidth) {
        container.style.opacity = '0'
      } else {
        container.style.opacity = '1'
        const left = (scrollLeft / scrollWidth) * 100
        const width = (clientWidth / scrollWidth) * 100
        bar.style.left = `${left}%`
        bar.style.width = `${width}%`
      }
    }

    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        updateBar()
        rafId = null
      })
    }

    // Passive listener improves scroll performance and silences warnings
    el.addEventListener('scroll', onScroll, { passive: true })
    const observer = new ResizeObserver(() => requestAnimationFrame(updateBar))
    observer.observe(el)
    
    // Initial check
    requestAnimationFrame(updateBar)

    return () => {
      el.removeEventListener('scroll', onScroll)
      observer.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isManagingFavorites, favorites]) // Added 'favorites' to deps so it updates when data loads

  const fetchFavorites = async () => {
    if (!user) return
    const { data } = await supabase
      .from('profile_favorites')
      .select('*, media_entry:media_entries(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (data) setFavorites(data)
  }

  const handleAddFavorite = async (entryId: string) => {
    if (!user) return
    if (favorites.length >= 10) {
      alert('You can only have 10 favorites!')
      return
    }
    if (favorites.some(fav => fav.media_entry_id === entryId)) {
      alert('Already in favorites')
      return
    }
    try {
      const { data: existing } = await supabase
        .from('profile_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('media_entry_id', entryId)
        .maybeSingle()
      if (existing) {
        alert('Already in favorites')
        return
      }
      await supabase.from('profile_favorites').insert({
        user_id: user.id,
        media_entry_id: entryId
      })
      await fetchFavorites()
      setShowMediaSelector(false)
      setMediaSearchQuery('')
    } catch (error) {
      console.error('Error adding favorite:', error)
    }
  }

  const handleRemoveFavorite = async (favId: string) => {
  if (!window.confirm('Remove from favorites?')) return
  try {
    await supabase.from('profile_favorites').delete().eq('id', favId)
    // Use functional update or refetch
    setFavorites(favorites.filter(f => f.id !== favId)) 
  } catch (error) {
    console.error('Error removing favorite:', error)
  }
}

  const handleDragStart = (index: number) => setDraggedFavIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedFavIndex === null || draggedFavIndex === index) return

    const newFavorites = [...favorites]
    const [draggedItem] = newFavorites.splice(draggedFavIndex, 1)
    newFavorites.splice(index, 0, draggedItem)

    setFavorites(newFavorites)
    setDraggedFavIndex(index)
  }
  const handleDragEnd = async () => {
    setDraggedFavIndex(null)
    if (!user) return

    try {
      const updates = favorites.map((fav, index) => {
        const newTime = new Date(Date.now() + index * 1000).toISOString()
        return supabase
          .from('profile_favorites')
          .update({ created_at: newTime })
          .eq('id', fav.id)
      })
      
      await Promise.all(updates)
    } catch (error) {
      console.error('Error saving order:', error)
    }
  }

  // --- TOUCH HANDLERS (MOBILE) ---
  const handleTouchStart = (index: number) => {
    if (!isManagingFavorites) return
    setDraggedFavIndex(index)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isManagingFavorites || draggedFavIndex === null) return
    if (e.cancelable) e.preventDefault() // Crucial: Stops screen from scrolling while dragging
    
    const touch = e.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    const item = target?.closest('[data-fav-index]')
    
    if (item) {
      const newIndex = parseInt(item.getAttribute('data-fav-index') || '-1')
      if (newIndex !== -1 && newIndex !== draggedFavIndex) {
        const newFavorites = [...favorites]
        const [draggedItem] = newFavorites.splice(draggedFavIndex, 1)
        newFavorites.splice(newIndex, 0, draggedItem)
        setFavorites(newFavorites)
        setDraggedFavIndex(newIndex)
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isManagingFavorites) return
    handleDragEnd()
  }

  useEffect(() => {
    if (isEditing) {
      localStorage.setItem('popcorn_profile_is_editing', 'true')
      localStorage.setItem('popcorn_profile_fullname', fullName)
      localStorage.setItem('popcorn_profile_bio', bio)
      localStorage.setItem('popcorn_profile_avatar_url', avatarUrl)
      localStorage.setItem('popcorn_profile_bg_url', profileBgUrl)
      localStorage.setItem('popcorn_profile_bg_opacity', profileBgOpacity.toString())
      localStorage.setItem('popcorn_profile_badges', JSON.stringify(selectedBadgeIds))
    } else {
      localStorage.removeItem('popcorn_profile_is_editing')
      localStorage.removeItem('popcorn_profile_fullname')
      localStorage.removeItem('popcorn_profile_bio')
      localStorage.removeItem('popcorn_profile_avatar_url')
      localStorage.removeItem('popcorn_profile_bg_url')
      localStorage.removeItem('popcorn_profile_bg_opacity')
      localStorage.removeItem('popcorn_profile_badges')
    }
  }, [isEditing, fullName, bio, avatarUrl, profileBgUrl, profileBgOpacity, selectedBadgeIds])

  useEffect(() => {
    if (user) {
      // If data is already loaded (cached), show it and refresh in background
      if (profileLoaded) {
        setRefreshing(true)
      }
      
      // Fetch all data
      Promise.all([
        fetchEntries(user.id), 
        fetchBadges(), 
        fetchUserBadges(),
        fetchFavorites()
      ]).finally(() => {
        // Once done:
        setInitialLoading(false) // Hide full screen loader (if showing)
        setRefreshing(false)     // Hide top bar loader (if showing)
        setProfileLoaded(true)   // Mark as loaded in store
      })
    }

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        setRefreshing(true)
        Promise.all([
          fetchEntries(user.id), 
          fetchBadges(), 
          fetchUserBadges(), 
          fetchFavorites()
        ]).finally(() => setRefreshing(false))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, fetchEntries]) // Removed 'profileLoaded' from dependency to prevent loops

  const fetchBadges = async () => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('admin_only', { ascending: true })
      .order('name')
    
    if (data) setAvailableBadges(data) // Using store setter
  }

  const fetchUserBadges = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', user.id)
    
    if (data) {
      setUserBadges(data as UserBadge[])
      if (localStorage.getItem('popcorn_profile_is_editing') !== 'true') {
        setSelectedBadgeIds(data.map(ub => ub.badge_id))
      }
    }
  }

  useEffect(() => {
    if (profile && !isEditing) {
      setFullName(profile.full_name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
      setUploadedAvatar(null)
      setProfileBgUrl(profile.bg_url || '')
      setProfileBgOpacity(profile.bg_opacity ?? 80)
      setUploadedBgImage(null)
    }
  }, [profile, isEditing])

  useEffect(() => {
    if (selectedEntry) {
      setEditRating(selectedEntry.rating || 0)
      setEditStatus(selectedEntry.status)
      setEditNotes(selectedEntry.notes || '')
    }
  }, [selectedEntry])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: uploadedAvatar || avatarUrl.trim() || null,
        bg_url: uploadedBgImage || profileBgUrl.trim() || null,
        bg_opacity: profileBgOpacity,
      })
      const currentBadgeIds = userBadges.map(ub => ub.badge_id)
      const badgesToAdd = selectedBadgeIds.filter(id => !currentBadgeIds.includes(id))
      const badgesToRemove = currentBadgeIds.filter(id => !selectedBadgeIds.includes(id))
      if (badgesToAdd.length > 0) {
        await supabase
          .from('user_badges')
          .insert(badgesToAdd.map(badge_id => ({
            user_id: user.id,
            badge_id,
            given_by: user.id
          })))
      }
      if (badgesToRemove.length > 0) {
        await supabase
          .from('user_badges')
          .delete()
          .eq('user_id', user.id)
          .in('badge_id', badgesToRemove)
      }
      const { data } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', user.id)
      if (data) setUserBadges(data as UserBadge[])

      setIsEditing(false)
      setUploadedAvatar(null)
      setUploadedBgImage(null)
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = ''
      if (bgFileInputRef.current) bgFileInputRef.current.value = ''
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedBgImage(result)
      setProfileBgUrl('')
    }
    reader.readAsDataURL(file)
  }

  const handleBgUrl = () => {
    const url = prompt('Enter image or GIF URL (supports Giphy, Tenor, direct image links):')
    if (url) {
      let processedUrl = url
      if (url.includes('giphy.com/gifs/')) {
        const gifId = url.split('/').pop()?.split('-').pop()
        if (gifId) {
          processedUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`
        }
      } else if (url.includes('tenor.com/view/')) {
        alert('For Tenor GIFs, please right-click the GIF and select "Copy image address" to get the direct link')
        return
      }
      setProfileBgUrl(processedUrl)
      setUploadedBgImage(null)
    }
  }

  const handleGifPickerSelect = (gifUrl: string) => {
    setProfileBgUrl(gifUrl)
    setUploadedBgImage(null)
    setShowGifPickerModal(false)
  }

  const handleRemoveBg = () => {
    setUploadedBgImage(null)
    setProfileBgUrl('')
    if (bgFileInputRef.current) bgFileInputRef.current.value = ''
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedAvatar(result)
      setAvatarUrl('')
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarUrl = () => {
    const url = prompt('Enter image or GIF URL (supports Giphy, Tenor, direct image links):')
    if (url) {
      let processedUrl = url
      if (url.includes('giphy.com/gifs/')) {
        const gifId = url.split('/').pop()?.split('-').pop()
        if (gifId) {
          processedUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`
        }
      }
      else if (url.includes('tenor.com/view/')) {
        alert('For Tenor GIFs, please right-click the GIF and select "Copy image address" to get the direct link')
        return
      }
      setAvatarUrl(processedUrl)
      setUploadedAvatar(null)
    }
  }

  const handleRemoveAvatar = () => {
    setUploadedAvatar(null)
    setAvatarUrl('')
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = ''
    }
  }

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return
    try {
      await updateEntry(selectedEntry.id, {
        rating: editRating || null,
        status: editStatus,
        notes: editNotes.trim() || null,
        completed_date: editStatus === 'completed' && selectedEntry.status !== 'completed' 
          ? new Date().toISOString().split('T')[0] 
          : selectedEntry.completed_date
      })
      setSelectedEntry(null)
    } catch (error) {
      console.error('Error updating entry:', error)
    }
  }

  const handleDeleteEntry = async () => {
    if (!selectedEntry || !confirm('Are you sure you want to delete this entry?')) return
    try {
      await deleteEntry(selectedEntry.id)
      setSelectedEntry(null)
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  // 1. Restore scroll position on mount
  useLayoutEffect(() => {
    if (profileScrollPos > 0) {
      window.scrollTo(0, profileScrollPos)
    }
  }, [profileScrollPos])

  // 2. Save scroll position ONLY on unmount
  useLayoutEffect(() => {
    return () => {
      setProfileScrollPos(window.scrollY)
    }
  }, [setProfileScrollPos])

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

  const creatorBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'creator')
  const alphaBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'alpha tester')
  const regularBadges = userBadges.filter(ub => {
    const name = ub.badges?.name.toLowerCase()
    return name !== 'creator' && name !== 'alpha tester'
  })

  if (initialLoading) {
    return (

      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-8 relative flex items-center justify-center gap-6">
            <Users className="w-16 h-16 text-purple-500 animate-pulse" />
            <div className="relative">
              <User className="w-20 h-20 text-pink-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
            </div>
            <Film className="w-16 h-16 text-red-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              Loading your profile...
            </h2>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Profile Header */}
        <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 sm:p-8 mb-6 overflow-hidden">
          {(uploadedBgImage || profileBgUrl) && (
            <div
              className="absolute inset-0 z-0"
              style={{
                opacity: (profileBgOpacity ?? 80) / 100,
                background: uploadedBgImage || profileBgUrl ? undefined : 'linear-gradient(to bottom right, #1e293b, #111827)',
              }}
            >
              {(uploadedBgImage || profileBgUrl) && (
                <img
                  src={uploadedBgImage || profileBgUrl}
                  alt="Profile background"
                  className="w-full h-full object-cover"
                  style={{ opacity: 1 }}
                />
              )}
            </div>
          )}
          <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-4xl font-bold shadow-lg shadow-red-500/20">
                  {(uploadedAvatar || avatarUrl || profile.avatar_url) ? (
                    <img 
                      src={uploadedAvatar || avatarUrl || profile.avatar_url || ''} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement!.innerHTML = profile.username.charAt(0).toUpperCase()
                      }}
                    />
                  ) : (
                    profile.username.charAt(0).toUpperCase()
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 w-full text-center sm:text-left flex flex-col gap-4">
              <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 mb-2">
                <h2 className="text-2xl font-bold mb-1">@{profile.username}</h2>
                {!isEditing && profile.full_name && (
                  <p className="text-gray-400 text-lg mb-1">{profile.full_name}</p>
                )}
                {!isEditing && (
                  <div>
                    {profile.bio ? (
                      <p className="text-gray-300 text-center sm:text-left">{profile.bio}</p>
                    ) : (
                      <p className="text-gray-500 italic text-center sm:text-left">No bio yet.</p>
                    )}
                  </div>
                )}
              </div>
              
              {!isEditing && userBadges.length > 0 && (
                <div className="space-y-4">
                  {creatorBadge && (
                    <div className="bg-gradient-to-r from-gray-900/90 to-purple-900/20 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between sm:justify-start gap-4">
                      <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm uppercase tracking-wider">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span>Creator Status</span>
                      </div>
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

                  {alphaBadge && (
                    <div className="bg-gradient-to-r from-gray-900/90 to-cyan-900/20 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between sm:justify-start gap-4">
                      <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm uppercase tracking-wider">
                        <Beaker className="w-4 h-4 text-cyan-400" />
                        <span>Alpha Status</span>
                      </div>
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

                  {regularBadges.length > 0 && (
                    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 flex flex-wrap gap-3 justify-center sm:justify-start">
                      {regularBadges.map((userBadge) => {
                        const badge = userBadge.badges!
                        
                        const colorEffects: Record<string, { gradient: string, glow: string }> = {
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
                        const effects = colorEffects[badge.color] || { gradient: 'from-gray-600 via-gray-500 to-gray-400', glow: 'shadow-gray-500/50' }
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

              {!isEditing && (
                <div className="flex gap-2">
                  {profile.is_admin && (
                    <button
                      onClick={() => navigate('/admin/badges')}
                      className="mt-2 sm:mt-0 p-2 hover:bg-purple-600/20 rounded-full transition-colors text-purple-400 hover:text-purple-300 border border-purple-500/30"
                      title="Admin Badge Panel"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 sm:mt-0 p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowBgGifPicker(true)}
                    className="mt-2 sm:mt-0 p-2 hover:bg-pink-600/20 rounded-full transition-colors text-pink-400 hover:text-pink-300 border border-pink-500/30"
                    title="Edit Profile Background"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(isEditing || showBgGifPicker) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {showBgGifPicker && (
                    <div className="mb-4 p-4 bg-gray-900/80 rounded-xl border border-pink-500/30">
                      <h4 className="font-semibold text-pink-400 mb-2">Edit Profile Background</h4>
                      <input
                        ref={bgFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBgUpload}
                        className="hidden"
                      />
                      <div className="flex flex-wrap gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => bgFileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          Upload Image
                        </button>
                        <button
                          type="button"
                          onClick={handleBgUrl}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          <Film className="w-4 h-4" />
                          GIF/Image URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowGifPickerModal(true)}
                          className="flex items-center gap-2 px-3 py-2 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/50 rounded-lg text-sm transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          Browse GIFs
                        </button>
                        {(uploadedBgImage || profileBgUrl) && (
                          <button
                            type="button"
                            onClick={handleRemoveBg}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Background Opacity</label>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={profileBgOpacity}
                          onChange={e => setProfileBgOpacity(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-400 mt-1">{profileBgOpacity}%</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowBgGifPicker(false); handleSaveProfile(); }}
                          disabled={savingProfile}
                          className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:from-pink-600 hover:to-red-600 transition-all disabled:opacity-50"
                        >
                          {savingProfile ? 'Saving...' : 'Save Background'}
                        </button>
                        <button
                          onClick={() => { setShowBgGifPicker(false); setUploadedBgImage(null); setProfileBgUrl(profile?.bg_url || ''); setProfileBgOpacity(profile?.bg_opacity ?? 80); if (bgFileInputRef.current) bgFileInputRef.current.value = ''; }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {isEditing && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Profile Picture
                        </label>
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => avatarFileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                          >
                            <Camera className="w-4 h-4" />
                            Upload Image
                          </button>
                          <button
                            type="button"
                            onClick={handleAvatarUrl}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                          >
                            <Film className="w-4 h-4" />
                            GIF URL
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAvatarGifPicker(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg text-sm transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            Browse GIFs
                          </button>
                          {(uploadedAvatar || avatarUrl) && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Badges (Select up to 5)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {availableBadges
                            .filter(badge => !badge.admin_only)
                            .map((badge) => {
                              const isSelected = selectedBadgeIds.includes(badge.id)
                              return (
                                <button
                                  key={badge.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedBadgeIds(selectedBadgeIds.filter(id => id !== badge.id))
                                    } else if (selectedBadgeIds.length < 5) {
                                      setSelectedBadgeIds([...selectedBadgeIds, badge.id])
                                    }
                                  }}
                                  className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    isSelected ? 'ring-2 ring-white' : 'hover:scale-105'
                                  }`}
                                  disabled={!isSelected && selectedBadgeIds.length >= 5}
                                >
                                  <div className={`absolute inset-0 bg-${badge.color} ${isSelected ? 'opacity-100' : 'opacity-50'}`}></div>
                                  <span className="relative z-10 text-white">{badge.name}</span>
                                </button>
                              )
                            })}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {selectedBadgeIds.length}/5 badges selected
                        </p>
                        {userBadges.some(ub => ub.badges?.admin_only) && (
                          <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <p className="text-xs text-purple-300 flex items-center gap-2">
                              <span className="text-purple-400">✨</span>
                              You have admin-only badges that can only be managed by the creator
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50"
                        >
                          {savingProfile ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setUploadedAvatar(null)
                            setAvatarUrl(profile?.avatar_url || '')
                            if (avatarFileInputRef.current) {
                              avatarFileInputRef.current.value = ''
                            }
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* --- FAVORITES SHELF --- */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              Top Favorites
            </h3>
            
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
                  setSelectedFavoriteId(null) // Clear selection when toggling
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
                  ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 w-full justify-items-center" // Grid = Symmetrical
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
                  draggable: isManagingFavorites && isSelected, // Only draggable when managing AND selected
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
                      // Only prevent scrolling when this specific item is selected and being dragged
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
                    onClick={(e) => {
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
                        <img 
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
                              : 'scale-100 opacity-100 pointer-events-auto' // Always visible in manage mode 
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
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">Recent Activity</h3>
            <button onClick={() => navigate('/add')} className="sm:hidden p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/20"><Plus className="w-5 h-5 text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/library')} className="bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-xl p-4 transition-all flex items-center justify-between group"><div className="flex items-center gap-3"><Book className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" /><span className="text-gray-300 group-hover:text-white font-medium transition-colors">Library</span></div><span className="text-gray-500 group-hover:text-gray-300 transition-colors">→</span></button>
            <button onClick={() => navigate('/activity')} className="bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-xl p-4 transition-all flex items-center justify-between group"><div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" /><span className="text-gray-300 group-hover:text-white font-medium transition-colors">Activity</span></div><span className="text-gray-500 group-hover:text-gray-300 transition-colors">→</span></button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'all' ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>All</button>
            <button onClick={() => setStatusFilter('completed')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>Completed</button>
            <button onClick={() => setStatusFilter('in-progress')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'in-progress' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>In Progress</button>
            <button onClick={() => setStatusFilter('planned')} className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${statusFilter === 'planned' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'}`}>Planned</button>
          </div>
          {entries.filter(e => e.status !== 'logged' && (statusFilter === 'all' || e.status === statusFilter)).length > 0 ? (
             <div className="grid grid-cols-1 gap-4">
               {entries.filter(e => e.status !== 'logged' && (statusFilter === 'all' || e.status === statusFilter)).map((entry) => {
                 const Icon = getIcon(entry.media_type)
                 return (
                    <div key={entry.id} onClick={() => setSelectedEntry(entry)} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/50 transition-colors flex gap-4 cursor-pointer group">
                      <div className="flex-shrink-0 w-16 h-24 bg-gray-900 rounded-lg overflow-hidden relative">
                         {entry.cover_image_url ? <img src={entry.cover_image_url} alt={entry.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-700"><Icon className="w-6 h-6" /></div>}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Edit2 className="w-6 h-6 text-white" /></div>
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-lg font-semibold truncate text-white">{entry.title}</h4>
                          <div className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${entry.status === 'completed' ? 'bg-green-500/10 text-green-500' : entry.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{entry.status.replace('-', ' ')}</div>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                           <span className="flex items-center gap-1"><Icon className="w-3 h-3" /> {entry.media_type}</span>
                           {entry.year && <span>· {entry.year}</span>}
                           {entry.completed_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.completed_date)}</span>}
                        </div>
                        {entry.rating && <div className="flex items-center gap-1 mt-2">{[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`w-4 h-4 ${star <= entry.rating! ? 'fill-yellow-500 text-yellow-500' : 'text-gray-700'}`} />))}</div>}
                        {entry.notes && <p className="text-gray-500 text-sm mt-2 line-clamp-2 italic">"{entry.notes}"</p>}
                      </div>
                    </div>
                 )
               })}
             </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600"><Film className="w-8 h-8" /></div>
              <h3 className="text-lg font-medium text-white mb-2">No entries yet</h3>
              <p className="text-gray-400 mb-6">Start building your collection by adding movies, shows, games, or books.</p>
              <button onClick={() => navigate('/add')} className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-red-500/20">Add Your First Entry</button>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mt-8 pb-24 md:hidden">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-red-500/10 border border-gray-700 text-gray-400 rounded-xl transition-all"><LogOut className="w-5 h-5" /> <span className="font-medium">Sign Out</span></button>
        </div>
      </main>

      {/* Modals and GIF Pickers */}
      {showGifPickerModal && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowGifPickerModal(false)}><div className="w-full max-w-lg" onClick={e => e.stopPropagation()}><GifPicker onSelect={handleGifPickerSelect} onClose={() => setShowGifPickerModal(false)} /></div></div>}
      {showAvatarGifPicker && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowAvatarGifPicker(false)}><div className="w-full max-w-lg" onClick={e => e.stopPropagation()}><GifPicker onSelect={(gifUrl) => { setAvatarUrl(gifUrl); setUploadedAvatar(null); setShowAvatarGifPicker(false) }} onClose={() => setShowAvatarGifPicker(false)} /></div></div>}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
             <button onClick={() => setSelectedEntry(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
             <h2 className="text-xl font-bold mb-1 pr-8 leading-tight">{selectedEntry.title}</h2>
             <p className="text-gray-400 text-sm mb-6 capitalize">{selectedEntry.media_type}</p>
             <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Status</label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {[{ value: 'completed', label: 'Completed' }, { value: 'in-progress', label: 'In Progress' }, { value: 'planned', label: 'Plan to Watch' }, { value: 'logged', label: 'Library' }].map((s) => (
                      <button key={s.value} onClick={() => setEditStatus(s.value as any)} className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${editStatus === s.value ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Rating {editRating > 0 && `(${editRating}/5)`}</label>
                  <div className="flex gap-1 items-center justify-center mb-2">{[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`w-8 h-8 ${editRating >= star ? 'fill-yellow-500 text-yellow-500' : 'text-gray-700'}`} />))}</div>
                  <input type="range" min="0" max="10" step="1" value={editRating * 2} onChange={(e) => setEditRating(parseFloat(e.target.value) / 2)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 text-white" placeholder="What did you think?" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleDeleteEntry} className="px-4 py-3 rounded-xl border border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                  <button onClick={handleUpdateEntry} className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3 rounded-xl">Save Changes</button>
                </div>
             </div>
           </div>
        </div>
      )}
      {showMediaSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Select Favorite</h3>
              <button onClick={() => { setShowMediaSelector(false); setMediaSearchQuery(''); }} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
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
                        {entry.cover_image_url ? <img src={entry.cover_image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon className="w-4 h-4 text-gray-600" /></div>}
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
    </div>
  )
}
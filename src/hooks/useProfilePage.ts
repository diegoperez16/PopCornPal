import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useMediaStore } from '../store/mediaStore'
import { useMediaEntries, useUpdateEntry, useDeleteEntry } from './queries/useMediaQueries'
import { usePeopleCounts } from './queries/usePeopleQueries'
import { useSocialStore } from '../store/socialStore'
import type { MediaEntry } from './queries/useMediaQueries'
import { supabase, type UserBadge } from '../lib/supabase'
import { authedQuery } from '../lib/queryClient'
import { persistProfileImage } from '../lib/profileImages'
import type { CropData } from '../components/ImageCropper'
import type { AvatarCrop } from '../lib/supabase'

export function useProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuthStore(useShallow(s => ({
    user: s.user,
    profile: s.profile,
    updateProfile: s.updateProfile,
    signOut: s.signOut,
  })))
  const { profileScrollPos, setProfileScrollPos } = useMediaStore(useShallow(s => ({
    profileScrollPos: s.profileScrollPos,
    setProfileScrollPos: s.setProfileScrollPos,
  })))

  const setPeopleActiveTab = useSocialStore((s) => s.setPeopleActiveTab)

  // TanStack Query for server data
  const { data: entries = [] } = useMediaEntries(user?.id ?? '')
  const { data: peopleCounts } = usePeopleCounts(user?.id ?? '')
  const { mutate: updateEntryMutation } = useUpdateEntry(user?.id ?? '')
  const { mutate: deleteEntryMutation } = useDeleteEntry(user?.id ?? '')

  // Local state for profile-specific data not in TQ
  const [favorites, setFavorites] = useState<any[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [availableBadges, setAvailableBadges] = useState<any[]>([])
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Compat shims so existing code that calls updateEntry/deleteEntry still works
  const updateEntry = (id: string, updates: Partial<MediaEntry>) =>
    updateEntryMutation({ id, updates })
  const deleteEntry = (id: string) =>
    deleteEntryMutation(id)

  const navigate = useNavigate()

  // If profileLoaded is true, we don't show the full screen loader
  const [initialLoading, setInitialLoading] = useState(!profileLoaded)

  // Profile Editing State
  const [isEditing, setIsEditing] = useState(() => localStorage.getItem('popcorn_profile_is_editing') === 'true')

  const [username, setUsername] = useState(() =>
    localStorage.getItem('popcorn_profile_username') || profile?.username || ''
  )
  const [usernameError, setUsernameError] = useState('')
  const [saveError, setSaveError] = useState('')
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

  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('popcorn_profile_badges')
    return saved ? JSON.parse(saved) : []
  })

  const [showAvatarGifPicker, setShowAvatarGifPicker] = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null)
  const [pendingAvatarGifCrop, setPendingAvatarGifCrop] = useState<AvatarCrop | null>(null)
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
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [originalBgImageUrl, setOriginalBgImageUrl] = useState<string | null>(null)
  const [desktopCropData, setDesktopCropData] = useState<CropData | null>(null)
  const [mobileCropData, setMobileCropData] = useState<CropData | null>(null)
  const [mobileHeaderAspectRatio, setMobileHeaderAspectRatio] = useState(0.75)
  const [pendingBgImage, setPendingBgImage] = useState<string | null>(null)
  const bgFileInputRef = useRef<HTMLInputElement>(null)
  const profileHeaderRef = useRef<HTMLDivElement>(null)

  // Entry Management State
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'planned'>('all')

  // Edit Entry Form State
  const [editRating, setEditRating] = useState(0)
  const [editStatus, setEditStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>('completed')
  const [editNotes, setEditNotes] = useState('')

  // Favorites Logic
  const [draggedFavIndex, setDraggedFavIndex] = useState<number | null>(null)
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [mediaFilterType, setMediaFilterType] = useState<'all' | 'movie' | 'show' | 'game' | 'book'>('all')

  const [isManagingFavorites, setIsManagingFavorites] = useState(false)

  const [showAddButton, setShowAddButton] = useState(false)
  const recentActivityRef = useRef<HTMLDivElement>(null)
  const profileBgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        setShowAddButton(window.scrollY > 300)
        rafId = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Track window width for responsive crop application
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useLayoutEffect(() => {
    const header = profileHeaderRef.current
    if (!header) return

    const updateRatio = () => {
      const rect = header.getBoundingClientRect()
      if (rect.height > 0) {
        const measured = rect.width / rect.height
        const clamped = Math.max(0.5, Math.min(1.2, measured))
        setMobileHeaderAspectRatio(clamped)
      }
    }

    updateRatio()
    const observer = new ResizeObserver(() => updateRatio())
    observer.observe(header)

    return () => observer.disconnect()
  }, [isDesktop])

  // Carousel scroll indicator logic
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

    el.addEventListener('scroll', onScroll, { passive: true })
    const observer = new ResizeObserver(() => requestAnimationFrame(updateBar))
    observer.observe(el)

    requestAnimationFrame(updateBar)

    return () => {
      el.removeEventListener('scroll', onScroll)
      observer.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isManagingFavorites, favorites])

  const fetchFavorites = async () => {
    if (!user) return
    const data = await authedQuery(() =>
      supabase
        .from('profile_favorites')
        .select('*, media_entry:media_entries(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
    )
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

  // Touch Handlers (mobile)
  const handleTouchStart = (index: number) => {
    if (!isManagingFavorites) return
    setDraggedFavIndex(index)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isManagingFavorites || draggedFavIndex === null) return
    if (e.cancelable) e.preventDefault()

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
      try {
        localStorage.setItem('popcorn_profile_is_editing', 'true')
        localStorage.setItem('popcorn_profile_username', username)
        localStorage.setItem('popcorn_profile_fullname', fullName)
        localStorage.setItem('popcorn_profile_bio', bio)
        // Skip base64 data URLs — too large for localStorage
        if (avatarUrl && !avatarUrl.startsWith('data:')) {
          localStorage.setItem('popcorn_profile_avatar_url', avatarUrl)
        }
        if (profileBgUrl && !profileBgUrl.startsWith('data:')) {
          localStorage.setItem('popcorn_profile_bg_url', profileBgUrl)
        }
        localStorage.setItem('popcorn_profile_bg_opacity', profileBgOpacity.toString())
        localStorage.setItem('popcorn_profile_badges', JSON.stringify(selectedBadgeIds))
      } catch {
        // Quota exceeded — non-critical, editing state just won't persist across refresh
      }
    } else {
      localStorage.removeItem('popcorn_profile_is_editing')
      localStorage.removeItem('popcorn_profile_username')
      localStorage.removeItem('popcorn_profile_fullname')
      localStorage.removeItem('popcorn_profile_bio')
      localStorage.removeItem('popcorn_profile_avatar_url')
      localStorage.removeItem('popcorn_profile_bg_url')
      localStorage.removeItem('popcorn_profile_bg_opacity')
      localStorage.removeItem('popcorn_profile_badges')
    }
  }, [isEditing, username, fullName, bio, avatarUrl, profileBgUrl, profileBgOpacity, selectedBadgeIds])

  useEffect(() => {
    if (!user) {
      setInitialLoading(false)
      return
    }

    const safetyTimer = setTimeout(() => setInitialLoading(false), 3000)

    // entries are handled by TQ (useMediaEntries), only fetch badges/favorites here
    Promise.all([
      fetchBadges(),
      fetchUserBadges(),
      fetchFavorites()
    ]).finally(() => {
      clearTimeout(safetyTimer)
      setInitialLoading(false)
      setProfileLoaded(true)
    })

    return () => {
      clearTimeout(safetyTimer)
    }
  }, [user])

  const fetchBadges = async () => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('admin_only', { ascending: true })
      .order('name')

    if (data) setAvailableBadges(data)
  }

  const fetchUserBadges = async () => {
    if (!user) return

    let data: any[] | null = null
    try {
      data = await authedQuery(() =>
        supabase
          .from('user_badges')
          .select('*, badges(*)')
          .eq('user_id', user.id)
      )
    } catch (error) {
      console.error('[fetchUserBadges] error:', error)
      return
    }
    console.log('[fetchUserBadges] data:', data)
    if (data) {
      setUserBadges(data as UserBadge[])
      // Always sync selectedBadgeIds with DB — if editing, merge so admin badges
      // are never missing from the selection (prevents them being deleted on save)
      setSelectedBadgeIds(prev => {
        const dbIds = data.map(ub => ub.badge_id)
        if (localStorage.getItem('popcorn_profile_is_editing') !== 'true') {
          return dbIds
        }
        // Editing mode: keep user's current picks but add any DB badges not present
        // (especially admin-only badges the picker doesn't show)
        return [...new Set([...prev, ...dbIds.filter(id => {
          const ub = data.find(u => u.badge_id === id)
          return ub?.badges?.admin_only
        })])]
      })
    }
  }

  useEffect(() => {
    if (profile && !isEditing) {
      setUsername(profile.username || '')
      setUsernameError('')
      setFullName(profile.full_name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
      setUploadedAvatar(null)
      setPendingAvatarGifCrop(profile.avatar_crop ?? null)
      const bgUrl = profile.bg_url || ''
      setProfileBgUrl(bgUrl)
      setProfileBgOpacity(profile.bg_opacity ?? 80)
      setUploadedBgImage(null)

      const cropDataKey = bgUrl
        ? `bg_crop_${btoa(bgUrl.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '')}`
        : null

      const profileCrop = profile.bg_crop
      const hasProfileCrop = Boolean(profileCrop?.desktop && profileCrop?.mobile)

      if (bgUrl && hasProfileCrop) {
        setOriginalBgImageUrl(bgUrl)
        setDesktopCropData(profileCrop!.desktop)
        setMobileCropData(profileCrop!.mobile)
        if (cropDataKey) {
          localStorage.setItem(cropDataKey, JSON.stringify(profileCrop))
        }
      } else if (bgUrl && cropDataKey) {
        const savedCropData = localStorage.getItem(cropDataKey)
        if (savedCropData) {
          try {
            const cropData = JSON.parse(savedCropData)
            setOriginalBgImageUrl(bgUrl)
            setDesktopCropData(cropData.desktop)
            setMobileCropData(cropData.mobile)
          } catch (e) {
            setOriginalBgImageUrl(null)
            setDesktopCropData(null)
            setMobileCropData(null)
          }
        } else {
          setOriginalBgImageUrl(null)
          setDesktopCropData(null)
          setMobileCropData(null)
        }
      } else {
        setOriginalBgImageUrl(null)
        setDesktopCropData(null)
        setMobileCropData(null)
      }
    }
  }, [profile, isEditing])

  useEffect(() => {
    if (selectedEntry) {
      setEditRating(selectedEntry.rating || 0)
      setEditStatus(selectedEntry.status)
      setEditNotes(selectedEntry.notes || '')
    }
  }, [selectedEntry])

  // Your own follower lists already live on the People page, so the profile
  // counts open that page on the matching tab rather than duplicating it.
  const openPeopleTab = (tab: 'followers' | 'following') => {
    setPeopleActiveTab(tab)
    navigate('/people')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const handleSaveProfile = async () => {
    if (!user) return

    const trimmedUsername = username.trim().toLowerCase()
    if (!trimmedUsername) {
      setUsernameError('Username cannot be empty')
      return
    }
    if (trimmedUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return
    }
    if (trimmedUsername.length > 20) {
      setUsernameError('Username must be 20 characters or less')
      return
    }
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      setUsernameError('Only lowercase letters, numbers, and underscores')
      return
    }

    setUsernameError('')
    setSaveError('')
    setSavingProfile(true)

    const SAVE_TIMEOUT = 15_000
    let clearSaveTimeout: (() => void) | undefined
    const timeout = new Promise<never>((_, reject) => {
      const id = setTimeout(() => reject(new Error('Save timed out — please check your connection and try again.')), SAVE_TIMEOUT)
      clearSaveTimeout = () => clearTimeout(id)
    })

    try {
      await Promise.race([timeout, (async () => {
        if (trimmedUsername !== profile?.username) {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', trimmedUsername)
            .neq('id', user.id)
            .maybeSingle()
          if (existing) {
            setUsernameError('Username is already taken')
            return
          }
        }

        const bgRawToSave = originalBgImageUrl
          ? originalBgImageUrl
          : (uploadedBgImage || profileBgUrl.trim() || null)
        const bgCropToSave = originalBgImageUrl && desktopCropData && mobileCropData
          ? { desktop: desktopCropData, mobile: mobileCropData }
          : null

        const [avatarUrlToSave, bgUrlToSave] = await Promise.all([
          persistProfileImage(user.id, 'avatars', uploadedAvatar || avatarUrl.trim() || null),
          persistProfileImage(user.id, 'backgrounds', bgRawToSave),
        ])

        await updateProfile({
          username: trimmedUsername,
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrlToSave,
          bg_url: bgUrlToSave,
          bg_opacity: profileBgOpacity,
          bg_crop: bgCropToSave,
          avatar_crop: pendingAvatarGifCrop,
        })
        // Only manage non-admin badges here — admin badges can only be removed by admins
        const adminBadgeIds = new Set(availableBadges.filter(b => b.admin_only).map(b => b.id))
        const currentBadgeIds = userBadges.map(ub => ub.badge_id).filter(id => !adminBadgeIds.has(id))
        const selectedNonAdminIds = selectedBadgeIds.filter(id => !adminBadgeIds.has(id))
        const badgesToAdd = selectedNonAdminIds.filter(id => !currentBadgeIds.includes(id))
        const badgesToRemove = currentBadgeIds.filter(id => !selectedNonAdminIds.includes(id))
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
      })()])
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setSaveError(error?.message || 'Failed to save profile. Please try again.')
    } finally {
      clearSaveTimeout?.()
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
    setPendingBgImage(null)
    setOriginalBgImageUrl(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImageToCrop(result)
      setShowImageCropper(true)
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
      setPendingBgImage(null)
      setOriginalBgImageUrl(null)
      setImageToCrop(processedUrl)
      setShowImageCropper(true)
    }
  }

  const handleGifPickerSelect = (gifUrl: string) => {
    setShowGifPickerModal(false)
    setImageToCrop(gifUrl)
    setShowImageCropper(true)
  }

  const handleCropComplete = (desktopCrop: CropData, mobileCrop: CropData) => {
    setPendingBgImage(imageToCrop)
    setOriginalBgImageUrl(imageToCrop)
    setDesktopCropData(desktopCrop)
    setMobileCropData(mobileCrop)

    if (imageToCrop) {
      const cropDataKey = `bg_crop_${btoa(imageToCrop.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '')}`
      localStorage.setItem(cropDataKey, JSON.stringify({ desktop: desktopCrop, mobile: mobileCrop }))
    }

    setUploadedBgImage(null)
    setProfileBgUrl('')
    setShowImageCropper(false)
    setImageToCrop(null)
  }

  const handleCropCancel = () => {
    setShowImageCropper(false)
    setImageToCrop(null)
    if (bgFileInputRef.current) bgFileInputRef.current.value = ''
  }

  const handleRemoveBg = () => {
    setPendingBgImage(null)
    setUploadedBgImage(null)
    setProfileBgUrl('')
    setOriginalBgImageUrl(null)
    setDesktopCropData(null)
    setMobileCropData(null)
    setImageToCrop(null)
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
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setAvatarToCrop(result)
      setShowAvatarCropper(true)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarCropComplete = (cropData: AvatarCrop) => {
    const src = avatarToCrop
    setShowAvatarCropper(false)
    setAvatarToCrop(null)
    if (!src) return

    // GIFs can't be rendered on canvas without losing animation.
    // Store the raw GIF + crop settings; CSS transforms apply at display time.
    const isGif = src.startsWith('data:image/gif') || src.toLowerCase().includes('.gif')
    if (isGif) {
      setUploadedAvatar(src)
      setAvatarUrl('')
      setPendingAvatarGifCrop(cropData)
      return
    }

    const img = new Image()
    img.onload = () => {
      const outputSize = 400
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.beginPath()
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
      ctx.clip()

      const displayWidth = outputSize * cropData.scale / 100
      const displayHeight = displayWidth * (img.naturalHeight / img.naturalWidth)
      const offsetX = (outputSize - displayWidth) * (cropData.x / 100)
      const offsetY = (outputSize - displayHeight) * (cropData.y / 100)

      ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight)
      setUploadedAvatar(canvas.toDataURL('image/png'))
      setAvatarUrl('')
      setPendingAvatarGifCrop(null)
    }
    img.src = src
  }

  const handleAvatarCropCancel = () => {
    setShowAvatarCropper(false)
    setAvatarToCrop(null)
    if (avatarFileInputRef.current) avatarFileInputRef.current.value = ''
  }

  const handleAvatarGifPickerSelect = (gifUrl: string) => {
    setAvatarToCrop(gifUrl)
    setShowAvatarCropper(true)
    setShowAvatarGifPicker(false)
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
      } else if (url.includes('tenor.com/view/')) {
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
    setPendingAvatarGifCrop(null)
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

  // Badge logic
  const creatorBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'creator')
  const alphaBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'alpha tester')
  const regularBadges = userBadges.filter(ub => {
    const name = ub.badges?.name.toLowerCase()
    return name !== 'creator' && name !== 'alpha tester'
  })

  const cropperUserPreview = profile ? {
    username: profile.username,
    fullName: fullName || profile.full_name || null,
    bio: bio || profile.bio || null,
    avatarUrl: uploadedAvatar || avatarUrl || profile.avatar_url || null,
    creatorBadge: creatorBadge?.badges
      ? {
          name: creatorBadge.badges.name,
          color: creatorBadge.badges.color,
          gifUrl: creatorBadge.badges.gif_url,
          opacity: creatorBadge.badges.opacity,
        }
      : null,
    alphaBadge: alphaBadge?.badges
      ? {
          name: alphaBadge.badges.name,
          color: alphaBadge.badges.color,
          gifUrl: alphaBadge.badges.gif_url,
          opacity: alphaBadge.badges.opacity,
        }
      : null,
    badges: userBadges
      .filter(ub => ub.badges)
      .map(ub => ({
        name: ub.badges!.name,
        color: ub.badges!.color,
        gifUrl: ub.badges!.gif_url,
        opacity: ub.badges!.opacity,
      })),
  } : null

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

  return {
    // Store values
    user,
    profile,
    entries,
    favorites,
    userBadges,
    availableBadges,
    // State
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
    setAvatarUrl,
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
    setProfileBgUrl,
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
    // Computed
    creatorBadge,
    alphaBadge,
    regularBadges,
    cropperUserPreview,
    colorEffects,
    // Handlers
    followersCount: peopleCounts?.followersCount ?? 0,
    followingCount: peopleCounts?.followingCount ?? 0,
    openPeopleTab,
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
  }
}

import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore, type MediaEntry } from '../store/mediaStore'
import { useNavigate } from 'react-router-dom'
import { Plus, Film, Tv, Gamepad2, Book, Star, Calendar, Edit2, X, Trash2, Loader2, Camera, LogOut, Users, User, Sparkles } from 'lucide-react'
import { supabase, type Badge, type UserBadge } from '../lib/supabase'
import GifPicker from '../components/GifPicker'

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuthStore()
  const { entries, fetchEntries, updateEntry, deleteEntry } = useMediaStore()
  const navigate = useNavigate()
  
  // Profile Editing State
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([])
  const [showAvatarGifPicker, setShowAvatarGifPicker] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  // Entry Management State
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [filterType, setFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)
  
  // Edit Entry Form State
  const [editRating, setEditRating] = useState(0)
  const [editStatus, setEditStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>('completed')
  const [editNotes, setEditNotes] = useState('')

  // Social Stats State
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchEntries(user.id), 
        fetchFollowCounts(), 
        fetchBadges(), 
        fetchUserBadges()
      ]).finally(() => setInitialLoading(false))
    }

    // Handle tab visibility - immediately refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchEntries(user.id)
        fetchFollowCounts()
        fetchUserBadges()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, fetchEntries])

  const fetchFollowCounts = async () => {
    if (!user) return
    
    try {
      // Get followers count
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', user.id)
      
      if (followersError) throw followersError
      setFollowersCount(followersCount || 0)

      // Get following count
      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('follower_id', user.id)
      
      if (followingError) throw followingError
      setFollowingCount(followingCount || 0)
    } catch (error) {
      console.error('Error fetching follow counts:', error)
    }
  }

  const fetchBadges = async () => {
    // Fetch all available badges
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('admin_only', { ascending: true })
      .order('name')
    
    if (data) setAvailableBadges(data)
  }

  const fetchUserBadges = async () => {
    if (!user) return
    
    // Fetch user's current badges
    const { data } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', user.id)
    
    if (data) {
      setUserBadges(data as UserBadge[])
      setSelectedBadgeIds(data.map(ub => ub.badge_id))
    }
  }

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
      setUploadedAvatar(null)
    }
  }, [profile])

  // Initialize edit form when entry is selected
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
      // Update profile (no badges in profile anymore)
      await updateProfile({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: uploadedAvatar || avatarUrl.trim() || null,
      })
      
      // Update user badges
      // Get current badge IDs
      const currentBadgeIds = userBadges.map(ub => ub.badge_id)
      
      // Find badges to add
      const badgesToAdd = selectedBadgeIds.filter(id => !currentBadgeIds.includes(id))
      
      // Find badges to remove
      const badgesToRemove = currentBadgeIds.filter(id => !selectedBadgeIds.includes(id))
      
      // Add new badges
      if (badgesToAdd.length > 0) {
        await supabase
          .from('user_badges')
          .insert(badgesToAdd.map(badge_id => ({
            user_id: user.id,
            badge_id,
            given_by: user.id
          })))
      }
      
      // Remove unselected badges
      if (badgesToRemove.length > 0) {
        await supabase
          .from('user_badges')
          .delete()
          .eq('user_id', user.id)
          .in('badge_id', badgesToRemove)
      }
      
      // Refresh user badges
      await fetchUserBadges()
      
      setIsEditing(false)
      setUploadedAvatar(null)
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSavingProfile(false)
    }
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
      setAvatarUrl('') // Clear URL input if uploading file
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarUrl = () => {
    const url = prompt('Enter image or GIF URL (supports Giphy, Tenor, direct image links):')
    if (url) {
      // Convert Giphy/Tenor share links to direct media URLs
      let processedUrl = url
      
      // Handle Giphy share links
      if (url.includes('giphy.com/gifs/')) {
        const gifId = url.split('/').pop()?.split('-').pop()
        if (gifId) {
          processedUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`
        }
      }
      // Handle Tenor links
      else if (url.includes('tenor.com/view/')) {
        alert('For Tenor GIFs, please right-click the GIF and select "Copy image address" to get the direct link')
        return
      }
      
      setAvatarUrl(processedUrl)
      setUploadedAvatar(null) // Clear uploaded file if adding URL
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
    setIsUpdating(true)
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
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!selectedEntry || !confirm('Are you sure you want to delete this entry?')) return
    setIsUpdating(true)
    try {
      await deleteEntry(selectedEntry.id)
      setSelectedEntry(null)
    } catch (error) {
      console.error('Error deleting entry:', error)
    } finally {
      setIsUpdating(false)
    }
  }

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          {/* Animated Icons */}
          <div className="mb-8 relative flex items-center justify-center gap-6">
            <Users className="w-16 h-16 text-purple-500 animate-pulse" />
            <div className="relative">
              <User className="w-20 h-20 text-pink-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
            </div>
            <Film className="w-16 h-16 text-red-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          {/* Loading Text */}
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

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          {/* Animated Icons */}
          <div className="mb-8 relative flex items-center justify-center gap-6">
            <Users className="w-16 h-16 text-purple-500 animate-pulse" />
            <div className="relative">
              <User className="w-20 h-20 text-pink-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
            </div>
            <Film className="w-16 h-16 text-red-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          {/* Loading Text */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              Setting up your profile...
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Profile Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
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

            {/* Profile Info */}
            <div className="flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between mb-4">
                <div className="w-full sm:w-auto">
                  <h2 className="text-2xl font-bold">@{profile.username}</h2>
                  {!isEditing && profile.full_name && (
                    <p className="text-gray-400">{profile.full_name}</p>
                  )}
                  {/* Badges */}
                  {!isEditing && userBadges.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                      {userBadges.map((userBadge) => {
                        const badge = userBadge.badges!
                        
                        // Map color to gradient and glow
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
                        
                        const effects = colorEffects[badge.color] || { 
                          gradient: 'from-gray-600 via-gray-500 to-gray-400', 
                          glow: 'shadow-gray-500/50' 
                        }
                        
                        return (
                          <div
                            key={userBadge.id}
                            className={`relative overflow-hidden rounded-lg shadow-lg ${effects.glow} transform hover:scale-105 transition-transform`}
                          >
                            {/* Animated GIF Background (if exists, use it instead of gradient) */}
                            {badge.gif_url ? (
                              <div className="absolute inset-0" style={{ opacity: (badge.opacity || 80) / 100 }}>
                                <img 
                                  src={badge.gif_url} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              /* Gradient Overlay (only if no GIF) */
                              <div className={`absolute inset-0 bg-gradient-to-br ${effects.gradient}`} style={{ opacity: (badge.opacity || 80) / 100 }}></div>
                            )}
                            {/* Badge Content */}
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
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Avatar Upload Section */}
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
                    {(uploadedAvatar || avatarUrl) && (
                      <div className="mt-2 text-xs text-gray-400">
                        Preview updated above ↑
                      </div>
                    )}
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
                  {/* Badges Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Badges (Select up to 5)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableBadges
                        .filter(badge => !badge.admin_only) // Only show non-admin badges
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
                              className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-all overflow-hidden ${
                                isSelected ? 'ring-2 ring-white' : 'hover:scale-105'
                              }`}
                              disabled={!isSelected && selectedBadgeIds.length >= 5}
                            >
                              {/* Background Color */}
                              <div className={`absolute inset-0 bg-${badge.color} ${isSelected ? 'opacity-100' : 'opacity-50'}`}></div>
                              {/* Badge Name */}
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
                </div>
              ) : (
                <div>
                  {profile.bio ? (
                    <p className="text-gray-300 text-center sm:text-left">{profile.bio}</p>
                  ) : (
                    <p className="text-gray-500 italic text-center sm:text-left">No bio yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">
              {filterType ? `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Activity` : 'Recent Activity'}
            </h3>
            <button 
              onClick={() => navigate('/add')}
              className="sm:hidden p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/20"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Quick Navigation Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/library')}
              className="bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-xl p-4 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                <span className="text-gray-300 group-hover:text-white font-medium transition-colors">Library</span>
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 transition-colors">→</span>
            </button>
            <button
              onClick={() => navigate('/activity')}
              className="bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-xl p-4 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                <span className="text-gray-300 group-hover:text-white font-medium transition-colors">Activity</span>
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 transition-colors">→</span>
            </button>
          </div>

          {entries.filter(e => e.status !== 'logged' && (!filterType || e.media_type === filterType)).length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {entries.filter(e => e.status !== 'logged' && (!filterType || e.media_type === filterType)).map((entry) => {
                const Icon = getIcon(entry.media_type)
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/50 transition-colors flex gap-4 cursor-pointer group"
                  >
                    <div className="flex-shrink-0 w-16 h-24 bg-gray-900 rounded-lg overflow-hidden relative">
                      {entry.cover_image_url ? (
                        <img src={entry.cover_image_url} alt={entry.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Edit2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-lg font-semibold truncate text-white">{entry.title}</h4>
                        <div className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
                          entry.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          entry.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {entry.status.replace('-', ' ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Icon className="w-3 h-3" />
                          {entry.media_type}
                        </span>
                        {entry.year && <span>{entry.year}</span>}
                        {entry.completed_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(entry.completed_date)}
                          </span>
                        )}
                      </div>

                      {entry.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= entry.rating! ? 'fill-yellow-500 text-yellow-500' : 'text-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      
                      {entry.notes && (
                        <p className="text-gray-500 text-sm mt-2 line-clamp-2 italic">"{entry.notes}"</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No entries yet</h3>
              <p className="text-gray-400 mb-6">Start building your collection by adding movies, shows, games, or books.</p>
              <button
                onClick={() => navigate('/add')}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-red-500/20"
              >
                Add Your First Entry
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Edit Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-1 pr-8 leading-tight">{selectedEntry.title}</h2>
            <p className="text-gray-400 text-sm mb-6 capitalize">{selectedEntry.media_type}</p>

            <div className="space-y-4 sm:space-y-6">
              {/* Status */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Status</label>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {[
                    { value: 'completed', label: 'Completed' },
                    { value: 'in-progress', label: 'In Progress' },
                    { value: 'planned', label: 'Plan to Watch' },
                    { value: 'logged', label: 'Library' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setEditStatus(s.value as any)}
                      className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
                        editStatus === s.value
                          ? 'bg-red-500/10 border-red-500 text-red-500'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Rating {editRating > 0 && `(${editRating}/5)`}
                  </label>
                  <div className="space-y-3">
                    {/* Star Display */}
                    <div className="flex gap-1 items-center justify-center">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = editRating >= star
                        const isHalfFilled = editRating >= star - 0.5 && editRating < star
                        
                        return (
                          <div key={star} className="relative">
                            {/* Background star */}
                            <Star className="w-8 h-8 sm:w-9 sm:h-9 text-gray-700" />
                            {/* Filled overlay */}
                            {(isFilled || isHalfFilled) && (
                              <div
                                className="absolute inset-0 overflow-hidden pointer-events-none"
                                style={{ width: isHalfFilled ? '50%' : '100%' }}
                              >
                                <Star className="w-8 h-8 sm:w-9 sm:h-9 fill-yellow-500 text-yellow-500" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {/* Slider */}
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={editRating * 2}
                      onChange={(e) => setEditRating(parseFloat(e.target.value) / 2)}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #eab308 0%, #eab308 ${(editRating / 5) * 100}%, #374151 ${(editRating / 5) * 100}%, #374151 100%)`
                      }}
                    />
                  </div>
                </div>              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 transition-colors text-white"
                  placeholder="What did you think?"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDeleteEntry}
                  disabled={isUpdating}
                  className="px-4 py-3 rounded-xl border border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-colors flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleUpdateEntry}
                  disabled={isUpdating}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Button - Mobile only */}
      <div className="mt-8 pb-24 md:hidden">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/50 text-gray-400 hover:text-red-400 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* Avatar GIF Picker */}
      {showAvatarGifPicker && (
        <GifPicker
          onSelect={(gifUrl) => {
            setAvatarUrl(gifUrl)
            setUploadedAvatar(null)
            setShowAvatarGifPicker(false)
          }}
          onClose={() => setShowAvatarGifPicker(false)}
        />
      )}
    </div>
  )
}

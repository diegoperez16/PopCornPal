import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore, type MediaEntry } from '../store/mediaStore'
import { useNavigate } from 'react-router-dom'
import { Plus, Film, Tv, Gamepad2, Book, Star, Calendar, Edit2, X, Trash2, Loader2, Camera, LogOut } from 'lucide-react'

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
  const [selectedBadges, setSelectedBadges] = useState<string[]>(profile?.badges || [])
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  // Entry Management State
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [filterType, setFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)
  
  // Edit Entry Form State
  const [editRating, setEditRating] = useState(0)
  const [editStatus, setEditStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>('completed')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    if (user) {
      fetchEntries(user.id)
      // Don't fetch stats separately - calculate from entries
    }
  }, [user, fetchEntries])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
      setUploadedAvatar(null)
      setSelectedBadges(profile.badges || [])
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
    setSavingProfile(true)
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: uploadedAvatar || avatarUrl.trim() || null,
        badges: selectedBadges,
      })
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

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <div className="text-white text-xl mb-2">Setting up your profile...</div>
          <p className="text-gray-400 text-sm">This will only take a moment</p>
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
                  {!isEditing && selectedBadges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                      {selectedBadges.map((badge) => (
                        <span
                          key={badge}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            badge === 'Creator' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                            badge === 'Alpha Tester' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                            badge === 'Reader' ? 'bg-green-500/20 text-green-300 border border-green-500/40' :
                            badge === 'Star Wars Fan' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                            badge === 'Anime Fan' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' :
                            badge === 'Gamer' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
                            badge === 'Cinephile' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                            'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 sm:mt-0 p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
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
                      {[
                        'Creator',
                        'Alpha Tester',
                        'Reader',
                        'Star Wars Fan',
                        'Anime Fan',
                        'Gamer',
                        'Cinephile',
                        'Binge Watcher',
                        'Bookworm',
                        'Marvel Fan',
                        'DC Fan',
                      ].map((badge) => {
                        const isSelected = selectedBadges.includes(badge)
                        return (
                          <button
                            key={badge}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBadges(selectedBadges.filter(b => b !== badge))
                              } else if (selectedBadges.length < 5) {
                                setSelectedBadges([...selectedBadges, badge])
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              isSelected
                                ? badge === 'Creator' ? 'bg-purple-500 text-white' :
                                  badge === 'Alpha Tester' ? 'bg-blue-500 text-white' :
                                  badge === 'Reader' || badge === 'Bookworm' ? 'bg-green-500 text-white' :
                                  badge === 'Star Wars Fan' ? 'bg-yellow-500 text-white' :
                                  badge === 'Anime Fan' ? 'bg-pink-500 text-white' :
                                  badge === 'Gamer' ? 'bg-indigo-500 text-white' :
                                  badge === 'Cinephile' || badge === 'Binge Watcher' ? 'bg-red-500 text-white' :
                                  badge === 'Marvel Fan' ? 'bg-red-600 text-white' :
                                  badge === 'DC Fan' ? 'bg-blue-600 text-white' :
                                  'bg-gray-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            disabled={!isSelected && selectedBadges.length >= 5}
                          >
                            {badge}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {selectedBadges.length}/5 badges selected
                    </p>
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

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Movies', count: entries.filter(e => e.media_type === 'movie').length, icon: Film, type: 'movie' as const },
            { label: 'Shows', count: entries.filter(e => e.media_type === 'show').length, icon: Tv, type: 'show' as const },
            { label: 'Games', count: entries.filter(e => e.media_type === 'game').length, icon: Gamepad2, type: 'game' as const },
            { label: 'Books', count: entries.filter(e => e.media_type === 'book').length, icon: Book, type: 'book' as const },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setFilterType(filterType === stat.type ? null : stat.type)}
              className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-4 sm:p-6 text-center group hover:border-gray-600 transition-all cursor-pointer ${
                filterType === stat.type ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-700'
              }`}
            >
              <stat.icon className="w-6 h-6 mx-auto mb-2 text-gray-500 group-hover:text-white transition-colors" />
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                {stat.count}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* View Activity Button */}
        <button
          onClick={() => navigate('/activity')}
          className="w-full mb-8 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-xl transition-all text-gray-300 hover:text-white"
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">View Your Activity</span>
        </button>

        {/* Currently Watching/Reading/Playing */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Currently Enjoying</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Latest Movie */}
            {(() => {
              const latestMovie = entries
                .filter(e => e.media_type === 'movie')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              
              return latestMovie ? (
                <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Film className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-gray-400">Latest Movie</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2 line-clamp-2">{latestMovie.title}</h4>
                  {latestMovie.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-gray-300">{latestMovie.rating}/5</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No movies yet</p>
                </div>
              )
            })()}

            {/* Current Shows */}
            {(() => {
              const watchingShows = entries
                .filter(e => e.media_type === 'show' && e.status === 'in-progress')
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              
              const latestShow = watchingShows.length === 0 && entries
                .filter(e => e.media_type === 'show' && e.status === 'completed')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              
              return watchingShows.length > 0 ? (
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tv className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">Watching</span>
                  </div>
                  <div className="space-y-2">
                    {watchingShows.map((show, idx) => (
                      <div key={show.id}>
                        <h4 className="font-semibold text-white text-sm line-clamp-1">{show.title}</h4>
                        {show.rating && (
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-gray-300">{show.rating}/5</span>
                          </div>
                        )}
                        {idx < watchingShows.length - 1 && (
                          <div className="border-t border-purple-500/20 my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : latestShow ? (
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tv className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">Latest Show</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2 line-clamp-2">{latestShow.title}</h4>
                  {latestShow.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-gray-300">{latestShow.rating}/5</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No shows yet</p>
                </div>
              )
            })()}

            {/* Current Games */}
            {(() => {
              const playingGames = entries
                .filter(e => e.media_type === 'game' && e.status === 'in-progress')
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              
              const latestGame = playingGames.length === 0 && entries
                .filter(e => e.media_type === 'game' && (e.status === 'completed' || e.status === 'in-progress'))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              
              return playingGames.length > 0 ? (
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Gamepad2 className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Playing</span>
                  </div>
                  <div className="space-y-2">
                    {playingGames.map((game, idx) => (
                      <div key={game.id}>
                        <h4 className="font-semibold text-white text-sm line-clamp-1">{game.title}</h4>
                        {game.rating && (
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-gray-300">{game.rating}/5</span>
                          </div>
                        )}
                        {idx < playingGames.length - 1 && (
                          <div className="border-t border-blue-500/20 my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : latestGame ? (
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Gamepad2 className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Latest Game</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2 line-clamp-2">{latestGame.title}</h4>
                  <div className="flex items-center gap-2 text-sm">
                    {latestGame.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-gray-300">{latestGame.rating}/5</span>
                      </div>
                    )}
                    {latestGame.status === 'in-progress' && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No games yet</p>
                </div>
              )
            })()}

            {/* Current Books */}
            {(() => {
              const readingBooks = entries
                .filter(e => e.media_type === 'book' && e.status === 'in-progress')
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              
              const latestBook = readingBooks.length === 0 && entries
                .filter(e => e.media_type === 'book' && e.status === 'completed')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              
              return readingBooks.length > 0 ? (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Book className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-400">Reading</span>
                  </div>
                  <div className="space-y-2">
                    {readingBooks.map((book, idx) => (
                      <div key={book.id}>
                        <h4 className="font-semibold text-white text-sm line-clamp-1">{book.title}</h4>
                        {book.rating && (
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-gray-300">{book.rating}/5</span>
                          </div>
                        )}
                        {idx < readingBooks.length - 1 && (
                          <div className="border-t border-green-500/20 my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : latestBook ? (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Book className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-400">Latest Book</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2 line-clamp-2">{latestBook.title}</h4>
                  {latestBook.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-gray-300">{latestBook.rating}/5</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No books yet</p>
                </div>
              )
            })()}
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

          {/* View Library Button */}
          <button
            onClick={() => navigate('/library')}
            className="w-full bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-xl p-4 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Book className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-gray-300 group-hover:text-white font-medium transition-colors">View Your Library</span>
            </div>
            <span className="text-gray-500 group-hover:text-gray-300 transition-colors">→</span>
          </button>

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

      {/* Logout Button */}
      <div className="mt-8 pb-24 md:pb-8">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/50 text-gray-400 hover:text-red-400 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}

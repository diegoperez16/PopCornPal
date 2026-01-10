import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Shield, Plus, Edit2, Trash2, Gift, X, Sparkles, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GifPicker from '../components/GifPicker'

interface Badge {
  id: string
  name: string
  description: string | null
  color: string
  gif_url: string | null
  admin_only: boolean
  opacity: number
}

interface BadgeUser {
  id: string
  username: string
  avatar_url: string | null
}

export default function AdminBadgePanel() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [badges, setBadges] = useState<Badge[]>([])
  const [badgeUsers, setBadgeUsers] = useState<Record<string, BadgeUser[]>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showGiveModal, setShowGiveModal] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const [showUsersModal, setShowUsersModal] = useState(false)
  
  // Form states
  const [badgeName, setBadgeName] = useState('')
  const [badgeDescription, setBadgeDescription] = useState('')
  const [badgeColor, setBadgeColor] = useState('purple-500')
  const [badgeGifUrl, setBadgeGifUrl] = useState('')
  const [badgeOpacity, setBadgeOpacity] = useState(80)
  const [adminOnly, setAdminOnly] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  
  // Give badge states
  const [searchUsername, setSearchUsername] = useState('')
  const [foundUser, setFoundUser] = useState<any>(null)
  const [givingBadge, setGivingBadge] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    
    checkAdminStatus()
    fetchBadges()
    fetchAllBadgeUsers()
  }, [user, navigate])

  const checkAdminStatus = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (data?.is_admin) {
      setIsAdmin(true)
    } else {
      navigate('/') // Redirect non-admins
    }
    setLoading(false)
  }

  const fetchBadges = async () => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('admin_only', { ascending: false })
      .order('name')
    
    if (data) setBadges(data)
  }

  const fetchAllBadgeUsers = async () => {
    const { data } = await supabase
      .from('user_badges')
      .select(`
        badge_id,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
    
    if (data) {
      const usersByBadge: Record<string, BadgeUser[]> = {}
      data.forEach((item: any) => {
        if (item.profiles) {
          if (!usersByBadge[item.badge_id]) {
            usersByBadge[item.badge_id] = []
          }
          usersByBadge[item.badge_id].push(item.profiles)
        }
      })
      setBadgeUsers(usersByBadge)
    }
  }

  const handleCreateBadge = async () => {
    if (!badgeName.trim()) return
    
    const { error } = await supabase
      .from('badges')
      .insert({
        name: badgeName.trim(),
        description: badgeDescription.trim() || null,
        color: badgeColor,
        gif_url: badgeGifUrl.trim() || null,
        opacity: badgeOpacity,
        admin_only: adminOnly
      })
    
    if (!error) {
      setShowCreateModal(false)
      resetForm()
      fetchBadges()
    } else {
      alert('Error creating badge: ' + error.message)
    }
  }

  const handleUpdateBadge = async () => {
    if (!selectedBadge) return
    
    const { error } = await supabase
      .from('badges')
      .update({
        name: badgeName.trim(),
        description: badgeDescription.trim() || null,
        color: badgeColor,
        gif_url: badgeGifUrl.trim() || null,
        opacity: badgeOpacity,
        admin_only: adminOnly
      })
      .eq('id', selectedBadge.id)
    
    if (!error) {
      setShowCreateModal(false)
      setSelectedBadge(null)
      resetForm()
      fetchBadges()
    } else {
      alert('Error updating badge: ' + error.message)
    }
  }

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm('Are you sure? This will remove the badge from all users.')) return
    
    const { error } = await supabase
      .from('badges')
      .delete()
      .eq('id', badgeId)
    
    if (!error) {
      fetchBadges()
    } else {
      alert('Error deleting badge: ' + error.message)
    }
  }

  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return
    
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${searchUsername.trim()}%`)
      .limit(1)
      .single()
    
    if (data) {
      setFoundUser(data)
    } else {
      alert('User not found')
      setFoundUser(null)
    }
  }

  const handleGiveBadge = async () => {
    if (!selectedBadge || !foundUser || !user) return
    
    setGivingBadge(true)
    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: foundUser.id,
        badge_id: selectedBadge.id,
        given_by: user.id
      })
    
    if (!error) {
      alert(`Badge "${selectedBadge.name}" given to ${foundUser.username}!`)
      setShowGiveModal(false)
      setFoundUser(null)
      setSearchUsername('')
      setSelectedBadge(null)
      fetchAllBadgeUsers()
    } else {
      if (error.code === '23505') {
        alert('User already has this badge!')
      } else {
        alert('Error giving badge: ' + error.message)
      }
    }
    setGivingBadge(false)
  }

  const resetForm = () => {
    setBadgeName('')
    setBadgeDescription('')
    setBadgeColor('purple-500')
    setBadgeGifUrl('')
    setBadgeOpacity(80)
    setAdminOnly(false)
  }

  const openEditModal = (badge: Badge) => {
    setSelectedBadge(badge)
    setBadgeName(badge.name)
    setBadgeDescription(badge.description || '')
    setBadgeColor(badge.color)
    setBadgeGifUrl(badge.gif_url || '')
    setBadgeOpacity(badge.opacity || 80)
    setAdminOnly(badge.admin_only)
    setShowCreateModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 pb-24 md:pb-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl font-bold">Admin Badge Manager</h1>
          </div>
          <button
            onClick={() => {
              resetForm()
              setSelectedBadge(null)
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Badge
          </button>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all relative overflow-hidden"
            >
              {/* GIF Background */}
              {badge.gif_url && (
                <img
                  src={badge.gif_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
              )}
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium bg-${badge.color} text-white`}>
                        {badge.name}
                      </span>
                      {badge.admin_only && (
                        <span title="Admin Only">
                          <Shield className="w-4 h-4 text-purple-400" />
                        </span>
                      )}
                    </div>
                    {badge.description && (
                      <p className="text-xs text-gray-400 mt-2">{badge.description}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(badge)}
                      className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBadge(badge.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedBadge(badge)
                    setShowGiveModal(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <Gift className="w-4 h-4" />
                  Give to User
                </button>
                
                {/* View Users Button */}
                {badgeUsers[badge.id] && badgeUsers[badge.id].length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedBadge(badge)
                      setShowUsersModal(true)
                    }}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 px-3 py-2 rounded-lg transition-colors text-sm border border-purple-500/30"
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-xs">{badgeUsers[badge.id].length} user{badgeUsers[badge.id].length !== 1 ? 's' : ''}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-lg w-full p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                  {selectedBadge ? 'Edit Badge' : 'Create New Badge'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setSelectedBadge(null)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Badge Name</label>
                  <input
                    type="text"
                    value={badgeName}
                    onChange={(e) => setBadgeName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., OG"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (optional)</label>
                  <input
                    type="text"
                    value={badgeDescription}
                    onChange={(e) => setBadgeDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Original member"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { name: 'Purple', value: 'purple-500', class: 'bg-purple-500' },
                      { name: 'Blue', value: 'blue-500', class: 'bg-blue-500' },
                      { name: 'Green', value: 'green-500', class: 'bg-green-500' },
                      { name: 'Red', value: 'red-500', class: 'bg-red-500' },
                      { name: 'Yellow', value: 'yellow-500', class: 'bg-yellow-500' },
                      { name: 'Pink', value: 'pink-500', class: 'bg-pink-500' },
                      { name: 'Orange', value: 'orange-500', class: 'bg-orange-500' },
                      { name: 'Cyan', value: 'cyan-500', class: 'bg-cyan-500' },
                      { name: 'Lime', value: 'lime-500', class: 'bg-lime-500' },
                      { name: 'Rose', value: 'rose-500', class: 'bg-rose-500' },
                      { name: 'Indigo', value: 'indigo-500', class: 'bg-indigo-500' },
                      { name: 'Slate', value: 'slate-500', class: 'bg-slate-500' },
                      { name: 'Emerald', value: 'emerald-500', class: 'bg-emerald-500' },
                      { name: 'Teal', value: 'teal-500', class: 'bg-teal-500' },
                      { name: 'Sky', value: 'sky-500', class: 'bg-sky-500' },
                      { name: 'Violet', value: 'violet-500', class: 'bg-violet-500' },
                      { name: 'Fuchsia', value: 'fuchsia-500', class: 'bg-fuchsia-500' },
                      { name: 'Amber', value: 'amber-500', class: 'bg-amber-500' },
                    ].map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setBadgeColor(color.value)}
                        className={`h-10 rounded-lg ${color.class} hover:scale-110 transition-transform ${
                          badgeColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Selected: {badgeColor}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">GIF Background URL (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={badgeGifUrl}
                      onChange={(e) => setBadgeGifUrl(e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://media.giphy.com/..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowGifPicker(true)}
                      className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg transition-colors"
                    >
                      Browse GIFs
                    </button>
                  </div>
                  {badgeGifUrl && (
                    <div className="mt-2">
                      <img src={badgeGifUrl} alt="Preview" className="h-20 rounded-lg" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Opacity: {badgeOpacity}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={badgeOpacity}
                    onChange={(e) => setBadgeOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>10%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="adminOnly"
                    checked={adminOnly}
                    onChange={(e) => setAdminOnly(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="adminOnly" className="text-sm">
                    Admin Only (only you can give this badge)
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setSelectedBadge(null)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={selectedBadge ? handleUpdateBadge : handleCreateBadge}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    {selectedBadge ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Give Badge Modal */}
        {showGiveModal && selectedBadge && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Gift className="w-6 h-6 text-purple-500" />
                  Give Badge
                </h2>
                <button
                  onClick={() => {
                    setShowGiveModal(false)
                    setSelectedBadge(null)
                    setFoundUser(null)
                    setSearchUsername('')
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium bg-${selectedBadge.color} text-white`}>
                  {selectedBadge.name}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search Username</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter username"
                    />
                    <button
                      onClick={handleSearchUser}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {foundUser && (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {foundUser.avatar_url ? (
                          <img src={foundUser.avatar_url} alt="" className="w-full h-full rounded-full" />
                        ) : (
                          <span className="text-white font-bold">{foundUser.username[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">@{foundUser.username}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowGiveModal(false)
                      setSelectedBadge(null)
                      setFoundUser(null)
                      setSearchUsername('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGiveBadge}
                    disabled={!foundUser || givingBadge}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {givingBadge ? 'Giving...' : 'Give Badge'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GIF Picker Modal */}
        {showGifPicker && (
          <GifPicker
            onSelect={(gifUrl) => {
              setBadgeGifUrl(gifUrl)
              setShowGifPicker(false)
            }}
            onClose={() => setShowGifPicker(false)}
          />
        )}

        {/* Users Modal */}
        {showUsersModal && selectedBadge && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 border border-gray-700 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium bg-${selectedBadge.color} text-white`}>
                    {selectedBadge.name}
                  </span>
                </h2>
                <button
                  onClick={() => {
                    setShowUsersModal(false)
                    setSelectedBadge(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {badgeUsers[selectedBadge.id]?.map((user) => (
                  <div
                    key={user.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3 hover:border-gray-600 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{user.username[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowUsersModal(false)
                  setSelectedBadge(null)
                }}
                className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

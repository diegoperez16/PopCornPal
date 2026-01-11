import { useEffect, useState } from 'react'
import { supabase, type Badge } from '../lib/supabase'
import { Plus, X, Edit2, Trash2, Search, Users, Shield, Loader2, Sparkles, UserPlus, UserX, Save, ArrowUp, Check } from 'lucide-react'
import GifPicker from '../components/GifPicker'

type Profile = {
  id: string
  username: string
  avatar_url: string | null
}

// Define the shape of our form data to fix the "implicit any" error
type BadgeFormData = {
  name: string
  description: string
  color: string
  gif_url: string
  opacity: number
  admin_only: boolean
}

const BADGE_COLORS = [
  'purple-500', 'red-500', 'blue-500', 'green-500', 
  'yellow-500', 'pink-500', 'orange-500', 'cyan-500',
  'teal-500', 'indigo-500', 'rose-500', 'emerald-500'
]

export default function AdminBadges() {
  // Main Data
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  
  // --- STATE: SCROLL TO TOP ---
  const [showScrollTop, setShowScrollTop] = useState(false)

  // --- STATE: BADGE EDITOR (PERSISTED) ---
  // Lazy initialize from localStorage to restore state on refresh/resume
  const [isEditModalOpen, setIsEditModalOpen] = useState(() => localStorage.getItem('popcorn_admin_badge_modal_open') === 'true')
  
  const [editingBadge, setEditingBadge] = useState<Badge | null>(() => {
    const saved = localStorage.getItem('popcorn_admin_badge_editing_badge')
    return saved ? JSON.parse(saved) : null
  })

  // Explicitly typed useState<BadgeFormData> fixes the "prev implicitly any" error
  const [formData, setFormData] = useState<BadgeFormData>(() => {
    const saved = localStorage.getItem('popcorn_admin_badge_form_data')
    return saved ? JSON.parse(saved) : {
      name: '',
      description: '', 
      color: 'purple-500',
      gif_url: '',
      opacity: 80,
      admin_only: false
    }
  })

  const [saving, setSaving] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)

  // --- PERSISTENCE EFFECT ---
  // Save form state to localStorage whenever it changes while editing
  useEffect(() => {
    if (isEditModalOpen) {
      localStorage.setItem('popcorn_admin_badge_modal_open', 'true')
      localStorage.setItem('popcorn_admin_badge_form_data', JSON.stringify(formData))
      if (editingBadge) {
        localStorage.setItem('popcorn_admin_badge_editing_badge', JSON.stringify(editingBadge))
      } else {
        localStorage.removeItem('popcorn_admin_badge_editing_badge')
      }
    } else {
      // Clear storage when modal is closed (saved or canceled)
      localStorage.removeItem('popcorn_admin_badge_modal_open')
      localStorage.removeItem('popcorn_admin_badge_form_data')
      localStorage.removeItem('popcorn_admin_badge_editing_badge')
    }
  }, [isEditModalOpen, formData, editingBadge])

  // --- STATE: USER MANAGER ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const [badgeHolders, setBadgeHolders] = useState<any[]>([])
  const [loadingHolders, setLoadingHolders] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  useEffect(() => {
    fetchBadges()

    // Scroll listener
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 1. FETCH BADGES
  const fetchBadges = async () => {
    setLoading(true)
    const { data } = await supabase.from('badges').select('*').order('name')
    if (data) setBadges(data)
    setLoading(false)
  }

  // Scroll Handler
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 2. BADGE CRUD OPERATIONS
  const handleOpenEditModal = (badge?: Badge) => {
    if (badge) {
      setEditingBadge(badge)
      setFormData({
        name: badge.name,
        description: badge.description || '',
        color: badge.color,
        gif_url: badge.gif_url || '',
        opacity: badge.opacity || 80,
        admin_only: badge.admin_only || false
      })
    } else {
      setEditingBadge(null)
      setFormData({
        name: '',
        description: '',
        color: 'purple-500',
        gif_url: '',
        opacity: 80,
        admin_only: false
      })
    }
    setIsEditModalOpen(true)
  }

  const handleSaveBadge = async () => {
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        gif_url: formData.gif_url || null,
        opacity: formData.opacity,
        admin_only: formData.admin_only
      }

      if (editingBadge) {
        const { error } = await supabase.from('badges').update(payload).eq('id', editingBadge.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('badges').insert(payload)
        if (error) throw error
      }
      await fetchBadges()
      setIsEditModalOpen(false)
    } catch (error: any) {
      console.error('Error saving badge:', error)
      alert(`Error saving: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBadge = async (id: string) => {
    if (!confirm('Delete this badge? This will remove it from all users.')) return
    await supabase.from('badges').delete().eq('id', id)
    fetchBadges()
  }

  // 3. USER MANAGEMENT OPERATIONS
  const handleOpenUserModal = async (badge: Badge) => {
    setSelectedBadge(badge)
    setIsUserModalOpen(true)
    setUserSearchQuery('')
    setSearchResults([])
    fetchBadgeHolders(badge.id)
  }

  const fetchBadgeHolders = async (badgeId: string) => {
    setLoadingHolders(true)
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('*, profiles:user_id(username, avatar_url)')
        .eq('badge_id', badgeId)
      
      if (data) setBadgeHolders(data)
    } finally {
      setLoadingHolders(false)
    }
  }

  const searchUsers = async (query: string) => {
    setUserSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearchingUsers(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(5)
    
    if (data) setSearchResults(data)
    setSearchingUsers(false)
  }

  const assignBadge = async (userId: string) => {
    if (!selectedBadge) return
    
    if (badgeHolders.some(h => h.user_id === userId)) {
      alert('User already has this badge')
      return
    }

    try {
      const { error } = await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: selectedBadge.id,
      })
      if (error) throw error
      
      fetchBadgeHolders(selectedBadge.id)
      setUserSearchQuery('')
      setSearchResults([])
    } catch (error) {
      console.error('Error assigning badge:', error)
      alert('Failed to assign badge')
    }
  }

  const removeBadge = async (userId: string) => {
    if (!selectedBadge || !confirm('Remove badge from this user?')) return
    
    try {
      await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', userId)
        .eq('badge_id', selectedBadge.id)
      
      fetchBadgeHolders(selectedBadge.id)
    } catch (error) {
      console.error('Error removing badge:', error)
    }
  }

  return (
    <div className="p-6 pb-32 max-w-6xl mx-auto text-white relative min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          <Sparkles className="text-purple-500 w-8 h-8" />
          Badge Control
        </h1>
        <button
          onClick={() => handleOpenEditModal()}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-medium shadow-lg shadow-purple-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Create New Badge
        </button>
      </div>

      {/* BADGE GRID */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {badges.map((badge) => (
            <div key={badge.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 flex flex-col group hover:border-purple-500/30 transition-colors">
              {/* Badge Preview */}
              <div className="aspect-video bg-gray-900/50 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center border border-gray-700/50">
                {badge.gif_url ? (
                  <img src={badge.gif_url} alt="" className="w-full h-full object-cover" style={{ opacity: (badge.opacity || 80) / 100 }} />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br from-${badge.color.split('-')[0]}-600 to-${badge.color.split('-')[0]}-400 opacity-50`} />
                )}
                
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <span className="font-bold text-lg uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {badge.name}
                  </span>
                  {badge.admin_only && (
                    <span className="mt-1 px-2 py-0.5 bg-red-500/80 rounded text-[10px] font-bold uppercase flex items-center gap-1 shadow-sm">
                      <Shield className="w-3 h-3" /> Admin Only
                    </span>
                  )}
                </div>
              </div>

              {/* Badge Info */}
              {badge.description && (
                <p className="text-xs text-gray-400 mb-4 line-clamp-2 px-1">
                  {badge.description}
                </p>
              )}

              {/* Actions */}
              <div className="mt-auto grid grid-cols-3 gap-2">
                <button 
                  onClick={() => handleOpenUserModal(badge)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700/30 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
                  title="Manage Users"
                >
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">Users</span>
                </button>
                <button 
                  onClick={() => handleOpenEditModal(badge)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700/30 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-colors"
                  title="Edit Badge"
                >
                  <Edit2 className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">Edit</span>
                </button>
                <button 
                  onClick={() => handleDeleteBadge(badge.id)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700/30 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                  title="Delete Badge"
                >
                  <Trash2 className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- SCROLL TO TOP BUTTON --- */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-6 p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40 hover:scale-110 transition-all duration-300 z-40 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>

      {/* --- MODAL 1: CREATE / EDIT BADGE --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 pb-32 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              {editingBadge ? <Edit2 className="w-5 h-5 text-purple-500" /> : <Plus className="w-5 h-5 text-purple-500" />}
              {editingBadge ? 'Edit Badge' : 'Create New Badge'}
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Name</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  placeholder="e.g. Cinephile"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none h-20"
                  placeholder="Short description for this badge..."
                />
              </div>

              {/* IMPROVED VISUAL COLOR PICKER */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Color Theme</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {BADGE_COLORS.map((color) => {
                    const colorName = color.split('-')[0]
                    const isSelected = formData.color === color
                    return (
                      <button
                        key={color}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`
                          w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center relative
                          bg-${colorName}-500 hover:scale-110
                          ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:opacity-80'}
                        `}
                        title={color}
                        type="button"
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Visuals</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={formData.gif_url}
                      onChange={e => setFormData(prev => ({ ...prev, gif_url: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-purple-500 transition-all"
                      placeholder="GIF URL (or search →)"
                    />
                    <Sparkles className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                  </div>
                  <button
                    onClick={() => setShowGifPicker(true)}
                    className="px-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/50 rounded-xl transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {formData.gif_url && (
                <div className="rounded-xl overflow-hidden border border-gray-700 relative h-32 bg-black/50">
                  <img src={formData.gif_url} className="w-full h-full object-cover" style={{ opacity: formData.opacity / 100 }} alt="Preview" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-black/60 px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-sm">Preview</span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Opacity</label>
                  <span className="text-xs text-purple-400 font-bold">{formData.opacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={formData.opacity}
                  onChange={e => setFormData(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <input
                  type="checkbox"
                  id="adminOnly"
                  checked={formData.admin_only}
                  onChange={e => setFormData(prev => ({ ...prev, admin_only: e.target.checked }))}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                />
                <label htmlFor="adminOnly" className="text-sm text-gray-300 select-none cursor-pointer flex-1">
                  <span className="block font-medium text-white">Admin Exclusive</span>
                  <span className="block text-xs text-gray-500">Only admins can assign this badge (e.g. Special Events)</span>
                </label>
              </div>

              <button
                onClick={handleSaveBadge}
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-3.5 rounded-xl font-bold text-white shadow-lg shadow-purple-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: MANAGE USERS --- */}
      {isUserModalOpen && selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 pb-24 relative shadow-2xl flex flex-col max-h-[85vh]">
            <button
              onClick={() => setIsUserModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-blue-400" />
                Manage Users
              </h2>
              <p className="text-sm text-gray-400">
                Assigning: <span className="text-white font-medium">{selectedBadge.name}</span>
              </p>
            </div>

            {/* Give Badge Section (Search) */}
            <div className="mb-6 relative">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Give Badge to User</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:border-blue-500 outline-none placeholder-gray-500"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {(searchResults.length > 0 || searchingUsers) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-20">
                  {searchingUsers ? (
                    <div className="p-3 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                    </div>
                  ) : (
                    searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => assignBadge(user.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                              {user.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{user.username}</span>
                        <div className="ml-auto flex items-center gap-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <UserPlus className="w-4 h-4" />
                          <span className="text-xs font-bold">Give</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Current Holders List */}
            <div className="flex-1 overflow-y-auto min-h-[200px] border-t border-gray-800 pt-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Current Holders ({badgeHolders.length})
              </h3>
              
              {loadingHolders ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  <span className="text-xs">Loading users...</span>
                </div>
              ) : badgeHolders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic text-sm">
                  No users have this badge yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {badgeHolders.map((holder) => (
                    <div key={holder.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/30">
                      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                         {holder.profiles?.avatar_url ? (
                            <img src={holder.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                              {holder.profiles?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {holder.profiles?.username || 'Unknown User'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Assigned: {new Date(holder.assigned_at || holder.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => removeBadge(holder.user_id)}
                        className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove Badge"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- GIF PICKER OVERLAY --- */}
      {showGifPicker && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowGifPicker(false)}
        >
          <div 
            className="w-full max-w-lg mx-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <GifPicker
              onSelect={(url) => {
                setFormData(prev => ({ ...prev, gif_url: url }))
                setShowGifPicker(false)
              }}
              onClose={() => setShowGifPicker(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
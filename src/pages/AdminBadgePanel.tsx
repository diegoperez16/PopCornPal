import { useEffect, useState } from 'react'
import { supabase, type Badge } from '../lib/supabase'
import { Plus, Edit2, Trash2, Search, Users, Shield, Loader2, UserPlus, UserX, Save, ArrowUp, Check } from 'lucide-react'
import GifPicker from '../components/GifPicker'
import Sheet from '../components/Sheet'

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

// Badge colours live in the DB as Tailwind hue names; the classes they used to
// build never compiled, so they resolve to real values here instead.
const BADGE_COLOR_HEX: Record<string, string> = {
  'purple-500': '#a855f7', 'red-500': '#ef4444', 'blue-500': '#3b82f6', 'green-500': '#22c55e',
  'yellow-500': '#eab308', 'pink-500': '#ec4899', 'orange-500': '#f97316', 'cyan-500': '#06b6d4',
  'teal-500': '#14b8a6', 'indigo-500': '#6366f1', 'rose-500': '#f43f5e', 'emerald-500': '#10b981',
}
const badgeHex = (color: string) => BADGE_COLOR_HEX[color] ?? '#6b7c8c'

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
    <div className="app-page">
      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="app-title">Badge control<span className="text-accent-soft">.</span></h1>
          <button
            type="button"
            onClick={() => handleOpenEditModal()}
            className="app-button-primary"
          >
            <Plus size={18} /> Create new badge
          </button>
        </header>

        {/* BADGE GRID */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 motion-safe:animate-pulse" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="app-panel rounded-2xl p-4">
                <div className="aspect-video rounded-xl bg-surface-strong mb-4" />
                <div className="h-3 w-3/4 rounded-full bg-surface-strong mb-4" />
                <div className="h-11 rounded-xl bg-surface-strong" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div key={badge.id} className="app-panel rounded-2xl p-4 flex flex-col">
                {/* Badge Preview */}
                <div className="aspect-video rounded-xl mb-4 overflow-hidden relative flex items-center justify-center border border-line-soft bg-surface-sunken">
                  {badge.gif_url ? (
                    <img loading="lazy" decoding="async" src={badge.gif_url} alt="" className="w-full h-full object-cover" style={{ opacity: (badge.opacity || 80) / 100 }} />
                  ) : (
                    <div className="w-full h-full opacity-50" style={{ background: badgeHex(badge.color) }} />
                  )}

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center">
                    <span className="text-lg font-semibold text-gray-50 drop-shadow-md">
                      {badge.name}
                    </span>
                    {badge.admin_only && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-bright">
                        <Shield size={12} /> Admin only
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge Info */}
                {badge.description && (
                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {badge.description}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-auto grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenUserModal(badge)}
                    className="app-button-ghost app-button-sm !px-2"
                  >
                    <Users size={16} /> Users
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(badge)}
                    className="app-button-ghost app-button-sm !px-2"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBadge(badge.id)}
                    className="app-button-ghost app-button-sm !px-2 hover:text-danger"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- SCROLL TO TOP BUTTON --- */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
        className={`fixed bottom-24 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line-soft bg-surface-strong text-gray-50 shadow-lg shadow-black/30 transition-opacity duration-200 ${
          showScrollTop ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowUp size={20} />
      </button>

      {/* --- MODAL 1: CREATE / EDIT BADGE --- */}
      {isEditModalOpen && (
        <Sheet
          title={editingBadge ? 'Edit badge' : 'Create a badge'}
          onClose={() => setIsEditModalOpen(false)}
          closeDisabled={saving}
          footer={
            <button
              type="button"
              onClick={handleSaveBadge}
              disabled={saving}
              className="app-button-primary w-full"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save changes
            </button>
          }
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="badgeName" className="app-label">Name</label>
              <input
                id="badgeName"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="app-input"
                placeholder="e.g. Cinephile"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="badgeDescription" className="app-label">Description</label>
              <textarea
                id="badgeDescription"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="app-textarea"
                placeholder="Short description for this badge…"
              />
            </div>

            <fieldset>
              <legend className="app-label">Color</legend>
              <div className="flex flex-wrap gap-2">
                {BADGE_COLORS.map((color) => {
                  const isSelected = formData.color === color
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      aria-label={color.split('-')[0]}
                      aria-pressed={isSelected}
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        isSelected ? 'ring-2 ring-offset-2 ring-offset-surface ring-butter-400' : ''
                      }`}
                      style={{ background: badgeHex(color) }}
                    >
                      {isSelected && <Check size={18} className="text-gray-50 drop-shadow-md" />}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="badgeGif" className="app-label">GIF <small>paste a URL or search Giphy</small></label>
              <div className="flex gap-2">
                <input
                  id="badgeGif"
                  value={formData.gif_url}
                  onChange={e => setFormData(prev => ({ ...prev, gif_url: e.target.value }))}
                  className="app-input"
                  placeholder="https://…"
                  inputMode="url"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowGifPicker(true)}
                  aria-label="Search GIFs"
                  className="app-button-secondary app-button-sm flex-shrink-0 !px-3"
                >
                  <Search size={18} />
                </button>
              </div>
            </div>

            {formData.gif_url && (
              <div className="relative h-32 overflow-hidden rounded-xl border border-line-soft bg-surface-sunken">
                <img loading="lazy" decoding="async" src={formData.gif_url} className="w-full h-full object-cover" style={{ opacity: formData.opacity / 100 }} alt="Preview" />
              </div>
            )}

            <div>
              <label htmlFor="badgeOpacity" className="app-label flex items-center justify-between">
                Opacity
                <span className="text-sm font-normal text-muted tabular-nums">{formData.opacity}%</span>
              </label>
              <input
                id="badgeOpacity"
                type="range"
                min="10"
                max="100"
                value={formData.opacity}
                onChange={e => setFormData(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                className="w-full min-h-11 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface-sunken p-3">
              <input
                type="checkbox"
                id="adminOnly"
                checked={formData.admin_only}
                onChange={e => setFormData(prev => ({ ...prev, admin_only: e.target.checked }))}
                className="h-5 w-5 flex-shrink-0 rounded"
              />
              <label htmlFor="adminOnly" className="flex min-h-11 flex-1 cursor-pointer select-none flex-col justify-center">
                <span className="block text-sm font-semibold text-gray-50">Admin exclusive</span>
                <span className="block text-xs text-muted">Only admins can assign this badge (e.g. special events)</span>
              </label>
            </div>
          </div>
        </Sheet>
      )}

      {/* --- MODAL 2: MANAGE USERS --- */}
      {isUserModalOpen && selectedBadge && (
        <Sheet title="Manage users" onClose={() => setIsUserModalOpen(false)}>
          <p className="mb-5 text-sm text-muted">
            Assigning <span className="font-semibold text-gray-50">{selectedBadge.name}</span>
          </p>

          {/* Give Badge Section (Search) */}
          <div className="mb-6">
            <label htmlFor="badgeUserSearch" className="app-label">Give this badge to someone</label>
            <div className="app-search">
              <Search size={18} />
              <input
                id="badgeUserSearch"
                type="search"
                value={userSearchQuery}
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="Search by username…"
                autoComplete="off"
                enterKeyHint="search"
                className="app-input"
              />
            </div>

            {/* Search Results */}
            {(searchResults.length > 0 || searchingUsers) && (
              <div className="mt-2 overflow-hidden rounded-xl border border-line-soft bg-surface-strong divide-y divide-line-soft">
                {searchingUsers ? (
                  <p role="status" className="flex min-h-12 items-center justify-center gap-2 px-3 text-sm text-muted">
                    <Loader2 size={16} className="animate-spin" /> Searching…
                  </p>
                ) : (
                  searchResults.map(user => (
                    <div key={user.id} className="flex min-h-12 items-center gap-3 pl-3 pr-1">
                      <span className="app-avatar h-8 w-8 text-xs">
                        {user.avatar_url ? (
                          <img loading="lazy" decoding="async" src={user.avatar_url} alt="" />
                        ) : (
                          user.username[0].toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-50">{user.username}</span>
                      <button
                        type="button"
                        onClick={() => assignBadge(user.id)}
                        className="app-button-ghost app-button-sm text-accent-soft"
                      >
                        <UserPlus size={16} /> Give
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Current Holders List */}
          <div className="border-t border-line-soft pt-4">
            <h3 className="app-h2 mb-3">
              Current holders <span className="font-normal text-muted tabular-nums">({badgeHolders.length})</span>
            </h3>

            {loadingHolders ? (
              <div className="space-y-2 motion-safe:animate-pulse" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-surface-strong" />
                ))}
              </div>
            ) : badgeHolders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No one has this badge yet.
              </p>
            ) : (
              <div className="space-y-2">
                {badgeHolders.map((holder) => (
                  <div key={holder.id} className="app-panel rounded-xl p-3 flex items-center gap-3">
                    <span className="app-avatar h-8 w-8 text-xs">
                      {holder.profiles?.avatar_url ? (
                        <img loading="lazy" decoding="async" src={holder.profiles.avatar_url} alt="" />
                      ) : (
                        holder.profiles?.username?.[0]?.toUpperCase() || '?'
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-50">
                        {holder.profiles?.username || 'Unknown user'}
                      </p>
                      <p className="text-xs text-muted">
                        Assigned {new Date(holder.assigned_at || holder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBadge(holder.user_id)}
                      aria-label="Remove badge from user"
                      className="app-icon-button -mr-1 hover:text-danger"
                    >
                      <UserX size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* --- GIF PICKER --- */}
      {showGifPicker && (
        <GifPicker
          onSelect={(url) => {
            setFormData(prev => ({ ...prev, gif_url: url }))
            setShowGifPicker(false)
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </div>
  )
}

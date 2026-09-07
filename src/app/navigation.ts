import { House, Compass, Plus, LibraryBig, UserRound } from 'lucide-react'

// One destination model keeps phone and desktop navigation in sync.
export const navigation = [
  { path: '/feed', Icon: House, label: 'Home' },
  { path: '/people', Icon: Compass, label: 'People' },
  { path: '/add', Icon: Plus, label: 'Log' },
  { path: '/library', Icon: LibraryBig, label: 'Library' },
  { path: '/profile', Icon: UserRound, label: 'You' },
] as const

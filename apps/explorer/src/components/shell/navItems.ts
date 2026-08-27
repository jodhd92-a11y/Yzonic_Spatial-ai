import type { LucideIcon } from 'lucide-react'
import { Camera, MessageSquare, BarChart3 } from 'lucide-react'
import type { PageId } from '@/store/useAppStore'

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
}

// Reference and History have been removed from the app entirely — they
// were placeholder "coming soon" sections with no real backend, and
// product decided not to ship them.
export const navItems: NavItem[] = [
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export const primaryNavIds: PageId[] = ['camera', 'chat']
export const primaryNavItems = navItems.filter((item) => primaryNavIds.includes(item.id))

// Trimmed list shown in the sidebar's main nav (desktop rail + mobile drawer).
// Analytics stays out of the sidebar per product decision.
const sidebarHiddenIds: PageId[] = ['analytics']
export const sidebarNavItems = navItems.filter((item) => !sidebarHiddenIds.includes(item.id))
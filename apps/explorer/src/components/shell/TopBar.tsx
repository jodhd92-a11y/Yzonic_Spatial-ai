'use client'

import { PanelLeft, Aperture } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const PAGE_LABELS: Record<string, string> = {
  camera: 'Camera',
  chat: 'Chat',
  analytics: 'Analytics',
  profile: 'Profile',
}

export function TopBar() {
  const openSidebar = useAppStore((s) => s.openSidebar)
  const activePage = useAppStore((s) => s.activePage)

  return (
    // Enterprise glass header — the same frosted-glass material language
    // (--lg-* tokens) as the Studio editor and bottom nav, but theme-aware
    // (unlike the bottom nav's deliberately-fixed-dark material) since
    // this bar renders on every page and breakpoint, including desktop
    // where the person may be in light mode.
    <header
      className="sp-topbar-glass fixed top-0 left-0 right-0 lg:left-[var(--sp-sidebar-w)] z-20 flex items-center px-3 transition-[left] duration-300 ease-out"
      style={{ height: 'var(--sp-topbar-h)', paddingTop: 'var(--sp-safe-top)' }}
    >
      {/* Left slot — fixed width so the center stays perfectly centered */}
      <div className="w-10 flex items-center justify-start shrink-0">
        <button
          onClick={openSidebar}
          className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
          aria-label="Open navigation"
        >
          {/* Same PanelLeft glyph the desktop rail uses for its own
              expand/collapse toggle — one consistent sidebar-toggle icon
              across breakpoints instead of a hamburger here and PanelLeft
              there. */}
          <PanelLeft size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Center — a small brand mark + the current section's name, set in
          the display face at a size/weight/tracking that reads as a
          proper wordmark (title case, tight tracking, full-strength
          color) rather than a small dim eyebrow label. */}
      <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
        <span
          className="flex w-6 h-6 rounded-full items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(155deg, rgba(var(--sp-primary-rgb),0.22), rgba(var(--sp-accent-rgb),0.22))', border: '1px solid rgba(var(--sp-primary-rgb),0.3)' }}
          aria-hidden
        >
          <Aperture size={12} style={{ color: 'var(--sp-primary)' }} />
        </span>
        <span
          className="font-[family-name:var(--font-auth-serif)] text-[20px] tracking-[0.05em] text-[var(--sp-text)] truncate"
          style={{ WebkitTextStroke: '0.4px var(--sp-text)' }}
        >
          {PAGE_LABELS[activePage] ?? activePage}
        </span>
      </div>

      {/* Right slot — kept as an equal-width spacer (the new-scan action
          that used to live here is gone) so the center wordmark stays
          exactly centered rather than drifting toward the sidebar toggle. */}
      <div className="w-10 shrink-0" aria-hidden />
    </header>
  )
}

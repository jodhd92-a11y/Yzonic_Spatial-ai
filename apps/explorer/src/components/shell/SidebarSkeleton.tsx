'use client'

import { LogoBadge } from '@/components/ui/LogoMark'
import { sidebarNavItems } from './navItems'

/**
 * Loading placeholder for SidebarContent, shaped like the real thing —
 * header, "New scan" + search row, nav items, a "Recent" list of rows —
 * so there's no layout jump when the persisted store (recent scans,
 * collapsed state, etc.) finishes rehydrating from localStorage and the
 * real content swaps in.
 *
 * Brand mark and static chrome (logo, "New scan" button shape, nav item
 * icons/labels) render for real here since they don't depend on any
 * async data — only the genuinely dynamic bits (row content, timestamps)
 * are shimmer blocks. Session/profile loading already has its own
 * skeleton in ProfileMenu, so this doesn't duplicate that footer.
 */
export function SidebarSkeleton({
  collapsed,
  onCloseMobile,
}: {
  collapsed: boolean
  onCloseMobile?: () => void
}) {
  const showLabels = !collapsed || !!onCloseMobile

  return (
    <div className="flex flex-col h-full" role="status" aria-label="Loading sidebar">
      {/* Header — real brand mark, no shimmer needed */}
      <div className="relative flex items-center h-[52px] shrink-0 px-2.5 gap-2.5">
        <span className="shrink-0" aria-hidden="true">
          <LogoBadge size={32} />
        </span>
        {showLabels && (
          <span className="font-heading text-[15px] font-bold tracking-tight text-[var(--sp-text)] whitespace-nowrap overflow-hidden">
            Spatial AI
          </span>
        )}
        {showLabels && <div className="ml-auto w-8 h-8 rounded-lg border border-[var(--sp-border)] shrink-0" />}
      </div>

      {/* New scan + search row — static shape */}
      <div className="shrink-0 pt-6 pb-3 px-2 flex items-center gap-1.5">
        <div className={['h-[42px] rounded-xl sp-skeleton-row border border-[var(--sp-border)]', showLabels ? 'flex-1' : 'w-[42px]'].join(' ')} />
        {showLabels && <div className="shrink-0 w-[42px] h-[42px] rounded-xl sp-skeleton-row border border-[var(--sp-border)]" />}
      </div>

      {/* Nav items — same count/shape as the real "Products" group */}
      <div className="shrink-0 pt-1 pb-2 px-2 flex flex-col gap-1">
        {sidebarNavItems.map((item) => (
          <div key={item.id} className="h-9 rounded-lg flex items-center gap-2.5 px-2.5">
            <div className="w-[18px] h-[18px] rounded-md sp-skeleton-row shrink-0" />
            {showLabels && <div className="h-2.5 w-16 rounded-full sp-skeleton-row" />}
          </div>
        ))}
      </div>

      {/* Recent list — a handful of row placeholders, only in expanded
          view (collapsed rail hides this section in the real sidebar too) */}
      {showLabels && (
        <div className="flex-1 min-h-0 flex flex-col mt-1 pt-3 border-t border-[var(--sp-border)] px-2.5">
          <div className="h-2 w-14 rounded-full sp-skeleton-row mb-3" />
          <div className="flex flex-col gap-2">
            {[92, 68, 84, 56, 76].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 px-1 py-1.5">
                <div className="w-6 h-6 rounded-md sp-skeleton-row shrink-0" />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="h-2.5 rounded-full sp-skeleton-row" style={{ width: `${w}%` }} />
                  <div className="h-2 w-10 rounded-full sp-skeleton-row opacity-70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {collapsed && !onCloseMobile && <div className="flex-1" />}

      {/* Footer — matches ProfileMenu's own "still resolving" skeleton so
          the two loading states (store hydration, session load) look like
          one continuous thing rather than two different treatments. */}
      <div className="px-2 pb-2 pt-1 border-t border-[var(--sp-border)] shrink-0">
        <div className="flex items-center gap-3 rounded-xl py-2 pl-3 pr-3">
          <div className="w-7 h-7 rounded-full sp-skeleton-row shrink-0" />
          {showLabels && <div className="h-3 w-24 rounded-full sp-skeleton-row" />}
        </div>
      </div>
    </div>
  )
}

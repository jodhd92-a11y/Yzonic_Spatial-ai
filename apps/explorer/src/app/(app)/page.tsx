'use client'

import { useAppStore } from '@/store/useAppStore'
import { CameraFeed } from '@/components/camera/CameraFeed'
import { ChatEmbed } from '@/components/chat/ChatEmbed'

// Page switching is client-state driven (see useAppStore's `activePage`),
// not per-route — Sidebar/BottomNav call `setPage`, not `router.push`.
// Camera (React) and Chat (Vue, via iframe) are the two fully-built
// sections; the rest render a lightweight placeholder for now.
export default function Home() {
  const activePage = useAppStore((s) => s.activePage)

  switch (activePage) {
    case 'camera':
      return <CameraFeed />
    case 'chat':
      return <ChatEmbed />
    default: {
      // Analytics/Profile land here until their backends are wired up —
      // copy stays specific to what each will actually hold (clinical/
      // biotech context) rather than a generic page name. Reference and
      // History have been removed entirely (see navItems.ts).
      const COMING_SOON: Partial<Record<typeof activePage, string>> = {
        analytics: 'Documentation analytics — coming soon',
        profile: 'Profile — coming soon',
      }
      return (
        <div className="flex h-[60vh] items-center justify-center text-[var(--sp-text-faint)] text-sm text-center px-6">
          {COMING_SOON[activePage] ?? `${activePage.charAt(0).toUpperCase() + activePage.slice(1)} — coming soon`}
        </div>
      )
    }
  }
}

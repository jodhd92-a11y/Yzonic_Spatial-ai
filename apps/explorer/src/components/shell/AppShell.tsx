'use client'

import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { ThemeEffect } from './ThemeEffect'
import { ScanViewerModal } from './ScanViewerModal'
import { ExitConfirmModal } from './ExitConfirmModal'
import { useAppStore, useHydrateAppStore } from '@/store/useAppStore'
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from '@/lib/layout'
import { AnnouncementBillboard } from '@/components/announcement/AnnouncementBillboard'
import { TourGuide } from '@/components/onboarding/TourGuide'
import { ShortcutsModal } from '@/components/onboarding/ShortcutsModal'
import { SettingsModal } from '@/components/onboarding/SettingsModal'
import { useLoadCurrentUser } from '@/hooks/useCurrentUser'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { useBackButtonGuard } from '@/hooks/useBackButtonGuard'

export function AppShell({ children }: { children: React.ReactNode }) {
  // Rehydrates persisted store state (settings, scan/chat history, the
  // sidebar's collapsed flag, etc.) from localStorage after mount, so the
  // client's first render matches the server's before-hydration render.
  // See the comment on `useHydrateAppStore` in useAppStore.ts. Components
  // that gate real device behavior (e.g. CameraFeed's camera auto-start)
  // on `settingsHydrated` react to it via a dependency array, so they pick
  // up the persisted value correctly whenever rehydration finishes.
  useHydrateAppStore()
  useLoadCurrentUser()
  useGlobalShortcuts()
  // Native-app-style back button: from anywhere else it jumps to camera
  // (home); from camera it asks to exit. Also what keeps the back button
  // from ever being able to land back on /login for someone already
  // signed in — it never lets the browser actually move through history.
  useBackButtonGuard()
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const activePage = useAppStore((s) => s.activePage)

  // First-run product tour is triggered from CameraFeed once the camera
  // actually comes online (see its `maybeStartTour` effect) — not on a
  // generic app-load timer — so it's shown exactly when the person
  // enables the camera. Replayable anytime via the profile menu's
  // "Take the tour" entry.

  // Chat (apps/chat, embedded via iframe) ships its own full chrome — a
  // topbar (conversation title, theme toggle, "new chat") *and* a sidebar
  // (its own nav + conversation list). Rendering the host's Sidebar/TopBar
  // alongside that duplicates both, so both are suppressed for this page
  // and the iframe gets the full viewport. Every other page still gets the
  // host chrome.
  const showHostChrome = activePage !== 'chat'

  return (
    <div
      id="sp-app-viewport"
      className="min-h-screen bg-[var(--sp-bg-0)] text-[var(--sp-text)]"
      style={{
        '--sp-sidebar-w': sidebarCollapsed ? `${SIDEBAR_WIDTH_COLLAPSED}px` : `${SIDEBAR_WIDTH}px`,
      } as React.CSSProperties}
    >
      <ThemeEffect />
      {showHostChrome && <Sidebar />}
      {showHostChrome && <TopBar />}

      <main
        className={[
          showHostChrome ? 'lg:pl-[var(--sp-sidebar-w)]' : '',
          'pb-[calc(var(--sp-bottomnav-h)+var(--sp-safe-bottom))] lg:pb-0 transition-[padding-left] duration-300 ease-out',
        ].join(' ')}
        style={{ paddingTop: showHostChrome ? 'calc(var(--sp-topbar-h) + var(--sp-safe-top))' : 'var(--sp-safe-top)' }}
      >
        {children}
      </main>

      <BottomNav />
      <ScanViewerModal />
      <ExitConfirmModal />
      <AnnouncementBillboard />
      <TourGuide />
      <ShortcutsModal />
      <SettingsModal />
    </div>
  )
}
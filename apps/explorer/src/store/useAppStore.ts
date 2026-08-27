import { useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { onboardingLog } from '@/lib/onboarding-debug'

export type PageId =
  | 'camera'
  | 'chat'
  | 'analytics'
  | 'profile'

export interface AIModel {
  id: string
  name: string
  vendor: string
  avatar: string
}

const MODELS: AIModel[] = [{ id: 'nexus-1', name: 'Nexus 1.0', vendor: 'Nexus', avatar: 'N' }]

export interface ChatSession {
  id: string
  title: string
  /**
   * Epoch ms the chat was created. This is the source of truth for display —
   * the sidebar formats it live via `useRelativeTime`, so "2m ago" keeps
   * ticking forward on its own instead of being frozen text.
   */
  createdAt: number
  pinned?: boolean
  starred?: boolean
  /** 'scan' rows open the scan viewer instead of navigating into chat. */
  kind?: 'chat' | 'scan'
  /** Data-URL thumbnail captured from the video feed at scan time. */
  thumbnail?: string
}

/** A scan the person chose to "Chat about" — read once by ChatEmbed and
 * forwarded into the Vue chat app over postMessage, then cleared. Carries
 * the clinical context gathered on the camera side (template, case ID,
 * body site, modality, notes) so the chat opens already knowing what kind
 * of case it's looking at, instead of the person having to retype it. */
export interface PendingChatSeed {
  label: string
  thumbnail?: string
  templateLabel?: string
  caseInfo?: {
    caseId?: string
    bodySite?: string
    modality?: string
    notes?: string
  }
}

// No seeded/mock history — the sidebar's Recent list should only ever
// reflect chats the person actually started (via `startNewChat`), not
// placeholder conversations that were never real.
const INITIAL_CHATS: ChatSession[] = []

export type ScanCategory = 'clinical' | 'surgical' | 'laboratory' | 'imaging' | 'safety'

export interface ScanTemplate {
  id: string
  label: string
  description: string
  category: ScanCategory
}

// Scan templates shape what the AI Lens looks for. This app is a clinical
// and biotech documentation tool ONLY — every template maps to a real
// bedside, OR, lab-bench, or research workflow. There is no general-purpose
// / consumer template (no "code reader", no "shopping finder") because this
// product is scoped exclusively to doctors, surgeons, medical students,
// scientists, and researchers.
//
// Templates drive DetectionCard copy and hand PhotoCustomizePanel a
// `clinicalModality` hint (see ModalityPicker) so the customize panel opens
// on the right preset and case-info defaults for the workflow the user
// picked — a wound photo and a gel/blot photo need different presets,
// scale-bar defaults, and export metadata.
export const SCAN_TEMPLATES: ScanTemplate[] = [
  // --- Bedside / clinical -------------------------------------------------
  { id: 'wound', label: 'Wound Care', description: 'Wound & tissue documentation, sized to a scale reference', category: 'clinical' },
  { id: 'dermatology', label: 'Dermatology', description: 'Lesion & skin documentation with tone-accurate color', category: 'clinical' },
  { id: 'monitor', label: 'Vitals & Monitor', description: 'Reads bedside monitor & device displays — HR, SpO2, BP, EKG strips', category: 'clinical' },
  { id: 'medlabel', label: 'Medication / Label Check', description: 'Verifies drug name, dose, concentration & expiry before administration', category: 'clinical' },
  { id: 'idcheck', label: 'Patient ID Verification', description: 'Confirms wristband/chart identifiers match before a procedure or draw', category: 'safety' },

  // --- Surgical / procedural -----------------------------------------------
  { id: 'surgical', label: 'Surgical Field', description: 'Intra-op and procedural documentation', category: 'surgical' },
  { id: 'ppe', label: 'PPE & Sterile Field', description: 'Checks PPE donning and sterile-field setup against protocol', category: 'safety' },

  // --- Laboratory & biotech --------------------------------------------
  { id: 'specimen', label: 'Specimen / Pathology', description: 'Gross specimen & sample photography for the record', category: 'laboratory' },
  { id: 'microscopy', label: 'Microscopy', description: 'Slide & scope-eyepiece capture', category: 'laboratory' },
  { id: 'gel', label: 'Gel / Blot Documentation', description: 'Electrophoresis gels, western blots & plate imaging for the lab notebook', category: 'laboratory' },
  { id: 'culture', label: 'Culture / Plate', description: 'Cell culture, colony counts & petri plate documentation', category: 'laboratory' },
  { id: 'labresult', label: 'Lab Report / Requisition', description: 'Captures printed lab results, requisitions & pathology reports for the chart', category: 'laboratory' },

  // --- Diagnostic imaging ------------------------------------------------
  { id: 'radiograph', label: 'Radiograph / Light-box', description: 'Photographs film, light-box, or screen-displayed imaging studies', category: 'imaging' },
]

export const SCAN_CATEGORY_LABELS: Record<ScanCategory, string> = {
  clinical: 'Bedside & Clinical',
  surgical: 'Surgical & Procedural',
  laboratory: 'Laboratory & Biotech',
  imaging: 'Diagnostic Imaging',
  safety: 'Safety & Verification',
}

export interface AppUser {
  id: string
  name: string
  email: string
  plan: string
  avatar: string
}

// Real, user-facing preferences — grouped the way Claude/Kimi group theirs
// (appearance, camera/permissions, notifications, privacy) so the Settings
// modal has actual state to read and write instead of decorative toggles.
// Persisted to localStorage (see the `persist` wrapper below) so choices
// survive a refresh, same as any production settings surface.
export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  language: string
  defaultTemplateId: string
  hapticFeedback: boolean
  autoStartCamera: boolean
  saveScansToDevice: boolean
  highAccuracyMode: boolean
  flashDefault: boolean
  pushNotifications: boolean
  soundEffects: boolean
  scanCompleteAlerts: boolean
  improveModelWithData: boolean
  chatHistoryEnabled: boolean
  analyticsEnabled: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'English (US)',
  defaultTemplateId: 'wound',
  hapticFeedback: true,
  autoStartCamera: true,
  saveScansToDevice: false,
  highAccuracyMode: false,
  flashDefault: false,
  pushNotifications: true,
  soundEffects: true,
  scanCompleteAlerts: true,
  improveModelWithData: true,
  chatHistoryEnabled: true,
  analyticsEnabled: true,
}

export type SettingsTabId =
  | 'general'
  | 'camera'
  | 'notifications'
  | 'privacy'
  | 'account'

interface AppState {
  activePage: PageId
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  models: AIModel[]
  selectedModelId: string
  recentChats: ChatSession[]
  activeChatId: string | null
  selectedTemplateId: string
  user: AppUser | null
  userLoading: boolean
  announcementOpen: boolean
  /**
   * Session-only flag: has `triggerAnnouncement` already been resolved
   * (opened it, or decided it's still on cooldown) for this page load?
   * Distinct from `announcementLastShownAt` — this just unblocks the
   * "wait for the announcement flow before starting the tour" gate in
   * CameraFeed so that gate doesn't stall forever on sessions where the
   * billboard is on cooldown and never opens.
   */
  announcementResolved: boolean
  /**
   * Epoch ms the announcement billboard was last actually shown to this
   * device. Persisted (see `partialize` below) so the 37h cooldown holds
   * across refreshes/new sessions instead of resetting every page load —
   * that reset is what used to make it show up "regularly" (every visit)
   * instead of at most once every 37 hours.
   */
  announcementLastShownAt: number | null
  shortcutsOpen: boolean
  tourOpen: boolean
  tourStep: number
  /**
   * User ids that have already completed (or been shown and dismissed) the
   * first-run product tour. Persisted so it genuinely only fires once per
   * account — not once per browser session, which is what a plain
   * in-memory boolean gave us: it reset to `false` on every page load, so
   * the tour re-triggered every time a signed-up person opened the camera
   * again. Keyed by account rather than device so multiple accounts on
   * the same browser each still get their own first-time tour, and a
   * signed-out ("anonymous") session is tracked under its own key.
   */
  seenTourUserIds: string[]
  settingsOpen: boolean
  settingsTab: SettingsTabId
  settings: AppSettings
  /**
   * True once the persisted store has been read back from localStorage.
   * Hydration is deferred to the client (see `skipHydration` below) and
   * kicked off at module scope — before React even starts mounting —
   * but components that need to branch on a *real* persisted value
   * (e.g. CameraFeed deciding whether to auto-start) should still gate
   * on this rather than assume it's already true.
   */
  settingsHydrated: boolean
  /**
   * Mirrors useCamera's status, published here so Sidebar's loading
   * skeleton can wait on it too — see `lib/layout.ts`'s shared
   * SKELETON_MIN_MS clock for why this exists: without it, the sidebar
   * (gated only on settingsHydrated, a near-instant localStorage read)
   * would finish its shimmer well before the camera actually grants
   * getUserMedia, even though both start their "at least 1s" timers at
   * the same moment.
   */
  cameraStatus: 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'
  scanViewerId: string | null
  pendingChatSeed: PendingChatSeed | null
  /**
   * True while the "Do you want to exit?" confirmation is up. Only ever
   * opened from the camera (home) page — the browser/hardware back-button
   * guard (see useBackButtonGuard) routes every other page back to camera
   * first, and only asks to exit once the person is already home.
   */
  exitConfirmOpen: boolean
  setPage: (page: PageId) => void
  setCameraStatus: (status: AppState['cameraStatus']) => void
  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebarCollapsed: () => void
  selectModel: (id: string) => void
  startNewChat: () => void
  selectChat: (id: string) => void
  setTemplate: (id: string) => void
  togglePinChat: (id: string) => void
  toggleStarChat: (id: string) => void
  renameChat: (id: string, title: string) => void
  deleteChat: (id: string) => void
  addScanResult: (title: string, thumbnail?: string) => string
  openScanViewer: (id: string) => void
  closeScanViewer: () => void
  startChatFromScan: (id: string, context?: { templateLabel?: string; caseInfo?: PendingChatSeed['caseInfo'] }) => void
  consumeChatSeed: () => void
  clearAllChats: () => void
  dismissAnnouncement: () => void
  triggerAnnouncement: () => void
  setUser: (user: AppUser) => void
  clearUser: () => void
  openShortcuts: () => void
  closeShortcuts: () => void
  toggleShortcuts: () => void
  startTour: () => void
  endTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  /** Jump straight to an arbitrary step — powers the tour's clickable
   * step rail, so it's not strictly a linear back/next flow. */
  goToTourStep: (step: number) => void
  maybeStartTour: () => void
  openSettings: (tab?: SettingsTabId) => void
  closeSettings: () => void
  setSettingsTab: (tab: SettingsTabId) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  setHydrated: () => void
  openExitConfirm: () => void
  closeExitConfirm: () => void
}

// Kept in sync with the TOUR_STEPS list in components/onboarding/TourGuide.tsx —
// only used here to clamp `tourStep` so next/prev can't walk off either end.
export const TOUR_STEP_COUNT = 11

// How often the "under development" announcement billboard is allowed to
// resurface for a given device — not "once per session" (too naggy for a
// daily user) and not "once ever" (new info still needs to reach people who
// only open the app every so often). 37h deliberately doesn't line up with
// a calendar day, so it doesn't settle into "always at the same time of day"
// the way a 24h/48h cooldown would.
export const ANNOUNCEMENT_COOLDOWN_MS = 37 * 60 * 60 * 1000

// --- persist write guard -----------------------------------------------
// zustand's `persist` middleware writes to storage on every `set()` call
// by default — it has no idea whether hydration has actually finished.
// Combined with `skipHydration: true` + a manual `rehydrate()` call below,
// this opened a real race: other effects that fire on mount (loading the
// current user, mirroring camera status, etc.) call `set()` almost
// immediately, and in dev mode especially, those can win the race against
// `rehydrate()` reading localStorage — flushing the *default* in-memory
// state (empty `seenTourUserIds`, null `announcementLastShownAt`) to
// storage and permanently clobbering whatever was actually persisted
// there, before rehydration ever gets to read it. This is what made the
// "shown once" guarantees look like they were resetting on their own: the
// persisted values were being correctly written, then wiped out again on
// the very same page load by an unrelated early `set()`.
//
// The fix: wrap storage so writes are a no-op until this module has seen
// hydration actually complete once (flipped in `onRehydrateStorage`
// below). Reads are never blocked — only writes, and only before the
// real persisted data has had its one chance to be read back safely.
let hasHydratedOnce = false

const guardedLocalStorage = {
  getItem: (name: string) => (typeof window === 'undefined' ? null : window.localStorage.getItem(name)),
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return
    if (!hasHydratedOnce) {
      onboardingLog('persist:write-suppressed-pre-hydration', { name })
      return
    }
    window.localStorage.setItem(name, value)
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(name)
  },
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activePage: 'camera',
      sidebarOpen: false,
      sidebarCollapsed: true,
      models: MODELS,
      selectedModelId: MODELS[0].id,
      recentChats: INITIAL_CHATS,
      activeChatId: null,
      selectedTemplateId: 'wound',
      user: null,
      userLoading: true,
      announcementOpen: false,
      announcementResolved: false,
      announcementLastShownAt: null,
      shortcutsOpen: false,
      tourOpen: false,
      tourStep: 0,
      seenTourUserIds: [],
      settingsOpen: false,
      settingsTab: 'general',
      settings: DEFAULT_SETTINGS,
      settingsHydrated: false,
      cameraStatus: 'idle',
      scanViewerId: null,
      pendingChatSeed: null,
      exitConfirmOpen: false,
      setPage: (page) => set({ activePage: page, sidebarOpen: false }),
      setCameraStatus: (status) => set({ cameraStatus: status }),
      openSidebar: () => set({ sidebarOpen: true }),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      selectModel: (id) => set({ selectedModelId: id }),
      startNewChat: () =>
        set((s) => {
          const chat: ChatSession = { id: `c-${Date.now()}`, title: 'New scan', createdAt: Date.now() }
          return {
            recentChats: s.settings.chatHistoryEnabled ? [chat, ...s.recentChats] : s.recentChats,
            activeChatId: chat.id,
            activePage: 'chat',
            sidebarOpen: false,
          }
        }),
      selectChat: (id) => set({ activeChatId: id, activePage: 'chat', sidebarOpen: false }),
      setTemplate: (id) => set({ selectedTemplateId: id }),
      togglePinChat: (id) =>
        set((s) => ({
          recentChats: s.recentChats.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
        })),
      toggleStarChat: (id) =>
        set((s) => ({
          recentChats: s.recentChats.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)),
        })),
      renameChat: (id, title) =>
        set((s) => {
          const trimmed = title.trim()
          if (!trimmed) return {}
          return {
            recentChats: s.recentChats.map((c) => (c.id === id ? { ...c, title: trimmed } : c)),
          }
        }),
      deleteChat: (id) =>
        set((s) => ({
          recentChats: s.recentChats.filter((c) => c.id !== id),
          activeChatId: s.activeChatId === id ? null : s.activeChatId,
          scanViewerId: s.scanViewerId === id ? null : s.scanViewerId,
        })),
      // Fired from the ControlBar's AI Lens button once a scan resolves —
      // drops the result straight into the sidebar list, same place and
      // shape as a chat, so scan history and chat history live in one
      // unified, searchable list. Respects the "Save chat history" privacy
      // toggle just like starting a new chat does. Returns the new row's
      // id so the caller (CameraFeed) can open its viewer immediately.
      addScanResult: (title, thumbnail) => {
        const id = `s-${Date.now()}`
        set((s) => {
          if (!s.settings.chatHistoryEnabled) return {}
          const chat: ChatSession = { id, title, createdAt: Date.now(), kind: 'scan', thumbnail }
          return { recentChats: [chat, ...s.recentChats] }
        })
        return id
      },
      openScanViewer: (id) => set({ scanViewerId: id, sidebarOpen: false }),
      closeScanViewer: () => set({ scanViewerId: null }),
      // "Chat about this" from a scan card or the scan viewer — hands the
      // scan's label + photo to the Vue chat app as a seed message rather
      // than dumping the person into a blank composer. ChatEmbed reads
      // `pendingChatSeed` once the iframe reports ready and forwards it
      // over postMessage, then it's cleared via `consumeChatSeed`.
      startChatFromScan: (id, context) =>
        set((s) => {
          const scan = s.recentChats.find((c) => c.id === id)
          if (!scan) return { activePage: 'chat', scanViewerId: null, sidebarOpen: false }
          return {
            activePage: 'chat',
            activeChatId: null,
            scanViewerId: null,
            sidebarOpen: false,
            pendingChatSeed: {
              label: scan.title,
              thumbnail: scan.thumbnail,
              templateLabel: context?.templateLabel,
              caseInfo: context?.caseInfo,
            },
          }
        }),
      consumeChatSeed: () => set({ pendingChatSeed: null }),
      clearAllChats: () => set({ recentChats: [], activeChatId: null, scanViewerId: null }),
      dismissAnnouncement: () => set({ announcementOpen: false }),
      // Opens the billboard at most once every `ANNOUNCEMENT_COOLDOWN_MS`
      // (37h), tracked via the persisted `announcementLastShownAt`
      // timestamp rather than a plain "seen" boolean — a boolean can only
      // ever fire once per device, ever; a timestamp lets it resurface
      // periodically for people who aren't opening the app every day.
      // Either way this resolves `announcementResolved` for the session so
      // callers gating on "has the announcement decision happened yet"
      // (the tour-timing effect in CameraFeed) don't stall when it's
      // skipped for being on cooldown.
      triggerAnnouncement: () =>
        set((s) => {
          const now = Date.now()
          const elapsed = s.announcementLastShownAt == null ? null : now - s.announcementLastShownAt
          const due = s.announcementLastShownAt == null || (elapsed as number) >= ANNOUNCEMENT_COOLDOWN_MS
          onboardingLog('announcement:evaluate', {
            lastShownAt: s.announcementLastShownAt,
            elapsedMs: elapsed,
            cooldownMs: ANNOUNCEMENT_COOLDOWN_MS,
            due,
          })
          if (!due) return { announcementResolved: true }
          return { announcementOpen: true, announcementResolved: true, announcementLastShownAt: now }
        }),
      setUser: (user) => set({ user, userLoading: false }),
      // Logging out ends the account's session. The tour's "seen" state
      // is tracked per user id in `seenTourUserIds` (see that field), so
      // it deliberately does NOT get reset here — someone who already
      // completed the tour on this account shouldn't see it again just
      // because they logged out and back in. `announcementLastShownAt` is
      // deliberately NOT reset either — the 37h cooldown is per-device,
      // not per-account, so signing out and back in shouldn't force the
      // billboard to resurface early.
      clearUser: () =>
        set({
          user: null,
          userLoading: false,
          announcementResolved: false,
          announcementOpen: false,
          tourOpen: false,
          tourStep: 0,
        }),
      openShortcuts: () => set({ shortcutsOpen: true }),
      closeShortcuts: () => set({ shortcutsOpen: false }),
      toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
      // Manual replay (profile menu → "Take the tour") always opens it
      // regardless of prior state, and records this account as having
      // seen it so an auto-trigger doesn't also fire on top of it later.
      // Also jumps to the camera page first: the tour now spotlights real
      // on-screen elements (viewfinder, control bar, detection card, …),
      // so it only makes sense to run where those elements actually exist.
      startTour: () =>
        set((s) => {
          const id = s.user?.id ?? 'anonymous'
          return {
            tourOpen: true,
            tourStep: 0,
            activePage: 'camera',
            seenTourUserIds: s.seenTourUserIds.includes(id) ? s.seenTourUserIds : [...s.seenTourUserIds, id],
          }
        }),
      endTour: () => set({ tourOpen: false }),
      nextTourStep: () =>
        set((s) => {
          const next = s.tourStep + 1
          return next >= TOUR_STEP_COUNT ? { tourOpen: false } : { tourStep: next }
        }),
      prevTourStep: () => set((s) => ({ tourStep: Math.max(0, s.tourStep - 1) })),
      goToTourStep: (step) => set({ tourStep: Math.max(0, Math.min(step, TOUR_STEP_COUNT - 1)) }),
      // Auto-starts the tour once per account, ever — not once per
      // session. Called after the "work in progress" splash has already
      // had its turn (see CameraFeed), never both at once.
      maybeStartTour: () => {
        const s = get()
        const id = s.user?.id ?? 'anonymous'
        const alreadySeen = s.seenTourUserIds.includes(id)
        onboardingLog('tour:evaluate', { userId: id, alreadySeen, seenTourUserIds: s.seenTourUserIds })
        if (alreadySeen) return
        set({ tourOpen: true, tourStep: 0, seenTourUserIds: [...s.seenTourUserIds, id] })
      },
      openSettings: (tab) => set((s) => ({ settingsOpen: true, settingsTab: tab ?? s.settingsTab })),
      closeSettings: () => set({ settingsOpen: false }),
      setSettingsTab: (tab) => set({ settingsTab: tab }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setHydrated: () => set({ settingsHydrated: true }),
      openExitConfirm: () => set({ exitConfirmOpen: true }),
      closeExitConfirm: () => set({ exitConfirmOpen: false }),
    }),
    {
      // Production-grade settings need to survive a refresh — everything
      // else in the store (open/closed panel state, in-flight scan state,
      // the live user session) stays session-only and is deliberately left
      // out of `partialize` below. `announcementResolved` is deliberately
      // NOT persisted — it's a "has this page load resolved the
      // announcement decision yet" flag by design; `announcementLastShownAt`
      // IS persisted so the 37h cooldown survives a refresh/new session
      // instead of resetting every visit. `seenTourUserIds`, unlike the old
      // `hasSeenTour` boolean it replaced, IS persisted: the tour genuinely
      // needs to survive a refresh/new session to only fire once per
      // account (see the field's doc comment above). Because it's keyed by
      // user id rather than a single device-wide flag, it doesn't have the
      // old "stuck sticky forever, blocks every future first-time login on
      // this browser" problem the previous comment here warned about.
      name: 'spatial-ai-store',
      storage: createJSONStorage(() => guardedLocalStorage),
      partialize: (s) => ({
        settings: s.settings,
        sidebarCollapsed: s.sidebarCollapsed,
        recentChats: s.recentChats,
        selectedTemplateId: s.selectedTemplateId,
        seenTourUserIds: s.seenTourUserIds,
        announcementLastShownAt: s.announcementLastShownAt,
      }),
      // Next.js renders the first pass on the server, where localStorage
      // doesn't exist — skip auto-hydration there and let zustand hydrate
      // once the client mounts, so server and first client render match.
      skipHydration: true,
      // Bumped because earlier builds of this app persisted
      // hasSeenTour/hasSeenAnnouncement as plain booleans (see the note
      // above `partialize`) — anyone with that old blob in localStorage
      // needs it sanitized on read (the boolean shape doesn't match the
      // new `seenTourUserIds` array / `announcementLastShownAt` timestamp
      // and would otherwise poison it).
      version: 3,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted as unknown as AppState
        const {
          hasSeenTour: _legacyTour,
          hasSeenAnnouncement: _legacyAnnouncement,
          seenTourUserIds,
          announcementLastShownAt,
          ...rest
        } = persisted as Record<string, unknown>
        // Double cast (via `unknown`) is safe and intentional: zustand
        // shallow-merges whatever this returns into the store's existing
        // (already fully-formed) state — it doesn't need to be a complete
        // AppState on its own, only the handful of persisted fields being
        // corrected here. TS can't verify that from the object shape
        // alone, hence the `unknown` step to get past the overlap check.
        const migrated = {
          ...rest,
          seenTourUserIds: Array.isArray(seenTourUserIds) ? seenTourUserIds : [],
          announcementLastShownAt: typeof announcementLastShownAt === 'number' ? announcementLastShownAt : null,
        }
        onboardingLog('migrate', {
          hadLegacyTourFlag: _legacyTour !== undefined,
          hadLegacyAnnouncementFlag: _legacyAnnouncement !== undefined,
          incomingSeenTourUserIds: seenTourUserIds,
          incomingAnnouncementLastShownAt: announcementLastShownAt,
          outgoingSeenTourUserIds: migrated.seenTourUserIds,
          outgoingAnnouncementLastShownAt: migrated.announcementLastShownAt,
        })
        return migrated as unknown as AppState
      },
      onRehydrateStorage: () => (state, error) => {
        hasHydratedOnce = true
        if (error) {
          onboardingLog('rehydrate:error', { error: String(error) })
        } else {
          onboardingLog('rehydrate:complete', {
            origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
            seenTourUserIds: state?.seenTourUserIds,
            announcementLastShownAt: state?.announcementLastShownAt,
            rawStoragePresent:
              typeof window !== 'undefined' ? window.localStorage.getItem('spatial-ai-store') != null : null,
          })
        }
        state?.setHydrated()
      },
    }
  )
)

// Rehydration is deliberately NOT kicked off at module scope. This module
// also evaluates on the client during the initial bundle load — i.e.
// *before* React hydrates the server-rendered HTML — so a synchronous
// `rehydrate()` there would already have applied localStorage's values
// (e.g. `sidebarCollapsed`) by the time React does its hydration-matching
// render. The server has no localStorage and always renders the store's
// plain defaults, so that mismatched anything gated on a persisted field
// (the sidebar's collapsed width, its "Products" label, etc.) and tripped
// a hydration-mismatch warning.
//
// Calling it from `useHydrateAppStore` below instead means the client's
// *first* render still matches the server (both use the defaults), and
// the persisted values apply a moment later as a normal, legitimate
// post-hydration state update. Components that gate real behavior on
// persisted state (e.g. CameraFeed's auto-start) already key off the
// reactive `settingsHydrated` flag, so they pick up the change correctly
// regardless of exactly when rehydration completes.
export function useHydrateAppStore() {
  useEffect(() => {
    useAppStore.persist.rehydrate()
  }, [])
}

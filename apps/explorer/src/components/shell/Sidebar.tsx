'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  PanelLeft,
  Video,
  MessageSquare,
  ChevronsUpDown,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  Pin,
  Star,
  Trash2,
  MoreHorizontal,
  Keyboard,
  ListFilter,
  Check,
  Pencil,
  Wand2,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { LogoBadge } from '@/components/ui/LogoMark'
import { authApi } from '@/lib/auth-api'
import { useNowTick, formatRelativeTime } from '@/hooks/useRelativeTime'
import { PhotoCustomizePanelPortal } from '@/components/camera/PhotoCustomizePanel'
import { sidebarNavItems } from './navItems'
import { SidebarSkeleton } from './SidebarSkeleton'
import { msUntilSkeletonFloor } from '@/lib/layout'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipShortcut } from '@/components/ui/tooltip'
import {
  SidebarProvider,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuButtonLabel,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

const PROFILE_MENU_WIDTH = 240

// Shown as a faint hint chip next to each nav row (expanded only) — the
// same at-a-glance affordance Claude/Kimi/Slack sidebars use so people
// discover shortcuts by seeing them, not by hunting for a docs page.
const NAV_SHORTCUTS: Partial<Record<string, string>> = {
  camera: '⌘1',
  chat: '⌘2',
}

function ProfileTriggerButton({
  btnRef,
  onClick,
  collapsed,
  user,
}: {
  btnRef: React.RefObject<HTMLButtonElement | null>
  onClick: () => void
  collapsed: boolean
  user: { name: string; plan: string; avatar: string }
}) {
  const button = (
    <button
      ref={btnRef}
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl py-2 pl-3 pr-3 overflow-hidden whitespace-nowrap transition-colors hover:bg-[var(--sp-surface-hover)]"
    >
      <div className="relative shrink-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] flex items-center justify-center text-[12px] font-bold text-black">
          {user.avatar}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--sp-bg-1)]" />
      </div>
      <span className="flex-1 min-w-0 flex flex-col items-start leading-tight">
        <span
          className="text-[13px] font-medium text-[var(--sp-text)] truncate w-full text-left transition-opacity duration-150"
          style={{ opacity: collapsed ? 0 : 1 }}
        >
          {user.name}
        </span>
        <span
          className="text-[11px] text-[var(--sp-text-faint)] truncate w-full text-left transition-opacity duration-150"
          style={{ opacity: collapsed ? 0 : 1 }}
        >
          {user.plan}
        </span>
      </span>
      <ChevronsUpDown
        size={14}
        className="text-[var(--sp-text-faint)] shrink-0 transition-opacity duration-150"
        style={{ opacity: collapsed ? 0 : 1 }}
      />
    </button>
  )

  if (!collapsed) return button

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right" sideOffset={14} align="center">
        <span className="flex flex-col gap-0.5">
          <span>{user.name}</span>
          <span className="text-[10.5px] font-normal text-[var(--sp-text-faint)]">{user.plan}</span>
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const clearUser = useAppStore((s) => s.clearUser)
  const openShortcuts = useAppStore((s) => s.openShortcuts)
  const startTour = useAppStore((s) => s.startTour)
  const openSettings = useAppStore((s) => s.openSettings)
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  // Anchored with `bottom` + `left` (not `top` + a manual transform) so it
  // stacks upward from the button on its own — no fighting with framer-motion,
  // which drives its own transform for the y/scale animation and would
  // silently clobber a transform set via inline style.
  const [anchor, setAnchor] = useState({ bottom: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleToggle = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      const margin = 8
      // Clamp horizontally so the menu is always fully on-screen, even when
      // the button sits close to the left edge in the collapsed rail.
      const left = Math.min(
        Math.max(rect.left, margin),
        window.innerWidth - PROFILE_MENU_WIDTH - margin
      )
      setAnchor({ bottom: window.innerHeight - rect.top + margin, left })
    }
    setOpen((v) => !v)
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } finally {
      clearUser()
      router.push('/login')
    }
  }

  if (!user) {
    // Still resolving the session (see useLoadCurrentUser) — a quiet
    // skeleton beats flashing empty/fake fields for a frame.
    return (
      <div className="px-2 pb-2 pt-1 border-t border-[var(--sp-border)] shrink-0">
        <div className="flex items-center gap-3 rounded-xl py-2 pl-3 pr-3">
          <div className="w-7 h-7 rounded-full bg-[var(--sp-surface-hover)] animate-pulse shrink-0" />
          {!collapsed && <div className="h-3 w-24 rounded bg-[var(--sp-surface-hover)] animate-pulse" />}
        </div>
      </div>
    )
  }

  return (
    <div className="relative px-2 pb-2 pt-1 border-t border-[var(--sp-border)] shrink-0">
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            {/* Fixed (not absolute) so it's positioned relative to the viewport
                and can never get cut off by the sidebar's own overflow-hidden —
                that clipping is exactly what broke this in the collapsed state.
                Anchored from the bottom so it always opens upward, above the
                button, regardless of sidebar state. */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{ bottom: anchor.bottom, left: anchor.left, width: PROFILE_MENU_WIDTH }}
              className="fixed rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.55)] z-50 overflow-hidden p-1.5"
            >
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } } }}
              >
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}
                  className="px-3 py-2.5 mb-1"
                >
                  <div className="text-[13px] font-medium text-[var(--sp-text)] truncate">{user.name}</div>
                  <div className="text-[11.5px] text-[var(--sp-text-faint)] truncate">{user.email}</div>
                </motion.div>
                <div className="h-px bg-[var(--sp-border)] mb-1" />
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 2 }}
                  onClick={() => { setOpen(false); openSettings('general') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
                >
                  <Settings size={15} /> Settings
                </motion.button>
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 2 }}
                  onClick={() => { setOpen(false); openShortcuts() }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
                >
                  <span className="flex items-center gap-2.5"><Keyboard size={15} /> Keyboard shortcuts</span>
                  <span className="text-[10.5px] font-mono text-[var(--sp-text-faint)]">?</span>
                </motion.button>
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 2 }}
                  onClick={() => { setOpen(false); startTour() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
                >
                  <HelpCircle size={15} /> Take the tour
                </motion.button>
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 2 }}
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <LogOut size={15} /> {loggingOut ? 'Signing out…' : 'Log out'}
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProfileTriggerButton
        btnRef={btnRef}
        onClick={handleToggle}
        collapsed={collapsed}
        user={user}
      />
    </div>
  )
}

function NewScanButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  // "Live Mode" — redesigned from the old plain "New scan" pill. Solid
  // brand-gradient fill at rest (rather than a neutral surface that only
  // turns colorful on hover) so the sidebar's single most important
  // action reads as a distinct, always-on call-to-action, not just
  // another list row. The live dot + radiating ring is the one bit of
  // signature motion — it's what actually says "live" at a glance,
  // instead of leaning on the label text alone.
  const trigger = (
    <button
      type="button"
      onClick={onClick}
      aria-label="Live Mode"
      className="group relative flex-1 min-w-0 flex items-center gap-3 py-2.5 pl-3 pr-3 rounded-xl text-[14px] font-semibold overflow-hidden whitespace-nowrap shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_6px_18px_-6px_rgba(79,195,247,0.55)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:brightness-95"
      style={{ background: 'linear-gradient(120deg, rgb(79,195,247), rgb(124,77,255))' }}
    >
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />

      <span className="relative shrink-0 flex items-center justify-center w-[22px] h-[22px]">
        <Video size={17} className="text-white" strokeWidth={2.2} />
        {/* Live indicator — small pulsing dot with a radiating ring,
            docked on the icon rather than floating loose in the pill. */}
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-white/80 opacity-75 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
        </span>
      </span>

      <span className="relative text-white transition-opacity duration-150" style={{ opacity: collapsed ? 0 : 1 }}>
        Live Mode
      </span>

      {!collapsed && (
        <span className="relative ml-auto text-[10.5px] font-mono text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
          ⌘K
        </span>
      )}
    </button>
  )

  if (!collapsed) return trigger

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="right" sideOffset={14} align="center">
        <span className="flex items-center gap-3">
          Live Mode
          <TooltipShortcut>⌘K</TooltipShortcut>
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

const ROW_MENU_WIDTH = 176

// The "..." dropdown on each row — Rename, Star, Pin, Customize (scans
// only), Delete. Scan rows no longer get a separate dedicated pin toggle
// next to this menu's trigger (see ChatRow below), so Pin lives here
// instead; chat rows keep their standalone pin toggle too, but exposing
// it here as well means the action is always reachable the same way.
function ChatRowMenu({
  chat,
  onClose,
  onRename,
  onToggleStar,
  onTogglePin,
  onCustomize,
  onDelete,
  anchorRef,
}: {
  chat: { id: string; pinned?: boolean; starred?: boolean; kind?: 'chat' | 'scan'; thumbnail?: string }
  onClose: () => void
  onRename: () => void
  onToggleStar: () => void
  onTogglePin: () => void
  onCustomize?: () => void
  onDelete: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const isScan = chat.kind === 'scan'
  const canCustomize = isScan && !!chat.thumbnail && !!onCustomize

  useEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 8
    const left = Math.min(rect.right - ROW_MENU_WIDTH, window.innerWidth - ROW_MENU_WIDTH - margin)
    setPos({ top: rect.bottom + 4, left: Math.max(margin, left) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        style={{ top: pos.top, left: pos.left, width: ROW_MENU_WIDTH }}
        className="fixed rounded-xl border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden p-1"
      >
        <button
          onClick={() => { onRename(); onClose() }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
        >
          <Pencil size={14} />
          Rename
        </button>
        <button
          onClick={() => { onToggleStar(); onClose() }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
        >
          <Star size={14} className={chat.starred ? 'fill-current text-amber-400' : ''} />
          {chat.starred ? 'Unstar' : 'Star'}
        </button>
        <button
          onClick={() => { onTogglePin(); onClose() }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
        >
          <Pin size={14} className={chat.pinned ? 'fill-current text-[var(--sp-primary)]' : ''} />
          {chat.pinned ? 'Unpin' : 'Pin'}
        </button>
        {canCustomize && (
          <button
            onClick={() => { onCustomize?.(); onClose() }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
          >
            <Wand2 size={14} />
            Customize
          </button>
        )}
        <div className="h-px bg-[var(--sp-border)] my-1" />
        <button
          onClick={() => { onDelete(); onClose() }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </motion.div>
    </>
  )
}

type GroupByMode = 'none' | 'date'

// ---------------------------------------------------------------------
// Radial ("wheel") menu — camera/scan rows only. A GTA-style radial menu,
// but capped to a semicircle: the flat/straight edge runs along the
// sidebar's own outer border, and the wheel only ever bulges outward into
// the main content area, never back over the sidebar. It's anchored to
// that edge (not to the "..." button itself), so it always opens from the
// same vertical line no matter where the row sits in the scroll list.
const RADIAL_OUTER_R = 132
const RADIAL_INNER_R = 46
const RADIAL_MIN_R = 84
const RADIAL_GAP_DEG = 5
const RADIAL_LABEL_SPACE = 108

// angle 0 = pointing right (into the content area), -90 = up, +90 = down —
// so sweeping -90..90 traces exactly the right-hand half of a circle.
function polarToXY(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) }
}

// Builds an SVG path for one "slice" of the half-donut — an annular
// sector between innerR/outerR and startDeg/endDeg, relative to a local
// origin at (0, cy).
function annularSectorPath(cy: number, innerR: number, outerR: number, startDeg: number, endDeg: number) {
  const p1 = polarToXY(outerR, startDeg)
  const p2 = polarToXY(outerR, endDeg)
  const p3 = polarToXY(innerR, endDeg)
  const p4 = polarToXY(innerR, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return [
    `M ${p1.x} ${cy + p1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${cy + p2.y}`,
    `L ${p3.x} ${cy + p3.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${cy + p4.y}`,
    'Z',
  ].join(' ')
}

type RadialItem = {
  key: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  active?: boolean
  onSelect: () => void
}

function ScanRadialMenu({
  chat,
  anchorRef,
  onClose,
  onRename,
  onToggleStar,
  onTogglePin,
  onCustomize,
  onDelete,
}: {
  chat: { id: string; pinned?: boolean; starred?: boolean; thumbnail?: string }
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onRename: () => void
  onToggleStar: () => void
  onTogglePin: () => void
  onCustomize?: () => void
  onDelete: () => void
}) {
  const [geo, setGeo] = useState<{ x: number; y: number; outerR: number; innerR: number } | null>(null)

  useEffect(() => {
    const btnRect = anchorRef.current?.getBoundingClientRect()
    if (!btnRect) return
    // Anchor to the sidebar's own edge, not the button — the wheel should
    // always sit flush against the sidebar border regardless of the
    // internal padding around any given row.
    const sidebarEl = anchorRef.current?.closest('[data-sidebar-container]') as HTMLElement | null
    const edgeX = sidebarEl ? sidebarEl.getBoundingClientRect().right : btnRect.right
    const margin = 16

    // Shrink the wheel to fit the viewport (mobile sidebars leave less
    // room to the right) rather than letting it run off-screen.
    const availableW = window.innerWidth - edgeX - margin - RADIAL_LABEL_SPACE
    const outerR = Math.max(RADIAL_MIN_R, Math.min(RADIAL_OUTER_R, availableW))
    const innerR = Math.round(outerR * (RADIAL_INNER_R / RADIAL_OUTER_R))

    const rawY = btnRect.top + btnRect.height / 2
    const y = Math.min(Math.max(rawY, outerR + margin), window.innerHeight - outerR - margin)

    setGeo({ x: edgeX, y, outerR, innerR })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canCustomize = !!chat.thumbnail && !!onCustomize

  const items: RadialItem[] = [
    { key: 'rename', label: 'Rename', icon: Pencil, color: '#94a3b8', onSelect: onRename },
    { key: 'star', label: chat.starred ? 'Unstar' : 'Star', icon: Star, color: '#fbbf24', active: chat.starred, onSelect: onToggleStar },
    { key: 'pin', label: chat.pinned ? 'Unpin' : 'Pin', icon: Pin, color: 'var(--sp-primary)', active: chat.pinned, onSelect: onTogglePin },
    ...(canCustomize ? [{ key: 'customize', label: 'Customize', icon: Wand2, color: '#a78bfa', onSelect: onCustomize! } as RadialItem] : []),
    { key: 'delete', label: 'Delete', icon: Trash2, color: '#f87171', onSelect: onDelete },
  ]

  if (!geo) return null

  const { outerR, innerR } = geo
  const itemR = (innerR + outerR) / 2
  const n = items.length
  const step = 180 / n
  const boxW = outerR + RADIAL_LABEL_SPACE
  const boxH = outerR * 2

  // Icon buttons default to 44px (RADIAL_ICON_MAX), but that's only safe
  // when the wheel has enough room. Adjacent icons sit at the same
  // radius (itemR) separated by `step` degrees, so the straight-line gap
  // between their centers is a fixed chord length — shrink the wheel
  // (RADIAL_MIN_R on a narrow mobile screen, or just 4-5 items packed
  // into the same 180°) and that chord shrinks well below 44px, which is
  // what made adjacent buttons visually collide. Deriving the button size
  // from the actual chord — instead of a size that assumes a wheel radius
  // large enough — means they can never overlap, on any viewport, at any
  // item count.
  const chord = 2 * itemR * Math.sin((step * Math.PI) / 360)
  const RADIAL_ICON_MAX = 44
  const RADIAL_ICON_GAP = 10 // minimum breathing room between adjacent icon edges
  const RADIAL_ICON_MIN = 28
  const iconDiam = Math.max(RADIAL_ICON_MIN, Math.min(RADIAL_ICON_MAX, chord - RADIAL_ICON_GAP))

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          left: geo.x,
          top: geo.y - outerR,
          width: boxW,
          height: boxH,
          transformOrigin: 'left center',
        }}
        className="z-50"
      >
        {/* Solid black backdrop directly behind the wheel. The wheel is
            drawn from the hub (x=0, the sidebar edge) outward to x=outerR
            (see polarToXY/annularSectorPath above), so the backdrop must
            occupy that same x=[0, outerR] span — not a clipped square,
            which shifts the visible half-disc a full outerR to the right
            of where the icons actually sit. A half-width div with the
            right corners rounded reproduces the D-shape exactly in that
            span, so it sits precisely under the icon wheel. */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: outerR,
            height: outerR * 2,
            borderRadius: `0 ${outerR}px ${outerR}px 0`,
            background: 'rgba(0,0,0,0.92)',
          }}
        />

        {/* Colored sector track — one slice per action, gapped for
            separation, tinted per action so each is identifiable at a
            glance before the icon even registers. */}
        <svg
          width={boxW}
          height={boxH}
          className="absolute inset-0 overflow-visible pointer-events-none"
          style={{ filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.55))' }}
        >
          {items.map((item, i) => {
            const start = -90 + step * i + RADIAL_GAP_DEG / 2
            const end = -90 + step * (i + 1) - RADIAL_GAP_DEG / 2
            return (
              <path
                key={item.key}
                d={annularSectorPath(outerR, innerR, outerR, start, end)}
                fill={item.color}
                fillOpacity={item.active ? 0.22 : 0.1}
                stroke={item.color}
                strokeOpacity={0.28}
                strokeWidth={1}
              />
            )
          })}
        </svg>

        {/* Hub marker — sits exactly on the sidebar edge, marking the
            wheel's flat side. */}
        <span
          className="absolute w-2.5 h-2.5 rounded-full bg-[var(--sp-text-faint)] pointer-events-none"
          style={{ left: 0, top: outerR, transform: 'translate(-50%, -50%)' }}
        />

        {items.map((item, i) => {
          const mid = -90 + step * (i + 0.5)
          const { x, y } = polarToXY(itemR, mid)
          const Icon = item.icon
          return (
            <div
              key={item.key}
              className="group absolute flex items-center"
              style={{ left: x, top: outerR + y, transform: 'translate(-50%, -50%)' }}
            >
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.03 * i, duration: 0.16, ease: 'easeOut' }}
                onClick={() => {
                  item.onSelect()
                  onClose()
                }}
                aria-label={item.label}
                className="relative rounded-full border flex items-center justify-center bg-[var(--sp-bg-1)]/95 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform hover:scale-110"
                style={{ borderColor: item.color, color: item.color, width: iconDiam, height: iconDiam }}
              >
                <Icon size={Math.round(iconDiam * 0.39)} className={item.active ? 'fill-current' : ''} />
              </motion.button>
              <span
                className="pointer-events-none absolute whitespace-nowrap rounded-md border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/95 px-2 py-1 text-[11px] font-medium text-[var(--sp-text)] opacity-0 scale-95 shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-150 group-hover:opacity-100 group-hover:scale-100"
                style={{ left: 'calc(100% + 8px)' }}
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </motion.div>
    </>
  )
}

const GROUP_BY_MENU_WIDTH = 140

// "Group by" dropdown for the Recent list — None / Date — same small
// fixed-position menu pattern as ChatRowMenu above.
function GroupByMenu({
  value,
  onChange,
  onClose,
  anchorRef,
}: {
  value: GroupByMode
  onChange: (mode: GroupByMode) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 8
    const left = Math.min(rect.right - GROUP_BY_MENU_WIDTH, window.innerWidth - GROUP_BY_MENU_WIDTH - margin)
    setPos({ top: rect.bottom + 4, left: Math.max(margin, left) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options: { mode: GroupByMode; label: string }[] = [
    { mode: 'none', label: 'None' },
    { mode: 'date', label: 'Date' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        style={{ top: pos.top, left: pos.left, width: GROUP_BY_MENU_WIDTH }}
        className="fixed rounded-xl border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden p-1"
      >
        {options.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => { onChange(opt.mode); onClose() }}
            className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
          >
            {opt.label}
            {value === opt.mode && <Check size={13} className="text-[var(--sp-primary)]" />}
          </button>
        ))}
      </motion.div>
    </>
  )
}

// Buckets a timestamp into the same relative-date labels Claude's own
// sidebar uses, so scans naturally fall under "Today" / "Yesterday" / etc.
// as they age, with no manual re-tagging needed.
function getDateGroupLabel(createdAt: number, nowMs: number): string {
  const startOfDay = (ms: number) => {
    const d = new Date(ms)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.floor((startOfDay(nowMs) - startOfDay(createdAt)) / dayMs)

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'Previous 7 days'
  if (diffDays < 30) return 'Previous 30 days'

  const created = new Date(createdAt)
  const now = new Date(nowMs)
  return created.toLocaleDateString('en-US', {
    month: 'long',
    year: created.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

function ChatRow({
  chat,
  active,
  nowMs,
  onSelect,
  onTogglePin,
  onToggleStar,
  onRename,
  onDelete,
}: {
  chat: { id: string; title: string; createdAt: number; pinned?: boolean; starred?: boolean; kind?: 'chat' | 'scan'; thumbnail?: string }
  active: boolean
  nowMs: number
  onSelect: () => void
  onTogglePin: () => void
  onToggleStar: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState(chat.title)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const isScan = chat.kind === 'scan'

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renaming])

  const startRename = () => {
    setDraftTitle(chat.title)
    setRenaming(true)
  }

  const commitRename = () => {
    if (draftTitle.trim()) onRename(draftTitle)
    setRenaming(false)
  }

  // Shared row visuals (icon, title/timestamp, star badge) — rendered
  // inside a <button> normally, but swapped to a plain <div> while
  // renaming so the text input isn't nested inside a <button> (invalid
  // HTML, and would otherwise re-trigger onSelect on every keystroke).
  const rowIcon = chat.thumbnail ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chat.thumbnail}
      alt=""
      className="shrink-0 mt-[1px] w-7 h-7 rounded-md object-cover border border-[var(--sp-border)]"
    />
  ) : (
    <MessageSquare
      size={14}
      className={['shrink-0 mt-[3px]', active ? 'text-[var(--sp-primary)]' : 'text-[var(--sp-text-faint)]'].join(' ')}
    />
  )

  const rowMeta = (
    <>
      {/* Star indicator — quiet, always visible once starred */}
      {chat.starred && (
        <span className="absolute right-9 top-2.5 shrink-0 text-amber-400">
          <Star size={11} className="fill-current" />
        </span>
      )}

      {/* Pin toggle — always visible once pinned, otherwise reveals on
          row hover so the list doesn't look cluttered by default. Scan
          rows (camera app) don't get this dedicated toggle — Pin still
          lives in their "..." menu instead. */}
      {!isScan && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onTogglePin()
            }
          }}
          aria-label={chat.pinned ? 'Unpin chat' : 'Pin chat'}
          className={[
            'absolute right-8 top-2 shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all',
            chat.pinned
              ? 'text-[var(--sp-primary)] opacity-100'
              : 'text-[var(--sp-text-faint)] opacity-0 group-hover/row:opacity-100 hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)]',
          ].join(' ')}
        >
          <Pin size={12} className={chat.pinned ? 'fill-current' : ''} />
        </span>
      )}

      {/* "..." row menu — Rename / Star / Pin / Customize (scans) /
          Delete, same pattern as Claude's own chat-list row menu. */}
      <span
        ref={menuBtnRef}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen((v) => !v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }
        }}
        aria-label="More options"
        aria-expanded={menuOpen}
        className={[
          'absolute right-2 top-2 shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all',
          menuOpen
            ? 'text-[var(--sp-text)] bg-[var(--sp-surface-hover)] opacity-100'
            : 'text-[var(--sp-text-faint)] opacity-0 group-hover/row:opacity-100 hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)]',
        ].join(' ')}
      >
        <MoreHorizontal size={13} />
      </span>
    </>
  )

  return (
    <SidebarMenuItem key={chat.id}>
      {renaming ? (
        <div
          className="group/row relative w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left bg-[var(--sp-surface-hover)] text-[var(--sp-text)]"
        >
          {rowIcon}
          <span className="flex-1 min-w-0">
            <input
              ref={renameInputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setRenaming(false)
              }}
              onBlur={commitRename}
              className="block w-full h-6 -my-0.5 rounded-md bg-[var(--sp-surface)] border border-[var(--sp-primary)]/50 px-1.5 text-[13px] font-medium text-[var(--sp-text)] outline-none"
            />
            <span className="block text-[10.5px] text-[var(--sp-text-faint)] mt-0.5 tabular-nums">
              {formatRelativeTime(chat.createdAt, nowMs)}
            </span>
          </span>
          {rowMeta}
        </div>
      ) : (
        <button
          onClick={onSelect}
          className={[
            'group/row relative w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors',
            active
              ? 'bg-[var(--sp-primary)]/[0.1] text-[var(--sp-text)]'
              : 'text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)]',
          ].join(' ')}
        >
          {rowIcon}
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-medium truncate leading-tight pr-10">{chat.title}</span>
            <span className="block text-[10.5px] text-[var(--sp-text-faint)] mt-0.5 tabular-nums">
              {formatRelativeTime(chat.createdAt, nowMs)}
            </span>
          </span>
          {rowMeta}
        </button>
      )}

      <AnimatePresence>
        {menuOpen &&
          (isScan ? (
            <ScanRadialMenu
              chat={chat}
              anchorRef={menuBtnRef}
              onClose={() => setMenuOpen(false)}
              onRename={startRename}
              onToggleStar={onToggleStar}
              onTogglePin={onTogglePin}
              onCustomize={() => setCustomizeOpen(true)}
              onDelete={onDelete}
            />
          ) : (
            <ChatRowMenu
              chat={chat}
              anchorRef={menuBtnRef}
              onClose={() => setMenuOpen(false)}
              onRename={startRename}
              onToggleStar={onToggleStar}
              onTogglePin={onTogglePin}
              onDelete={onDelete}
            />
          ))}
      </AnimatePresence>

      {isScan && chat.thumbnail && (
        <PhotoCustomizePanelPortal
          photo={chat.thumbnail}
          title={chat.title}
          open={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
    </SidebarMenuItem>
  )
}

function SidebarContent({
  collapsed,
  onCloseMobile,
}: {
  collapsed: boolean
  onCloseMobile?: () => void
}) {
  const {
    activePage,
    setPage,
    recentChats,
    activeChatId,
    scanViewerId,
    selectChat,
    startNewChat,
    toggleSidebarCollapsed,
    togglePinChat,
    toggleStarChat,
    renameChat,
    deleteChat,
    openScanViewer,
  } = useAppStore()
  const settingsHydrated = useAppStore((s) => s.settingsHydrated)
  const cameraStatus = useAppStore((s) => s.cameraStatus)

  // Floor on how long the skeleton stays up once the store has actually
  // rehydrated — measured from the same shared APP_LOAD_STARTED_AT clock
  // CameraFeed uses (see lib/layout.ts), not this component's own mount
  // time, so the two floors always expire at the same instant instead of
  // drifting apart by a render or two. A near-instant localStorage read
  // (the common case) shouldn't flash the shimmer for a single frame, but
  // this never *extends* a genuinely slower rehydration past when it
  // actually finishes.
  const [skeletonMinElapsed, setSkeletonMinElapsed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSkeletonMinElapsed(true), msUntilSkeletonFloor())
    return () => clearTimeout(t)
  }, [])

  // On the default landing page (camera), also wait for the camera to
  // actually resolve (ready/denied/unavailable) — not just store
  // rehydration — so the sidebar's shimmer never clears while the camera
  // feed's is still up. Any other starting page never mounts CameraFeed,
  // so `cameraStatus` would sit at 'idle' forever; skip the wait there.
  const cameraResolved =
    activePage !== 'camera' || (cameraStatus !== 'idle' && cameraStatus !== 'requesting')

  const showSkeleton = !settingsHydrated || !cameraResolved || !skeletonMinElapsed

  // Scans open the photo viewer instead of navigating into the chat page.
  const openRow = (chat: { id: string; kind?: 'chat' | 'scan' }) =>
    chat.kind === 'scan' ? openScanViewer(chat.id) : selectChat(chat.id)

  const navigateTo = (id: typeof activePage) => setPage(id)

  // Drives every relative timestamp below ("Just now" -> "1m ago" -> …)
  // without any network polling — just a re-render clock.
  const nowMs = useNowTick(30_000)

  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchActive = query.trim().length > 0

  // "Group by" for the Recent list — None (flat, newest first, current
  // behavior) or Date (bucketed into Today/Yesterday/… like Claude's own
  // sidebar). Pinned stays its own section either way.
  const [groupBy, setGroupBy] = useState<GroupByMode>('none')
  const [groupByMenuOpen, setGroupByMenuOpen] = useState(false)
  const groupByBtnRef = useRef<HTMLButtonElement>(null)

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  const toggleSearch = () => {
    setSearchOpen((v) => {
      const next = !v
      if (!next) setQuery('')
      return next
    })
  }

  // Autofocus the field the moment it opens, same as Claude/Kimi's own
  // sidebar search.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recentChats
    return recentChats.filter((c) => c.title.toLowerCase().includes(q))
  }, [recentChats, query])

  const pinnedChats = useMemo(() => filteredChats.filter((c) => c.pinned), [filteredChats])
  const unpinnedChats = useMemo(() => filteredChats.filter((c) => !c.pinned), [filteredChats])

  // Grouped view of the Recent list — bucketed in-order (the list is
  // already newest-first) so each date label only appears once.
  const groupedUnpinnedChats = useMemo(() => {
    if (groupBy !== 'date') return null
    const groups: { label: string; chats: typeof unpinnedChats }[] = []
    for (const chat of unpinnedChats) {
      const label = getDateGroupLabel(chat.createdAt, nowMs)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.chats.push(chat)
      else groups.push({ label, chats: [chat] })
    }
    return groups
  }, [unpinnedChats, groupBy, nowMs])

  // Cmd/Ctrl+B toggles the rail, matching Claude/Kimi's own shortcut.
  // Escape closes an open search field first, before any other Escape
  // handling (shortcuts modal, tour) kicks in.
  useEffect(() => {
    if (onCloseMobile) return // mobile drawer has no collapse state
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebarCollapsed()
      }
      if (e.key === 'Escape' && searchOpen) {
        closeSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCloseMobile, toggleSidebarCollapsed, searchOpen])

  return (
    <SidebarProvider collapsed={collapsed}>
      {showSkeleton ? (
        <SidebarSkeleton collapsed={collapsed} onCloseMobile={onCloseMobile} />
      ) : (
        <>
      {/* Ambient glow behind the header — quiet, futuristic accent */}
      <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-[var(--sp-primary)]/10 blur-[60px] pointer-events-none" />

      {/* Header — the real brand mark (same ring + sparkle used in the
          marketing navbar), not a placeholder icon. Collapsed rail: the
          badge itself is the expand control, swapping to the PanelLeft
          affordance on hover — one element, two states, nothing floats
          on top of it. Expanded: badge + wordmark on the left, a
          dedicated collapse button on the right — that button never
          moves or changes shape, so it's always exactly where expected. */}
      <div className="relative flex items-center h-[52px] shrink-0 px-2.5 gap-2.5">
        {!onCloseMobile ? (
          collapsed ? (
            // Collapsed rail: this badge doubles as the expand control, so
            // hovering swaps the logo for a PanelLeft affordance. Wrapped
            // in the same Tooltip component every other collapsed-rail
            // icon uses (see NewScanButton, ProfileTriggerButton) instead
            // of a native `title` attribute, so it matches their style,
            // timing, and positioning exactly.
            (() => {
              // The trigger is a plain native `<button>` with plain CSS
              // (group-hover) for the logo -> PanelLeft crossfade — no
              // framer-motion component anywhere between Base UI's
              // Trigger and the real DOM node. Every earlier attempt that
              // put a `motion.*` component (even a purely presentational
              // one) inside the element passed to `render` ended up with
              // an inconsistent hover/focus state: framer-motion installs
              // its own pointer listeners for gesture tracking, and with
              // two independent listener stacks on overlapping nodes the
              // popup would sometimes never open, or open then immediately
              // snap shut. Matching ProfileTriggerButton's tree exactly
              // (also zero motion components) is what makes this reliable.
              const expandButton = (
                <button
                  type="button"
                  onClick={toggleSidebarCollapsed}
                  aria-label="Expand sidebar"
                  className="group relative shrink-0 w-8 h-8"
                >
                  <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0">
                    <LogoBadge size={32} />
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--sp-surface)] border border-[var(--sp-border)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <PanelLeft size={15} strokeWidth={2} className="text-[var(--sp-text)]" />
                  </span>
                </button>
              )
              return (
                <Tooltip>
                  <TooltipTrigger render={expandButton} />
                  <TooltipContent side="right" sideOffset={14} align="center" className="z-[60]">
                    <span className="flex items-center gap-3">
                      Expand sidebar
                      <TooltipShortcut>⌘B</TooltipShortcut>
                    </span>
                  </TooltipContent>
                </Tooltip>
              )
            })()
          ) : (
            // Expanded: just the brand mark, no hover state — the toggle
            // action already lives in the dedicated collapse button below,
            // so this no longer needs to fade or be clickable.
            <span className="shrink-0" aria-hidden="true">
              <LogoBadge size={32} />
            </span>
          )
        ) : (
          <LogoBadge size={32} />
        )}

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="font-heading text-[15px] font-bold tracking-tight text-[var(--sp-text)] whitespace-nowrap overflow-hidden"
            >
              Spatial AI
            </motion.span>
          )}
        </AnimatePresence>

        {!collapsed && !onCloseMobile && (
          // No tooltip here by design — the collapse action is already
          // self-evident (a dedicated button that never moves) and a
          // hover label would be redundant so close to the wordmark.
          // The *expand* affordance (collapsed rail) keeps its tooltip
          // since that state doubles up the logo/toggle into one control
          // and benefits from the hint.
          <motion.button
            onClick={toggleSidebarCollapsed}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Collapse sidebar"
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[var(--sp-border)] bg-[var(--sp-surface)] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:border-[var(--sp-border-hover)] hover:text-[var(--sp-text)] transition-colors"
          >
            <PanelLeft size={16} strokeWidth={2} />
          </motion.button>
        )}

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="ml-auto lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] transition-colors shrink-0"
            aria-label="Close navigation"
          >
            {/* Same PanelLeft glyph as the desktop rail's collapse button
                (and the mobile TopBar's open button) — one consistent
                sidebar-toggle icon instead of switching to X here. */}
            <PanelLeft size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Search — toggled by the icon next to "New scan" below. Opens a
          filter field for the Recent/Pinned list right above that button
          (rather than living permanently below it), same collapsible
          pattern Claude/Kimi use for chat search. Only ever shown expanded
          — the icon itself is the collapsed-rail affordance instead. */}
      <AnimatePresence initial={false}>
        {!collapsed && searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="shrink-0 px-2 pt-3 overflow-hidden"
          >
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sp-text-faint)] pointer-events-none" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closeSearch()
                }}
                placeholder="Search scans…"
                className="w-full h-9 rounded-lg bg-[var(--sp-surface)] border border-[var(--sp-border)] pl-8 pr-7 text-[12.5px] text-[var(--sp-text)] placeholder:text-[var(--sp-text-faint)] outline-none focus:border-[var(--sp-primary)]/50 focus:bg-[var(--sp-surface)] transition-colors"
              />
              <button
                onClick={closeSearch}
                aria-label="Close search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-[var(--sp-text-faint)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-hover)] transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New scan — its own section, with real air above and below so it
          doesn't visually fuse with the header above or the nav below.
          Paired with a dedicated search-toggle icon so search reads as
          its own affordance rather than a field that's just always open. */}
      <div className="shrink-0 pt-6 pb-3 px-2 flex items-center gap-1.5">
        <NewScanButton collapsed={collapsed} onClick={startNewChat} />

        {!collapsed && (
          // No tooltip — expanded rail only, control is already labeled
          // by context (search icon next to "New scan").
          <motion.button
            onClick={toggleSearch}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.94, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            aria-label={searchOpen ? 'Close search' : 'Search scans'}
            aria-pressed={searchOpen}
            className={[
              'shrink-0 w-[42px] h-[42px] rounded-xl flex items-center justify-center border transition-colors',
              searchOpen
                ? 'bg-[var(--sp-surface-hover)] border-[var(--sp-border-hover)] text-[var(--sp-text)]'
                : 'bg-[var(--sp-surface)] border-[var(--sp-border)] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)]',
            ].join(' ')}
          >
            <Search size={16} />
          </motion.button>
        )}
      </div>

      {/* Pages — built on the shadcn-style sidebar menu primitives
          (SidebarGroup / SidebarMenu / SidebarMenuButton). Collapsed-rail
          tooltips are wired in automatically via SidebarMenuButton's
          `tooltip` prop, using Base UI's Tooltip under the hood. */}
      <Separator className="mx-2 w-auto" />
      <div className="shrink-0 pt-3 pb-2">
        <SidebarGroup className="pb-1.5">
          <SidebarGroupLabel>Products</SidebarGroupLabel>
        </SidebarGroup>

        <SidebarMenu>
          {sidebarNavItems.map((item) => {
            const Icon = item.icon
            const active = activePage === item.id
            const shortcut = NAV_SHORTCUTS[item.id]
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  tooltipShortcut={shortcut}
                  activeIndicatorId="sidebar-pages-active"
                  onClick={() => navigateTo(item.id)}
                >
                  <Icon size={18} strokeWidth={2} className="shrink-0" />
                  <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  {!collapsed && shortcut && (
                    <span className="ml-auto shrink-0 text-[10px] font-mono text-[var(--sp-text-faint)]/70 opacity-0 group-hover/menu-button:opacity-100 transition-opacity">
                      {shortcut}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </div>

      {/* Recent + Pinned — chat history (hidden while collapsed). The
          pulsing dot + live-updating "Xm ago" labels are the "realtime"
          part: nothing here is polling, it's just a clock re-rendering
          already-known timestamps, same trick Claude/Kimi's own sidebars
          use. Pinned chats surface above everything else, unaffected by
          how recently they were touched. */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 flex flex-col mt-1 pt-2 border-t border-[var(--sp-border)]"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2 no-scrollbar">
              {pinnedChats.length > 0 && (
                <>
                  <SidebarGroup className="px-0.5 pb-1.5 pt-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Pin size={11} className="fill-current text-[var(--sp-primary)]" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sp-text-faint)]">
                        Pinned
                      </span>
                    </div>
                  </SidebarGroup>
                  <SidebarMenu className="px-0 mb-2">
                    {pinnedChats.map((chat) => (
                      <ChatRow
                        key={chat.id}
                        chat={chat}
                        active={
                          chat.kind === 'scan'
                            ? scanViewerId === chat.id
                            : activePage === 'chat' && activeChatId === chat.id
                        }
                        nowMs={nowMs}
                        onSelect={() => openRow(chat)}
                        onTogglePin={() => togglePinChat(chat.id)}
                        onToggleStar={() => toggleStarChat(chat.id)}
                        onRename={(title) => renameChat(chat.id, title)}
                        onDelete={() => deleteChat(chat.id)}
                      />
                    ))}
                  </SidebarMenu>
                </>
              )}

              <SidebarGroup className="px-0.5 pb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--sp-primary)] opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-[var(--sp-primary)]" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sp-text-faint)]">
                    {searchActive ? 'Results' : 'Recent'}
                  </span>
                  <span className="text-[10.5px] text-[var(--sp-text-faint)]/70 tabular-nums">
                    · {unpinnedChats.length}
                  </span>

                  {/* Group by — None / Date, same idea as Claude's own
                      sidebar grouping, just made an explicit toggle here. */}
                  <button
                    ref={groupByBtnRef}
                    onClick={() => setGroupByMenuOpen((v) => !v)}
                    aria-label="Group by"
                    aria-expanded={groupByMenuOpen}
                    className={[
                      'ml-auto shrink-0 flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium transition-colors',
                      groupByMenuOpen
                        ? 'bg-[var(--sp-surface-hover)] text-[var(--sp-text)]'
                        : 'text-[var(--sp-text-faint)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)]',
                    ].join(' ')}
                  >
                    <ListFilter size={11} />
                    {groupBy === 'date' ? 'Date' : 'None'}
                  </button>
                  <AnimatePresence>
                    {groupByMenuOpen && (
                      <GroupByMenu
                        value={groupBy}
                        anchorRef={groupByBtnRef}
                        onChange={setGroupBy}
                        onClose={() => setGroupByMenuOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </SidebarGroup>

              {unpinnedChats.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-[var(--sp-text-faint)]">
                  {searchActive ? `No scans match “${query}”` : 'No scans yet'}
                </div>
              ) : groupedUnpinnedChats ? (
                groupedUnpinnedChats.map((group) => (
                  <div key={group.label}>
                    <SidebarGroup className="px-0.5 pb-1 pt-2.5 shrink-0">
                      <span className="text-[10px] font-medium text-[var(--sp-text-faint)]/80">
                        {group.label}
                      </span>
                    </SidebarGroup>
                    <SidebarMenu className="px-0">
                      {group.chats.map((chat) => (
                        <ChatRow
                          key={chat.id}
                          chat={chat}
                          active={
                            chat.kind === 'scan'
                              ? scanViewerId === chat.id
                              : activePage === 'chat' && activeChatId === chat.id
                          }
                          nowMs={nowMs}
                          onSelect={() => openRow(chat)}
                          onTogglePin={() => togglePinChat(chat.id)}
                          onToggleStar={() => toggleStarChat(chat.id)}
                          onRename={(title) => renameChat(chat.id, title)}
                          onDelete={() => deleteChat(chat.id)}
                        />
                      ))}
                    </SidebarMenu>
                  </div>
                ))
              ) : (
                <SidebarMenu className="px-0">
                  {unpinnedChats.map((chat) => (
                    <ChatRow
                      key={chat.id}
                      chat={chat}
                      active={
                        chat.kind === 'scan'
                          ? scanViewerId === chat.id
                          : activePage === 'chat' && activeChatId === chat.id
                      }
                      nowMs={nowMs}
                      onSelect={() => openRow(chat)}
                      onTogglePin={() => togglePinChat(chat.id)}
                      onToggleStar={() => toggleStarChat(chat.id)}
                      onRename={(title) => renameChat(chat.id, title)}
                      onDelete={() => deleteChat(chat.id)}
                    />
                  ))}
                </SidebarMenu>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {collapsed && <div className="flex-1" />}

      {/* Help & keyboard shortcuts now live only in the profile menu
          (Settings / Keyboard shortcuts / Take the tour) below — this
          footer used to duplicate that entry point. */}

      <ProfileMenu collapsed={collapsed} />
        </>
      )}
    </SidebarProvider>
  )
}

export function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, closeSidebar } = useAppStore()

  return (
    <>
      {/* Desktop rail — width is driven by the shared --sp-sidebar-w CSS var so it
          transitions in perfect lockstep with TopBar's left offset and the main
          content's padding (same property/duration/easing everywhere = no glitch). */}
      <aside
        data-sidebar-container
        style={{ width: 'var(--sp-sidebar-w)' }}
        className="hidden lg:flex lg:flex-col fixed left-0 top-0 bottom-0 border-r border-sidebar-border bg-sidebar z-30 overflow-hidden transition-[width] duration-300 ease-out"
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Collapsing/expanding is handled by the single PanelLeft toggle button
          inside the header — one consistent control in one consistent spot,
          matching how Claude's own sidebar behaves, instead of a second
          floating handle duplicating the same action. */}

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
            />
            <motion.aside
              data-sidebar-container
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[320px] max-w-[85vw] flex flex-col bg-sidebar border-r border-sidebar-border z-50"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <SidebarContent collapsed={false} onCloseMobile={closeSidebar} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

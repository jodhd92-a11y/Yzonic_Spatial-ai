'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Settings2,
  Camera,
  Bell,
  ShieldCheck,
  UserRound,
  Monitor,
  Sun,
  Moon,
  Zap,
  Vibrate,
  Save,
  Flashlight,
  Volume2,
  BellRing,
  Sparkles,
  Trash2,
  Download,
  LogOut,
  ChevronRight,
  Check,
  Globe,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore, SCAN_TEMPLATES, type SettingsTabId } from '@/store/useAppStore'
import { authApi } from '@/lib/auth-api'
import { useRouter } from 'next/navigation'

interface TabDef {
  id: SettingsTabId
  label: string
  icon: LucideIcon
}

// Real, finite language list — the "Language" row picks from this rather
// than just displaying static text with a decorative chevron.
const LANGUAGES = [
  'English (US)',
  'English (UK)',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Hindi',
]

const TABS: TabDef[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'camera', label: 'Camera & Lens', icon: Camera },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: ShieldCheck },
  { id: 'account', label: 'Account', icon: UserRound },
]

// One consistent toggle switch used across every tab — same affordance,
// same motion, so the whole modal reads as one system instead of five
// different settings pages stitched together.
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative w-[38px] h-[22px] rounded-full shrink-0 transition-colors duration-200 outline-none',
        checked ? 'bg-[var(--sp-primary)]' : 'bg-[var(--sp-border-hover)]',
      ].join(' ')}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  )
}

function Row({
  icon: Icon,
  title,
  description,
  control,
  onClick,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  control: React.ReactNode
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 py-3 text-left',
        onClick ? 'hover:bg-[var(--sp-surface)] rounded-lg px-1 -mx-1 transition-colors' : '',
      ].join(' ')}
    >
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-[var(--sp-surface)] border border-[var(--sp-border)] flex items-center justify-center shrink-0 text-[var(--sp-text-dim)]">
          <Icon size={15} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-[var(--sp-text)]">{title}</div>
        {description && (
          <div className="text-[11.5px] text-[var(--sp-text-faint)] mt-0.5 leading-snug">{description}</div>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </Wrapper>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sp-text-faint)] mb-1 mt-5 first:mt-0">
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-[var(--sp-surface)]" />
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string; icon?: LucideIcon }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--sp-surface)] border border-[var(--sp-border)] p-0.5">
      {options.map((opt) => {
        const Icon = opt.icon
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={[
              'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors',
              active ? 'text-black' : 'text-[var(--sp-text-dim)] hover:text-[var(--sp-text)]',
            ].join(' ')}
          >
            {active && (
              <motion.span
                layoutId="segmented-active"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-md bg-[var(--sp-primary)]"
              />
            )}
            {Icon && <Icon size={12} className="relative" />}
            <span className="relative">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Real dropdown for the "Language" row — replaces a chevron that used to
// sit next to static text and do nothing when clicked.
function LanguagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--sp-surface)] border border-[var(--sp-border)] text-[12px] font-medium text-[var(--sp-text)] hover:bg-[var(--sp-surface-hover)] transition-colors"
      >
        {value}
        <ChevronRight size={12} className={['text-[var(--sp-text-faint)] transition-transform', open ? 'rotate-90' : ''].join(' ')} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              role="listbox"
              className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-[var(--sp-border)] bg-[var(--sp-bg-1)] shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-1 z-20"
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  role="option"
                  aria-selected={lang === value}
                  onClick={() => { onChange(lang); setOpen(false) }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[12.5px] text-left text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
                >
                  {lang}
                  {lang === value && <Check size={12} className="text-[var(--sp-primary)]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Staggered reveal for each tab's content — mirrors the light, deliberate
// entrance used by the onboarding tour so every surface in the app feels
// like one consistent, considered motion system.
const contentVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
}

function GeneralTab() {
  const settings = useAppStore((s) => s.settings)
  const update = useAppStore((s) => s.updateSettings)

  return (
    <motion.div variants={contentVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <SectionLabel>Appearance</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          title="Theme"
          description="Controls the app's color scheme"
          control={
            <SegmentedControl
              value={settings.theme}
              onChange={(v) => update({ theme: v })}
              options={[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ]}
            />
          }
        />
      </motion.div>
      <motion.div variants={itemVariants}><Divider /></motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Globe}
          title="Language"
          description="Interface and voice-recognition language"
          control={<LanguagePicker value={settings.language} onChange={(v) => update({ language: v })} />}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Vibrate}
          title="Haptic feedback"
          description="Vibrate on scan capture and key actions"
          control={<Toggle checked={settings.hapticFeedback} onChange={(v) => update({ hapticFeedback: v })} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SectionLabel>Defaults</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Sparkles}
          title="Default scan template"
          description="Applied automatically for new sessions"
          control={
            <select
              value={settings.defaultTemplateId}
              onChange={(e) => update({ defaultTemplateId: e.target.value })}
              className="px-2.5 py-1.5 rounded-md bg-[var(--sp-surface)] border border-[var(--sp-border)] text-[12px] font-medium text-[var(--sp-text)] outline-none hover:bg-[var(--sp-surface-hover)] transition-colors"
            >
              {SCAN_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id} className="bg-[var(--sp-bg-1)] text-[var(--sp-text)]">
                  {t.label}
                </option>
              ))}
            </select>
          }
        />
      </motion.div>
    </motion.div>
  )
}

function CameraTab() {
  const settings = useAppStore((s) => s.settings)
  const update = useAppStore((s) => s.updateSettings)

  return (
    <motion.div variants={contentVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <SectionLabel>Permissions</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Camera}
          title="Camera access"
          description="Required for the Lens and live detection"
          control={
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[11px] font-medium text-emerald-400">
              <Check size={11} /> Allowed
            </span>
          }
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Zap}
          title="Auto-start camera"
          description="Open straight to the live feed on launch"
          control={<Toggle checked={settings.autoStartCamera} onChange={(v) => update({ autoStartCamera: v })} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SectionLabel>Capture</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Flashlight}
          title="Flash by default"
          description="Turn the torch on automatically when scanning in low light"
          control={<Toggle checked={settings.flashDefault} onChange={(v) => update({ flashDefault: v })} />}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Sparkles}
          title="High-accuracy mode"
          description="Slower scans, more precise detections — uses more battery"
          control={<Toggle checked={settings.highAccuracyMode} onChange={(v) => update({ highAccuracyMode: v })} />}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Save}
          title="Save scans to device"
          description="Keep a copy of captured frames in your photo library"
          control={<Toggle checked={settings.saveScansToDevice} onChange={(v) => update({ saveScansToDevice: v })} />}
        />
      </motion.div>
    </motion.div>
  )
}

function NotificationsTab() {
  const settings = useAppStore((s) => s.settings)
  const update = useAppStore((s) => s.updateSettings)

  return (
    <motion.div variants={contentVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <SectionLabel>Push</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={BellRing}
          title="Push notifications"
          description="Get notified about replies and scan results"
          control={<Toggle checked={settings.pushNotifications} onChange={(v) => update({ pushNotifications: v })} />}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Zap}
          title="Scan-complete alerts"
          description="Notify when a background scan finishes"
          control={<Toggle checked={settings.scanCompleteAlerts} onChange={(v) => update({ scanCompleteAlerts: v })} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SectionLabel>Sound</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          icon={Volume2}
          title="Sound effects"
          description="Shutter and UI sounds"
          control={<Toggle checked={settings.soundEffects} onChange={(v) => update({ soundEffects: v })} />}
        />
      </motion.div>
    </motion.div>
  )
}

function PrivacyTab() {
  const settings = useAppStore((s) => s.settings)
  const update = useAppStore((s) => s.updateSettings)
  const recentChats = useAppStore((s) => s.recentChats)
  const clearAllChats = useAppStore((s) => s.clearAllChats)
  const [confirmingClear, setConfirmingClear] = useState(false)

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      scans: recentChats,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spatial-ai-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleClear() {
    if (!confirmingClear) {
      setConfirmingClear(true)
      return
    }
    clearAllChats()
    setConfirmingClear(false)
  }

  return (
    <motion.div variants={contentVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <SectionLabel>Data</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          title="Save chat history"
          description="Keep past conversations in the sidebar"
          control={<Toggle checked={settings.chatHistoryEnabled} onChange={(v) => update({ chatHistoryEnabled: v })} />}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          title="Help improve the model"
          description="Allow anonymized scans to help train future models"
          control={<Toggle checked={settings.improveModelWithData} onChange={(v) => update({ improveModelWithData: v })} />}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          title="Usage analytics"
          description="Share anonymous usage data to help us fix bugs faster"
          control={<Toggle checked={settings.analyticsEnabled} onChange={(v) => update({ analyticsEnabled: v })} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SectionLabel>Manage</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <button
          onClick={handleExport}
          disabled={recentChats.length === 0}
          className="w-full flex items-center gap-3 py-2.5 rounded-lg hover:bg-[var(--sp-surface-hover)] px-1 -mx-1 transition-colors text-left disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--sp-surface)] border border-[var(--sp-border)] flex items-center justify-center shrink-0 text-[var(--sp-text-dim)]">
            <Download size={15} />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-medium text-[var(--sp-text)]">Export my data</div>
            <div className="text-[11.5px] text-[var(--sp-text-faint)]">Download scans and chat history as a file</div>
          </div>
          <ChevronRight size={14} className="text-[var(--sp-text-faint)]" />
        </button>
      </motion.div>
      <motion.div variants={itemVariants}>
        <button
          onClick={handleClear}
          onBlur={() => setConfirmingClear(false)}
          disabled={recentChats.length === 0}
          className="w-full flex items-center gap-3 py-2.5 rounded-lg hover:bg-red-500/[0.06] px-1 -mx-1 transition-colors text-left disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400">
            <Trash2 size={15} />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-medium text-red-400">
              {confirmingClear ? 'Tap again to confirm' : 'Clear all conversations'}
            </div>
            <div className="text-[11.5px] text-[var(--sp-text-faint)]">This can't be undone</div>
          </div>
        </button>
      </motion.div>
    </motion.div>
  )
}

function AccountTab() {
  const user = useAppStore((s) => s.user)
  const clearUser = useAppStore((s) => s.clearUser)
  const clearAllChats = useAppStore((s) => s.clearAllChats)
  const close = useAppStore((s) => s.closeSettings)
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } finally {
      clearUser()
      close()
      router.push('/login')
    }
  }

  function handleChangePassword() {
    close()
    router.push(`/forgot-password${user?.email ? `?email=${encodeURIComponent(user.email)}` : ''}`)
  }

  async function handleDeleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setLoggingOut(true)
    try {
      await authApi.logout()
    } finally {
      clearAllChats()
      clearUser()
      close()
      router.push('/signup')
    }
  }

  return (
    <motion.div variants={contentVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] flex items-center justify-center text-[15px] font-bold text-black shrink-0">
          {user?.avatar ?? '?'}
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--sp-text)] truncate">{user?.name ?? 'Loading…'}</div>
          <div className="text-[12px] text-[var(--sp-text-faint)] truncate">{user?.email}</div>
        </div>
      </motion.div>
      <motion.div variants={itemVariants}><Divider /></motion.div>

      <motion.div variants={itemVariants}>
        <Row
          title="Plan"
          control={
            <span className="px-2.5 py-1 rounded-full bg-[var(--sp-primary)]/15 text-[11px] font-semibold text-[var(--sp-primary)]">
              {user?.plan ?? 'Free'}
            </span>
          }
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          title="Change password"
          onClick={handleChangePassword}
          control={<ChevronRight size={14} className="text-[var(--sp-text-faint)]" />}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Row
          title="Manage connected devices"
          description="This device only — device management isn't available yet"
          control={<span className="text-[10.5px] font-medium text-[var(--sp-text-faint)] uppercase tracking-wide">Soon</span>}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SectionLabel>Session</SectionLabel>
      </motion.div>
      <motion.div variants={itemVariants}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 py-2.5 rounded-lg hover:bg-red-500/[0.06] px-1 -mx-1 transition-colors text-left text-red-400 disabled:opacity-50"
        >
          <LogOut size={15} />
          <span className="text-[13.5px] font-medium">{loggingOut ? 'Signing out…' : 'Log out'}</span>
        </button>
      </motion.div>
      <motion.div variants={itemVariants}>
        <button
          onClick={handleDeleteAccount}
          onBlur={() => setConfirmingDelete(false)}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 py-2.5 rounded-lg hover:bg-red-500/[0.06] px-1 -mx-1 transition-colors text-left text-red-500/70 disabled:opacity-50"
        >
          <Trash2 size={15} />
          <span className="text-[13.5px] font-medium">{confirmingDelete ? 'Tap again to confirm' : 'Delete account'}</span>
        </button>

      </motion.div>
    </motion.div>
  )
}

export function SettingsModal() {
  const open = useAppStore((s) => s.settingsOpen)
  const close = useAppStore((s) => s.closeSettings)
  const tab = useAppStore((s) => s.settingsTab)
  const setTab = useAppStore((s) => s.setSettingsTab)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Settings"
            className="w-full h-full sm:h-[min(600px,85vh)] sm:max-w-[720px] rounded-none sm:rounded-[var(--sp-radius-lg)] border-0 sm:border border-[var(--sp-border)] bg-[var(--sp-bg-1)] sm:bg-[var(--sp-bg-1)]/97 shadow-[0_24px_70px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col sm:flex-row"
            style={{ paddingTop: 'var(--sp-safe-top)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Tab rail — vertical column with a title on desktop; on
                mobile it collapses into a horizontally-scrollable pill
                row (the title moves into the content header instead,
                where there's room for the close button alongside it). */}
            <div className="w-full sm:w-[200px] sm:shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--sp-border)] bg-[var(--sp-surface)] flex flex-col shrink-0">
              <div className="hidden sm:block px-2.5 pb-3 pt-1 mt-3 mx-2 text-[15px] font-heading font-semibold text-[var(--sp-text)]">
                Settings
              </div>
              <div className="flex flex-row sm:flex-col gap-0.5 overflow-x-auto no-scrollbar px-2 py-2 sm:px-2 sm:py-0 sm:pb-3">
                {TABS.map((t) => {
                  const Icon = t.icon
                  const active = t.id === tab
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className="relative shrink-0 sm:w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-2.5 py-2 rounded-lg text-[12.5px] sm:text-[13px] font-medium text-left whitespace-nowrap transition-colors"
                    >
                      {active && (
                        <motion.span
                          layoutId="settings-tab-active"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[var(--sp-surface-hover)] border border-[var(--sp-border)]"
                        />
                      )}
                      <Icon
                        size={15}
                        className={['relative shrink-0', active ? 'text-[var(--sp-primary)]' : 'text-[var(--sp-text-faint)]'].join(' ')}
                      />
                      <span className={['relative', active ? 'text-[var(--sp-text)]' : 'text-[var(--sp-text-dim)]'].join(' ')}>
                        {t.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              <div className="flex items-center justify-between sm:justify-end px-4 sm:px-5 py-3 border-b border-[var(--sp-border)] shrink-0">
                <span className="sm:hidden text-[14px] font-semibold text-[var(--sp-text)]">
                  {TABS.find((t) => t.id === tab)?.label ?? 'Settings'}
                </span>
                <button
                  onClick={close}
                  aria-label="Close settings"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--sp-text-faint)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 no-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div key={tab}>
                    {tab === 'general' && <GeneralTab />}
                    {tab === 'camera' && <CameraTab />}
                    {tab === 'notifications' && <NotificationsTab />}
                    {tab === 'privacy' && <PrivacyTab />}
                    {tab === 'account' && <AccountTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

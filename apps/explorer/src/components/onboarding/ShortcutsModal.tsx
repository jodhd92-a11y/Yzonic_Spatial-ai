'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Command, X, Keyboard } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface ShortcutRow {
  keys: string[]
  label: string
}

interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    rows: [
      { keys: ['⌘', '1'], label: 'Go to Camera' },
      { keys: ['⌘', '2'], label: 'Go to Chat' },
      { keys: ['⌘', 'B'], label: 'Collapse / expand sidebar' },
    ],
  },
  {
    title: 'Chat',
    rows: [
      { keys: ['⌘', 'K'], label: 'Start a new chat' },
      { keys: ['Esc'], label: 'Close menus & dialogs' },
    ],
  },
  {
    title: 'Help',
    rows: [
      { keys: ['?'], label: 'Open this shortcuts guide' },
    ],
  },
]

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="min-w-[26px] h-[26px] px-1.5 inline-flex items-center justify-center rounded-md border border-[var(--sp-border)] bg-[var(--sp-surface)] text-[12px] font-mono font-medium text-[var(--sp-text)] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
      {children}
    </kbd>
  )
}

export function ShortcutsModal() {
  const open = useAppStore((s) => s.shortcutsOpen)
  const close = useAppStore((s) => s.closeShortcuts)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[var(--sp-radius-lg)] border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/95 shadow-[0_24px_70px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--sp-border)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--sp-primary)]/15 flex items-center justify-center shrink-0">
                <Keyboard size={16} className="text-[var(--sp-primary)]" />
              </div>
              <h2 className="flex-1 font-heading text-[15px] font-semibold text-[var(--sp-text)]">
                Keyboard shortcuts
              </h2>
              <button
                onClick={close}
                aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--sp-text-faint)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 flex flex-col gap-5 no-scrollbar">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sp-text-faint)] mb-2">
                    {group.title}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {group.rows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 py-0.5">
                        <span className="text-[13.5px] text-[var(--sp-text-dim)]">{row.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {row.keys.map((k, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <KeyCap>{k}</KeyCap>
                              {i < row.keys.length - 1 && (
                                <span className="text-[var(--sp-text-faint)] text-[11px]">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-5 py-3 border-t border-[var(--sp-border)] text-[11.5px] text-[var(--sp-text-faint)]">
              <Command size={12} />
              Press <KeyCap>?</KeyCap> anytime to bring this back up
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

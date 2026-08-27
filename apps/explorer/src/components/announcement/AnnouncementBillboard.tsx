'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { LogoBadge } from '@/components/ui/LogoMark'

/**
 * Deliberately plain: a single quick fade + settle, no clip-path reveal,
 * no looping ambient blobs, no rotating rings, no staggered per-line
 * choreography. It should just appear — the same restrained, near-instant
 * open Claude uses for its own dialogs — not perform a loading sequence.
 */
export function AnnouncementBillboard() {
  const open = useAppStore((s) => s.announcementOpen)
  const dismiss = useAppStore((s) => s.dismissAnnouncement)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-[var(--sp-radius-lg)] border border-[var(--sp-border)] bg-[var(--sp-bg-1)] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <button
              onClick={dismiss}
              aria-label="Close announcement"
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center text-[var(--sp-text-faint)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors z-10"
            >
              <X size={15} />
            </button>

            <div className="px-6 pt-6 pb-5">
              <LogoBadge size={36} className="mb-4" />

              <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--sp-surface)] border border-[var(--sp-border)] text-[10px] font-mono uppercase tracking-wider text-[var(--sp-text-faint)] mb-2.5">
                Work in progress
              </span>
              <h2 className="font-heading text-[17px] font-semibold text-[var(--sp-text)] mb-2">
                Spatial AI is still under development
              </h2>
              <p className="text-[13.5px] leading-relaxed text-[var(--sp-text-dim)]">
                You&rsquo;re looking at an early build. Some features are placeholders, things may
                change shape, and a few corners are still rough — thanks for exploring it with us.
              </p>
            </div>

            <div className="grid grid-cols-2 border-t border-[var(--sp-border)]">
              <button
                onClick={dismiss}
                className="py-3.5 text-[13.5px] font-medium text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors border-r border-[var(--sp-border)]"
              >
                Skip
              </button>
              <button
                onClick={dismiss}
                className="py-3.5 text-[13.5px] font-semibold text-[var(--sp-primary)] hover:bg-[var(--sp-primary)]/10 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

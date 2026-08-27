'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

// Fired from useBackButtonGuard when the back button is pressed while
// already on the camera (home) page — the one place the guard lets a
// back press actually mean "leave the app" rather than "go home".
export function ExitConfirmModal() {
  const open = useAppStore((s) => s.exitConfirmOpen)
  const close = useAppStore((s) => s.closeExitConfirm)

  function handleExit() {
    close()
    // Best-effort close (only works for tabs the script itself opened).
    window.close()
    // Most browsers ignore that for a normally-opened tab, so fall back
    // to actually walking back out of the app's history a moment later —
    // past the guard's own re-armed entries — instead of leaving the
    // person stuck looking at a dialog that did nothing.
    setTimeout(() => {
      window.history.go(-2)
    }, 150)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] rounded-[var(--sp-radius-lg)] border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/95 shadow-[0_24px_70px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-5 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--sp-primary)]/15 flex items-center justify-center">
                <LogOut size={18} className="text-[var(--sp-primary)]" />
              </div>
              <h2 className="font-heading text-[15px] font-semibold text-[var(--sp-text)]">
                Do you want to exit?
              </h2>
            </div>

            <div className="flex items-center gap-2.5 px-5 pb-5">
              <button
                onClick={close}
                className="flex-1 h-10 rounded-lg text-[13.5px] font-medium border border-[var(--sp-border)] text-[var(--sp-text-dim)] hover:bg-[var(--sp-surface-hover)] transition-colors"
              >
                No
              </button>
              <button
                onClick={handleExit}
                className="flex-1 h-10 rounded-lg text-[13.5px] font-medium bg-[var(--sp-primary)] text-[var(--sp-bg-0)] hover:opacity-90 transition-opacity"
              >
                Yes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

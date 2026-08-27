'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, Wand2, Trash2, Pin, PinOff, Star, Pencil, Check } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useNowTick, formatRelativeTime } from '@/hooks/useRelativeTime'
import { PhotoCustomizePanelPortal } from '@/components/camera/PhotoCustomizePanel'

export function ScanViewerModal() {
  const scanViewerId = useAppStore((s) => s.scanViewerId)
  const recentChats = useAppStore((s) => s.recentChats)
  const closeScanViewer = useAppStore((s) => s.closeScanViewer)
  const startChatFromScan = useAppStore((s) => s.startChatFromScan)
  const deleteChat = useAppStore((s) => s.deleteChat)
  const togglePinChat = useAppStore((s) => s.togglePinChat)
  const toggleStarChat = useAppStore((s) => s.toggleStarChat)
  const renameChat = useAppStore((s) => s.renameChat)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  // Keyed by scan id below (see render), so switching to a different scan
  // remounts this local rename state fresh instead of needing an effect
  // to reset it.
  const [renaming, setRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const nowMs = useNowTick(30_000)

  const scan = recentChats.find((c) => c.id === scanViewerId)

  // Focus + select the field the moment rename mode turns on. No setState
  // here, just imperative DOM focus, so it stays a plain effect.
  useEffect(() => {
    if (renaming) renameInputRef.current?.select()
  }, [renaming])

  const startRename = () => {
    if (!scan) return
    setDraftTitle(scan.title)
    setRenaming(true)
  }

  const commitRename = () => {
    if (scan && draftTitle.trim()) renameChat(scan.id, draftTitle)
    setRenaming(false)
  }

  return (
    <AnimatePresence>
      {scan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            // Only the backdrop itself should close the viewer — anything
            // nested (the scan card, and especially the customize panel
            // rendered as a sibling below) must never bubble into this.
            // Relying on children individually calling stopPropagation is
            // fragile; checking the actual click target is not.
            if (e.target === e.currentTarget) closeScanViewer()
          }}
        >
          <motion.div
            key={scan.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[var(--sp-radius-lg)] border border-[var(--sp-border)] bg-[var(--sp-bg-1)] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
          >
            <button
              onClick={closeScanViewer}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>

            {scan.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scan.thumbnail} alt={scan.title} className="w-full max-h-[50vh] object-cover" />
            ) : (
              <div className="w-full h-40 flex items-center justify-center text-[var(--sp-text-faint)] text-[13px]">
                No photo saved for this scan
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                {renaming ? (
                  <input
                    ref={renameInputRef}
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenaming(false)
                    }}
                    onBlur={commitRename}
                    className="flex-1 min-w-0 h-8 rounded-lg bg-[var(--sp-surface)] border border-[var(--sp-primary)]/50 px-2.5 text-[15px] font-semibold text-[var(--sp-text)] outline-none"
                  />
                ) : (
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--sp-text)]">{scan.title}</h3>
                    <p className="text-[12px] text-[var(--sp-text-faint)] mt-0.5 tabular-nums">
                      {formatRelativeTime(scan.createdAt, nowMs)}
                    </p>
                  </div>
                )}
                {!renaming && scan.starred && <Star size={14} className="fill-current text-amber-400 shrink-0 mt-1" />}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => startChatFromScan(scan.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--sp-radius-sm)] bg-[var(--sp-primary)] text-black text-[13px] font-semibold"
                >
                  <MessageSquare size={14} /> Chat about this
                </button>
                {scan.thumbnail && (
                  <button
                    onClick={() => setCustomizeOpen(true)}
                    aria-label="Customize photo"
                    className="w-10 h-10 rounded-[var(--sp-radius-sm)] bg-[var(--sp-surface)] hover:bg-[var(--sp-surface-hover)] border border-[var(--sp-border)] text-[var(--sp-text)] flex items-center justify-center transition-colors"
                  >
                    <Wand2 size={15} />
                  </button>
                )}
                <button
                  onClick={() => (renaming ? commitRename() : startRename())}
                  aria-label={renaming ? 'Save name' : 'Rename scan'}
                  className={[
                    'w-10 h-10 rounded-[var(--sp-radius-sm)] border flex items-center justify-center transition-colors',
                    renaming
                      ? 'bg-[var(--sp-primary)]/15 border-[var(--sp-primary)]/40 text-[var(--sp-primary)]'
                      : 'bg-[var(--sp-surface)] hover:bg-[var(--sp-surface-hover)] border-[var(--sp-border)] text-[var(--sp-text)]',
                  ].join(' ')}
                >
                  {renaming ? <Check size={15} /> : <Pencil size={15} />}
                </button>
                <button
                  onClick={() => toggleStarChat(scan.id)}
                  aria-label={scan.starred ? 'Unstar' : 'Star'}
                  className={[
                    'w-10 h-10 rounded-[var(--sp-radius-sm)] border flex items-center justify-center transition-colors',
                    scan.starred
                      ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                      : 'bg-[var(--sp-surface)] hover:bg-[var(--sp-surface-hover)] border-[var(--sp-border)] text-[var(--sp-text)]',
                  ].join(' ')}
                >
                  <Star size={15} className={scan.starred ? 'fill-current' : ''} />
                </button>
                <button
                  onClick={() => togglePinChat(scan.id)}
                  aria-label={scan.pinned ? 'Unpin' : 'Pin'}
                  className={[
                    'w-10 h-10 rounded-[var(--sp-radius-sm)] border flex items-center justify-center transition-colors',
                    scan.pinned
                      ? 'bg-[var(--sp-primary)]/15 border-[var(--sp-primary)]/40 text-[var(--sp-primary)]'
                      : 'bg-[var(--sp-surface)] hover:bg-[var(--sp-surface-hover)] border-[var(--sp-border)] text-[var(--sp-text)]',
                  ].join(' ')}
                >
                  {scan.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                </button>
                <button
                  onClick={() => deleteChat(scan.id)}
                  aria-label="Delete scan"
                  className="w-10 h-10 rounded-[var(--sp-radius-sm)] bg-[var(--sp-surface)] hover:bg-red-500/10 border border-[var(--sp-border)] text-red-400 flex items-center justify-center transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </motion.div>

          <PhotoCustomizePanelPortal
            photo={scan.thumbnail ?? null}
            title={scan.title}
            open={customizeOpen}
            onClose={() => setCustomizeOpen(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

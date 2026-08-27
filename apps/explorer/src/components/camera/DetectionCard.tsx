'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Wand2, X, ZoomIn } from 'lucide-react'
import { Magnetic } from '@/components/ui/Magnetic'

export interface Detection {
  label: string
  distance: string
  confidence: number
}

interface DetectionCardProps {
  detection: Detection | null
  /** Thumbnail of the frame that was actually captured — shown as the
   * result itself (a liquid-glass reveal of the real photo) instead of a
   * generic object-scan summary card. */
  photo?: string | null
  /** Unique id for this specific capture (e.g. the scan id). Used to key
   * the card's entrance animation so a *new* capture always replays the
   * glass reflection sweep — without this, re-scanning while the card is
   * already open just updates the same mounted instance in place and the
   * one-time entrance/reflection animation never fires again after the
   * very first capture. */
  captureId?: string | null
  onChat?: () => void
  onCustomize?: () => void
  onDismiss?: () => void
  hasPhoto?: boolean
}

// Magnetic, spring-tappy glass action button — Chat/Customize read as one
// connected, alive control group instead of static pills.
function GlassAction({
  icon: Icon,
  label,
  onClick,
  primary,
  tourId,
}: {
  icon: typeof MessageSquare
  label: string
  onClick?: () => void
  primary?: boolean
  /** Anchors the guided tour's spotlight to this exact button. */
  tourId?: string
}) {
  return (
    <Magnetic strength={10} className="flex-1">
      <motion.button
        onClick={onClick}
        aria-label={label}
        data-tour={tourId}
        whileHover={{ scale: 1.035 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        className={[
          'w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[14px] text-[12.5px] font-semibold',
          primary ? 'glass-btn-primary' : 'glass-btn text-[var(--sp-text)]',
        ].join(' ')}
      >
        <Icon size={14} />
        {label}
      </motion.button>
    </Magnetic>
  )
}

// A single one-shot pass of light across the glass, the "this just
// materialized" cue. Self-contained: mounts visible, and removes itself
// from the tree the instant its own sweep animation finishes. Give it a
// fresh `key` per capture (see DetectionCard) and React does the rest —
// remounting hands it brand-new local state automatically, so there's no
// effect-driven setState and no way for the same instance to replay.
function SpecularSweep() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <motion.div
      aria-hidden
      initial={{ x: '-120%' }}
      animate={{ x: '220%' }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
      onAnimationComplete={() => setVisible(false)}
      className="absolute inset-y-0 w-1/3 pointer-events-none z-10"
      style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.35), transparent)' }}
    />
  )
}

function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const r = 13
  const c = 2 * Math.PI * r
  const color = pct >= 85 ? 'var(--qc-good)' : pct >= 65 ? 'var(--qc-warn)' : 'var(--qc-bad)'
  return (
    <div className="relative w-8 h-8 shrink-0">
      <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
        <motion.circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-bold" style={{ color }}>
        {pct}
      </span>
    </div>
  )
}

export function DetectionCard({ detection, photo, captureId, onChat, onCustomize, onDismiss, hasPhoto }: DetectionCardProps) {
  const [zoomed, setZoomed] = useState(false)
  const sweepKey = captureId ?? photo ?? 'capture'

  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomed(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  return (
    <>
      <AnimatePresence mode="wait">
        {detection && (
          <motion.div
            key={sweepKey}
            initial={{ opacity: 0, x: -24, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.7 }}
            className="absolute left-3 sm:left-4 top-[calc(var(--sp-safe-top,0px)+56px)] w-[218px] sm:w-[240px] z-20"
          >
            <div data-tour="detection-card" className="glass-panel-strong rounded-[20px] overflow-hidden relative">
              {/* Specular sweep on entrance — a single pass of light across
                  the glass, the "this just materialized" cue. `SpecularSweep`
                  is keyed by `sweepKey` (below), so React gives it fresh,
                  isolated local state per capture — it starts visible,
                  removes itself from the tree the instant its own animation
                  completes (see the component), and a *new* capture remounts
                  a brand-new instance rather than reusing old state. That
                  makes a second play structurally impossible without a new
                  photo, with no effect-driven setState involved. */}
              <SpecularSweep key={sweepKey} />

              {/* Header strip */}
              <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--qc-good)', animation: 'sp-live-pulse 1.6s ease-in-out infinite' }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--qc-good)' }} />
                  </span>
                  <p className="text-[9.5px] font-bold tracking-[0.08em] uppercase truncate" style={{ color: 'var(--sp-text-faint)' }}>
                    Capture
                  </p>
                </div>
                {onDismiss && (
                  <motion.button
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 glass-btn"
                    style={{ color: 'var(--sp-text-faint)' }}
                  >
                    <X size={10} />
                  </motion.button>
                )}
              </div>

              {/* Compact photo strip — tap to zoom into a full lightbox
                  instead of a tall inline preview, so the card stays low. */}
              <button
                onClick={() => photo && setZoomed(true)}
                data-tour="detection-photo"
                className="relative mx-2.5 rounded-[13px] overflow-hidden border block w-[calc(100%-20px)] group"
                style={{ borderColor: 'var(--lg-border)' }}
                aria-label="Zoom capture"
              >
                {photo ? (
                  <motion.img
                    key={photo}
                    src={photo}
                    alt="Captured frame"
                    initial={{ filter: 'blur(14px) saturate(0.7)', scale: 1.15, opacity: 0 }}
                    animate={{ filter: 'blur(0px) saturate(1)', scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-full h-[92px] object-cover block"
                  />
                ) : (
                  <div className="w-full h-[92px] bg-[var(--sp-bg-2)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1.5">
                  <span className="flex items-center gap-1 text-[9.5px] font-semibold text-white/90">
                    <ZoomIn size={10} /> Tap to zoom
                  </span>
                </div>
              </button>

              {/* Compact readout — confidence ring + label on one line */}
              <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
                <ConfidenceRing value={detection.confidence} />
                <p className="text-[11.5px] font-semibold leading-snug line-clamp-2 min-w-0" style={{ color: 'var(--sp-text)' }}>
                  {detection.label}
                </p>
              </div>

              {/* Connected actions */}
              {(onChat || onCustomize) && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.18 }}
                  className="flex items-center gap-1.5 px-2.5 pt-2 pb-2.5"
                >
                  {onChat && <GlassAction icon={MessageSquare} label="Chat" onClick={onChat} primary tourId="chat-button" />}
                  {onCustomize && hasPhoto && (
                    <GlassAction icon={Wand2} label="Studio" onClick={onCustomize} tourId="customize-button" />
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen zoom lightbox — shared-element style pop from the
          thumbnail, dismiss by tap/backdrop/Escape. */}
      <AnimatePresence>
        {zoomed && photo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            className="fixed inset-0 z-[95] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          >
            <motion.img
              src={photo}
              alt="Captured frame — zoomed"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            />
            <motion.button
              onClick={() => setZoomed(false)}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              aria-label="Close zoom"
              className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center glass-btn"
              style={{ color: '#fff' }}
            >
              <X size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

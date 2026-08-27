'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine,
  LayoutTemplate,
  Sliders,
  Mic,
  SlidersHorizontal,
  Zap,
  Sparkles,
  MessageSquare,
  Wand2,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Play,
  Pause,
  MousePointerClick,
  ListChecks,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { onboardingLog } from '@/lib/onboarding-debug'

interface TourStep {
  /** Matches a `data-tour="…"` attribute on the real element to spotlight.
   * `null` means this step has no single live target — it centers itself. */
  target: string | null
  icon: LucideIcon
  eyebrow: string
  title: string
  body: string
  /** When true, actually using the highlighted control (a real click)
   * completes the step and auto-advances — the tour rewards *doing*,
   * not just reading. The spotlight never blocks the click; it passes
   * straight through to the real button underneath. */
  interactive?: boolean
  /** Overrides which `data-tour` the real click has to land inside of to
   * complete the step, when that's narrower than what's being spotlit.
   * E.g. the whole template picker panel is spotlit (`target`), but the
   * step should only complete when a workflow is actually chosen
   * (`clickTarget: 'template-option'`), not on any click inside the
   * panel (search box, category pill, etc). Falls back to `target`. */
  clickTarget?: string
  hint?: string
  /** Shown instead of the generic "lights up once available" note when
   * this step's target isn't in the DOM yet — e.g. the template picker
   * and detection card don't exist until something else is opened or
   * scanned first, and each needs its own explanation of what that is. */
  previewNote?: string
}

// Kept in sync with TOUR_STEP_COUNT in store/useAppStore.ts. Every step
// points at a real, currently-rendered element in CameraFeed (via
// data-tour="…") — there is no generic "point it at anything" filler.
// Steps 8–10 spotlight the detection card / its actions, which only exist
// in the DOM after a first scan, and step 4 spotlights the template
// picker panel, which only exists once it's been opened from the "+"
// menu — see the "no target found" fallback below for what happens when
// someone runs the tour before either has appeared yet.
const TOUR_STEPS: TourStep[] = [
  {
    target: 'viewfinder',
    icon: ScanLine,
    eyebrow: 'Live feed',
    title: 'This is your live clinical lens',
    body: 'Point the camera at a wound, a specimen, a monitor, a slide, or a label — Clinical Lens reads whatever is in frame. Swipe right anywhere on the feed (or press → on a keyboard) to flip between front and back cameras.',
  },
  {
    target: 'template-badge',
    icon: LayoutTemplate,
    eyebrow: 'Workflow',
    title: 'Know your workflow at a glance',
    body: 'This pill always shows the active scan template. It decides exactly what the camera looks for and which presets open afterward — Wound Care, Dermatology, Vitals & Monitor, Specimen, Microscopy, Gel/Blot, and more.',
  },
  {
    target: 'menu-button',
    icon: Sliders,
    eyebrow: 'Capture tools',
    title: 'Switch workflow, or hit the torch',
    body: 'Tap + to open Capture tools — change the scan workflow or toggle the device torch, without ever leaving the live feed.',
    interactive: true,
    hint: 'Try it — tap the + button to open it.',
  },
  {
    target: 'template-picker',
    clickTarget: 'template-option',
    icon: ListChecks,
    eyebrow: 'Workflow',
    title: 'Pick the workflow that matches the shot',
    body: 'From "+" → Set template: search or browse by category, then tap a workflow to make it active. It decides exactly what the lens looks for and which presets open afterward — the badge in the corner always reflects your pick.',
    interactive: true,
    hint: 'Try it — tap any workflow to select it.',
    previewNote: 'Preview — opens from the + menu → Set template.',
  },
  {
    target: 'mic-button',
    icon: Mic,
    eyebrow: 'Voice',
    title: 'Or just ask out loud',
    body: 'Tap the mic and speak naturally — "measure this wound" or "read this monitor" — and Clinical Lens acts on whatever your camera currently sees.',
    interactive: true,
    hint: 'Try it — tap the mic once to see it listen.',
  },
  {
    target: 'model-picker',
    icon: SlidersHorizontal,
    eyebrow: 'Model',
    title: 'Pick a model, right where you scan',
    body: 'The model picker lives in the control bar next to Lens, so you can switch models mid-shift without ever leaving the camera.',
    interactive: true,
    hint: 'Try it — tap the model chip to see the list.',
  },
  {
    target: 'lens-button',
    icon: Zap,
    eyebrow: 'Capture',
    title: 'Tap Lens to scan',
    body: 'The glowing Lens button scans the center of frame. While it works, the reticle locks on with a targeting grid and a live confidence readout — High-accuracy mode (in Settings) trades a couple of extra seconds for a more deliberate read.',
    interactive: true,
    hint: 'Try it — tap Lens to run a real scan.',
  },
  {
    target: 'detection-card',
    clickTarget: 'detection-photo',
    icon: Sparkles,
    eyebrow: 'Result',
    title: 'Results arrive as a live card',
    body: 'Every completed scan lands here: a thumbnail of the exact frame that was captured, a color-coded confidence ring (green = high, amber = review, red = low), and the finding itself. Dismiss it anytime with the X in the corner.',
    interactive: true,
    hint: 'Try it — tap the photo to zoom in full-screen.',
    previewNote: 'Preview — this lights up once you run a scan.',
  },
  {
    target: 'chat-button',
    icon: MessageSquare,
    eyebrow: 'Handoff',
    title: '"Chat" carries the whole case with it',
    body: 'Opens the assistant with this photo, the active workflow, and everything already entered in Case Info — case ID, body site, modality, notes — attached from the start. Nothing to retype.',
    interactive: true,
    hint: 'Try it — tap Chat once you have a result.',
  },
  {
    target: 'customize-button',
    icon: Wand2,
    eyebrow: 'Studio',
    title: '"Studio" opens the full editor',
    body: 'Adjust exposure and crop, draw measurements or redactions right on the photo, review AI-suggested findings (nothing is added until you explicitly accept it), fill in Case Info, then export — all from one panel.',
    interactive: true,
    hint: 'Try it — tap Studio once you have a result.',
  },
  {
    target: null,
    icon: Keyboard,
    eyebrow: 'Shortcuts',
    title: 'Shortcuts for everything',
    body: 'Press ? anytime to see the full list — flip camera, scan, jump between pages, toggle the sidebar, and more. That\'s the whole tour — you\'re ready to document.',
  },
]

const AUTO_ADVANCE_MS = 6500
const SPOTLIGHT_PAD = 10

function getTargetRect(target: string | null): DOMRect | null {
  if (!target || typeof document === 'undefined') return null
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) {
    onboardingLog('tour:target-not-found', { target })
    return null
  }
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    onboardingLog('tour:target-zero-size', { target })
    return null
  }
  return rect
}

/**
 * The guided tour for the camera feed. A genuine coach-mark spotlight —
 * not a sidebar panel — that finds and rings real, currently-rendered
 * controls (via `data-tour`) with a dimmed cutout, the same trick the
 * Studio's first-visit tour uses. Two things push this further than a
 * typical product tour:
 *
 * 1. It's click-through. The scrim never captures pointer events, so the
 *    live feed and every highlighted control stay fully usable while a
 *    step is open — scanning something mid-tour just works.
 * 2. It rewards doing. On "interactive" steps, actually clicking the
 *    highlighted control (not the tour's own Next button) is detected in
 *    real time and completes the step with a confirmation pulse before
 *    auto-advancing — so the tour can be *driven* rather than just read.
 *
 * Non-linear too: the step rail along the top of the card can be clicked
 * directly to jump to any step, forward or back.
 */
export function TourGuide() {
  const open = useAppStore((s) => s.tourOpen)
  const step = useAppStore((s) => s.tourStep)
  const next = useAppStore((s) => s.nextTourStep)
  const prev = useAppStore((s) => s.prevTourStep)
  const goTo = useAppStore((s) => s.goToTourStep)
  const end = useAppStore((s) => s.endTour)
  const openShortcuts = useAppStore((s) => s.openShortcuts)

  const [rect, setRect] = useState<DOMRect | null>(null)
  const [paused, setPaused] = useState(false)
  const [autoPlay, setAutoPlay] = useState(true)
  const [completed, setCompleted] = useState(false)
  const advancedForStep = useRef(false)
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Real, measured height of the tooltip card — steps vary a lot (some
  // have a hint chip, a previewNote, or both; body copy length differs
  // too), so a single hardcoded height estimate for the placement math
  // below was frequently wrong, and being wrong in the "place above"
  // direction meant the card's *bottom* edge landed past the spotlight's
  // top edge — the card visually overlapping the very control it was
  // pointing at. Measuring the actual rendered card and re-measuring
  // whenever its content changes (step change, hint chip appearing,
  // completed banner, etc.) keeps the placement math honest.
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(260)
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (h) setCardH(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1
  const Icon = current?.icon ?? ScanLine

  const handleNext = useCallback(() => {
    if (isLast) {
      openShortcuts()
      end()
    } else {
      next()
    }
  }, [isLast, next, end, openShortcuts])

  // --- live target tracking ------------------------------------------------
  // Re-measures on step change, on resize/scroll, and via a light rAF loop
  // while the tour is open — several of these targets sit inside their own
  // entrance animations or expanding menus, so a one-shot measurement on
  // mount would go stale the moment anything moves.
  useEffect(() => {
    if (!open) return
    advancedForStep.current = false
    setCompleted(false)
    let raf: number
    const measure = () => {
      setRect(getTargetRect(current?.target ?? null))
      raf = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step])

  // --- "do it, don't just read it" -----------------------------------------
  // Capture-phase listener that never intercepts the click (no
  // preventDefault/stopPropagation) — it only watches. A real click on the
  // current step's target completes the step with a confirmation pulse and
  // auto-advances shortly after, instead of requiring "Next" too.
  useEffect(() => {
    const clickSel = current?.clickTarget ?? current?.target
    if (!open || !current?.interactive || !clickSel) return
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null
      if (!el?.closest(`[data-tour="${clickSel}"]`)) return
      if (advancedForStep.current) return
      advancedForStep.current = true
      setCompleted(true)
      window.setTimeout(() => handleNext(), 700)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [open, step, current, handleNext])

  // --- keyboard navigation --------------------------------------------------
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); handleNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (step > 0) prev() }
      else if (e.key === 'Escape') { e.preventDefault(); end() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step, prev, end, handleNext])

  const spotlight = rect
    ? { top: rect.top - SPOTLIGHT_PAD, left: rect.left - SPOTLIGHT_PAD, width: rect.width + SPOTLIGHT_PAD * 2, height: rect.height + SPOTLIGHT_PAD * 2 }
    : null

  // Tooltip placement: fixed to the right-middle of the camera feed for
  // every step, instead of chasing each target above/below it. The
  // spotlight ring still moves to whichever control is live — only the
  // *card* stays anchored, so the tour reads as one steady guide panel
  // docked beside the feed rather than a tooltip hopping around the
  // screen step to step.
  const CARD_GAP = 16
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400
  const cardW = Math.min(336, viewportW - 24)

  // Vertically centered within the camera feed area (below the topbar,
  // above the mobile bottom nav — the feed's actual visible bounds), and
  // pinned to the right edge with a fixed gap. Clamped so it can never
  // run off-screen on narrow viewports.
  const feedTop = 60 // --sp-topbar-h
  const feedBottom = viewportW < 1024 ? 64 : 0 // --sp-bottomnav-h, mobile only
  const feedCenterY = feedTop + (viewportH - feedTop - feedBottom) / 2
  const cardTop = Math.max(16, Math.min(viewportH - cardH - 16, feedCenterY - cardH / 2))
  const cardLeft = Math.max(12, viewportW - cardW - CARD_GAP)

  useEffect(() => {
    if (!open || !spotlight) return
    onboardingLog('tour:placement', {
      step,
      target: current?.target,
      spotlight,
      cardH,
      cardTop,
      viewportH,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, cardH, cardTop])

  if (!current) return null

  return (
    <AnimatePresence>
      {open && (
      <motion.div
        key="tour-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] pointer-events-none"
        role="dialog"
        aria-label="Guided tour"
      >
        {/* Dimmed scrim with a spotlight cutout — a box-shadow spread
            instead of an actual overlay hole, so the highlighted control
            visually "lights up". Deliberately pointer-events-none end to
            end: the live feed and every real control underneath stay
            fully clickable while the tour is open. */}
        {spotlight ? (
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="absolute rounded-2xl pointer-events-none"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: '0 0 0 2000px rgba(0,0,0,0.62)',
              border: `2px solid ${completed ? 'var(--sp-success)' : 'var(--sp-primary)'}`,
              transition: 'border-color 0.25s ease',
            }}
          >
            {/* Interactive steps get a small pulsing ring around the
                target as an affordance — "this is tappable right now" —
                until the real click is detected. */}
            {current.interactive && !completed && !reducedMotion && (
              <motion.div
                className="absolute -inset-2 rounded-2xl pointer-events-none"
                style={{ border: '2px solid var(--sp-primary)' }}
                animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.06, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <AnimatePresence>
              {completed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: 'var(--sp-success)' }}
                >
                  <Check size={14} className="text-black" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        )}

        {/* Tooltip card — the one interactive surface in the overlay. */}
        <motion.div
          key={step}
          ref={cardRef}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="absolute rounded-[20px] p-4 shadow-2xl pointer-events-auto glass-panel-strong tour-card-glass"
          style={{ top: cardTop, left: cardLeft, width: cardW }}
        >
          {/* Step rail — click any dot to jump straight to that step.
              Non-linear on purpose: this isn't a forced-linear slideshow. */}
          <div className="flex items-center gap-1 mb-3">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                className="flex-1 h-[3px] rounded-full overflow-hidden bg-[var(--sp-border)] transition-colors"
                style={{ background: i < step ? 'var(--sp-primary)' : i === step ? undefined : 'var(--sp-border)' }}
              >
                {i === step && (
                  <div
                    key={`${step}-${autoPlay}-${paused}`}
                    className="h-full rounded-full"
                    style={{
                      background: 'var(--sp-primary)',
                      width: reducedMotion ? '50%' : undefined,
                      animation: !reducedMotion && autoPlay ? `sp-tour-fill ${AUTO_ADVANCE_MS}ms linear forwards` : undefined,
                      animationPlayState: paused || completed ? 'paused' : 'running',
                    }}
                    onAnimationEnd={() => { if (!completed) handleNext() }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                key={`icon-${step}`}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(76,127,255,0.35)]"
              >
                <Icon size={16} className="text-black" />
              </motion.div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--sp-text-faint)] truncate">
                {current.eyebrow} · {step + 1}/{TOUR_STEPS.length}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setAutoPlay((v) => !v)}
                aria-label={autoPlay ? 'Pause auto-advance' : 'Resume auto-advance'}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--sp-text-faint)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
              >
                {autoPlay ? <Pause size={11} /> : <Play size={11} />}
              </button>
              <button
                onClick={end}
                aria-label="Close tour"
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--sp-text-faint)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-text)] transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <p className="text-[14.5px] font-semibold mb-1 leading-snug" style={{ color: 'var(--sp-text)' }}>
            {current.title}
          </p>
          <p className="text-[12.5px] leading-relaxed mb-2" style={{ color: 'var(--sp-text-dim)' }}>
            {current.body}
          </p>

          {/* Fallback notice when this step's target isn't on screen yet
              (e.g. the detection card, before a first scan has run) — the
              tour explains what it *would* be pointing at instead of
              silently centering with no context. */}
          {current.target && !rect && (
            <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-[var(--sp-border)]">
              <Sparkles size={11} className="text-[var(--sp-text-faint)] shrink-0" />
              <span className="text-[11px] text-[var(--sp-text-faint)]">
                {current.previewNote ?? 'Preview — this lights up once it\'s open.'}
              </span>
            </div>
          )}

          {/* Interactive hint chip — only while the target is live and
              not yet completed. */}
          {current.interactive && rect && !completed && (
            <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(var(--sp-primary-rgb),0.1)', border: '1px solid rgba(var(--sp-primary-rgb),0.25)' }}>
              <MousePointerClick size={11} className="text-[var(--sp-primary)] shrink-0" />
              <span className="text-[11px] font-medium text-[var(--sp-primary)]">{current.hint}</span>
            </div>
          )}
          {completed && (
            <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(var(--sp-success-rgb),0.12)', border: '1px solid rgba(var(--sp-success-rgb),0.3)' }}>
              <Check size={11} className="text-[var(--sp-success)] shrink-0" strokeWidth={3} />
              <span className="text-[11px] font-medium text-[var(--sp-success)]">Nice — moving on…</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={end} className="px-2.5 py-1.5 text-[12.5px] font-medium" style={{ color: 'var(--sp-text-faint)' }}>
              Skip
            </button>
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[12.5px] font-medium rounded-lg hover:bg-[var(--sp-surface-hover)] transition-colors"
                style={{ color: 'var(--sp-text-dim)' }}
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold"
              style={{ background: 'var(--sp-primary)', color: '#000' }}
            >
              {isLast ? 'See all shortcuts' : 'Next'}
              <ArrowRight size={12} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}

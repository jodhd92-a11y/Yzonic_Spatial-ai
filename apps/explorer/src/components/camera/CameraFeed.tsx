'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { CameraOff, AlertCircle, LayoutTemplate } from 'lucide-react'
import { useCamera } from '../../hooks/useCamera'
import { ScanReticle } from './ScanReticle'
import { DetectionCard, type Detection } from './DetectionCard'
import { ControlBar } from './ControlBar'
import { CameraFeedSkeleton } from './CameraFeedSkeleton'
import { useAppStore, SCAN_TEMPLATES } from '@/store/useAppStore'
import { msUntilSkeletonFloor } from '@/lib/layout'
import { onboardingLog } from '@/lib/onboarding-debug'
import {
  triggerHaptic,
  playScanSound,
  notifyScanComplete,
  downloadVideoFrame,
  captureVideoFrame,
} from '@/lib/scan-effects'

// Minimum horizontal drag distance (px) to count as a swipe, and the
// max vertical drift allowed before we treat it as a scroll instead.
const SWIPE_THRESHOLD = 56
const SWIPE_MAX_VERTICAL = 60

// Real detection (WASM vision model) isn't wired up yet — sample results
// are grouped by scan template so the simulated UX stays truthful to what
// each clinical/biotech workflow actually reports, instead of one generic
// object-detection list.
const SAMPLE_DETECTIONS_BY_TEMPLATE: Record<string, Detection[]> = {
  wound: [
    { label: 'Stage 2 pressure injury — clean margins', distance: '0.3 m', confidence: 0.93 },
    { label: 'Surgical incision, day 5 — no dehiscence', distance: '0.35 m', confidence: 0.9 },
    { label: 'Venous leg ulcer — granulating base', distance: '0.3 m', confidence: 0.88 },
  ],
  dermatology: [
    { label: 'Pigmented lesion — asymmetric border', distance: '0.25 m', confidence: 0.89 },
    { label: 'Erythematous plaque, well-demarcated', distance: '0.25 m', confidence: 0.86 },
  ],
  monitor: [
    { label: 'HR 88 · SpO2 97% · BP 122/78', distance: '0.6 m', confidence: 0.95 },
    { label: 'EKG strip — sinus rhythm, no ST changes', distance: '0.4 m', confidence: 0.9 },
  ],
  medlabel: [
    { label: 'Vial: Epinephrine 1mg/mL — exp. verified', distance: '0.2 m', confidence: 0.96 },
    { label: 'Label mismatch flagged — confirm dose', distance: '0.2 m', confidence: 0.83 },
  ],
  idcheck: [
    { label: 'Wristband ID matches chart', distance: '0.3 m', confidence: 0.97 },
  ],
  surgical: [
    { label: 'Surgical field — hemostasis achieved', distance: '0.4 m', confidence: 0.9 },
  ],
  ppe: [
    { label: 'PPE check — mask, gloves, gown confirmed', distance: '0.5 m', confidence: 0.92 },
  ],
  specimen: [
    { label: 'Gross specimen — 3.2 x 1.8 cm, tan-white', distance: '0.3 m', confidence: 0.91 },
  ],
  microscopy: [
    { label: 'H&E field — atypical cell cluster noted', distance: '0.05 m', confidence: 0.85 },
    { label: 'Gram stain — gram-positive cocci in clusters', distance: '0.05 m', confidence: 0.88 },
  ],
  gel: [
    { label: 'Western blot — band at ~55 kDa', distance: '0.3 m', confidence: 0.87 },
    { label: 'Agarose gel — expected fragment sizes', distance: '0.3 m', confidence: 0.9 },
  ],
  culture: [
    { label: 'Colony count — 42 CFU, mixed morphology', distance: '0.3 m', confidence: 0.86 },
  ],
  labresult: [
    { label: 'CBC panel captured — flagged: Hgb low', distance: '0.35 m', confidence: 0.94 },
  ],
  radiograph: [
    { label: 'Chest film — no acute cardiopulmonary process', distance: '0.5 m', confidence: 0.84 },
  ],
}
const FALLBACK_DETECTIONS: Detection[] = SAMPLE_DETECTIONS_BY_TEMPLATE.wound

// Studio (PhotoCustomizePanel) is ~2.7k lines on its own — exposure/crop,
// measurement & redaction drawing, findings review, case info, export —
// none of which is needed for the 99% of moments someone is just looking
// through the live feed or reviewing a detection card. Code-splitting it
// out with next/dynamic keeps that entire subtree (and its own icon set)
// out of CameraFeed's initial chunk, so the feed itself has less to parse
// and execute before it can paint — a real reduction in load work, not
// just a spinner painted over the same bundle. `ssr: false` because it's
// portal/canvas-driven client behavior with no server-render value.
const PhotoCustomizePanelPortal = dynamic(
  () => import('./PhotoCustomizePanel').then((m) => m.PhotoCustomizePanelPortal),
  { ssr: false }
)

// Floor on how long the skeleton stays up once the real feed is ready,
// so a near-instant camera grant (a returning visit with permission
// already cached) doesn't flash the shimmer for a single frame — which
// reads as more broken than not showing it at all. It's a floor, not a
// substitute: see `resolving` below, which is what actually decides
// whether the skeleton is showing in the first place. If the real work
// (settings hydration + getUserMedia) takes longer than this, the
// skeleton stays up exactly as long as that takes — this constant never
// shortens a genuine wait, only smooths out an artificially short one.
// Shared with Sidebar's own skeleton floor (see lib/layout.ts) so the
// sidebar's shimmer ends exactly when the camera feed's does — both also
// gate on this feed's `cameraStatus` in the store so the sidebar never
// clears its shimmer while the camera is still resolving.

export function CameraFeed() {
  const { videoRef, status, start, flipCamera } = useCamera()
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [detection, setDetection] = useState<Detection | null>(null)
  const [scanPhoto, setScanPhoto] = useState<string | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const settings = useAppStore((s) => s.settings)
  const [flashOn, setFlashOn] = useState(settings.flashDefault)
  const selectedTemplateId = useAppStore((s) => s.selectedTemplateId)
  const setTemplate = useAppStore((s) => s.setTemplate)
  const triggerAnnouncement = useAppStore((s) => s.triggerAnnouncement)
  const maybeStartTour = useAppStore((s) => s.maybeStartTour)
  const announcementOpen = useAppStore((s) => s.announcementOpen)
  const announcementResolved = useAppStore((s) => s.announcementResolved)
  const settingsHydrated = useAppStore((s) => s.settingsHydrated)
  const userLoading = useAppStore((s) => s.userLoading)
  const setCameraStatus = useAppStore((s) => s.setCameraStatus)
  const addScanResult = useAppStore((s) => s.addScanResult)
  const startChatFromScan = useAppStore((s) => s.startChatFromScan)
  const [lastScanId, setLastScanId] = useState<string | null>(null)
  const selectedTemplate = SCAN_TEMPLATES.find((t) => t.id === selectedTemplateId)

  // Camera is always on by default — the moment this page mounts, we go
  // straight for getUserMedia. There is no manual "Enable Camera" tap
  // and no settings-gated opt-in: the only way to land on a non-live
  // view is a real 'denied'/'unavailable' status from the browser (see
  // below). This is also what makes the guided tour reliably auto-load:
  // the tour only starts once `status === 'ready'` (see the effect below
  // it), so gating that on a manual click meant the tour rarely fired on
  // its own. Waits for `settingsHydrated` purely so we don't fire a
  // getUserMedia request before persisted camera settings (facing mode,
  // etc.) have loaded — not to decide whether to start at all.
  useEffect(() => {
    if (settingsHydrated) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsHydrated])

  // Mirrors this feed's camera status into the shared store so Sidebar's
  // skeleton can wait on it too — see the `cameraStatus` field in
  // useAppStore.ts. Without this, the sidebar had no way to know the
  // camera was still initializing and would drop its own shimmer as soon
  // as its (much faster) localStorage read settled.
  useEffect(() => {
    setCameraStatus(status)
  }, [status, setCameraStatus])

  // --- skeleton timing -------------------------------------------------
  // `resolving` is true exactly while we're waiting on real async work —
  // settings hasn't hydrated yet (so `start()` above hasn't even fired
  // yet), the camera hasn't left 'idle' yet, or a getUserMedia request is
  // in flight. It deliberately excludes 'denied'/'unavailable': those are
  // resolved, actionable states and should replace the skeleton
  // immediately rather than sit behind the timing floor below, which
  // exists only to smooth the success path.
  const resolving =
    !settingsHydrated ||
    status === 'requesting' ||
    status === 'idle'

  // Measured from the shared APP_LOAD_STARTED_AT clock (see lib/layout.ts),
  // not this component's own mount time, so this floor and Sidebar's floor
  // always expire at the same instant.
  const [skeletonMinElapsed, setSkeletonMinElapsed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSkeletonMinElapsed(true), msUntilSkeletonFloor())
    return () => clearTimeout(t)
  }, [])

  const showSkeleton = resolving || (status === 'ready' && !skeletonMinElapsed)

  // Warm the Studio chunk in the background once the feed itself is
  // actually up and idle — after the critical path (video paint) has had
  // its turn, not competing with it. By the time someone has run a scan
  // and reaches for "Studio", the dynamic import below usually resolves
  // instantly instead of showing its own loading state.
  useEffect(() => {
    if (status !== 'ready') return
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => { import('./PhotoCustomizePanel') })
      return () => w.cancelIdleCallback?.(id)
    }
    const id = window.setTimeout(() => { import('./PhotoCustomizePanel') }, 200)
    return () => window.clearTimeout(id)
  }, [status])

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    // Swipe-to-flip is a live-viewfinder gesture — while the customize
    // panel is open (dragging sliders, markup handles, preset rails, etc.
    // all involve horizontal touch movement), it must never bubble up
    // into a camera flip, which would drop the video stream and, since
    // the panel isn't a portal, visually yank the whole editor away.
    if (customizeOpen) return
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (customizeOpen) return
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    // Swipe right — dominant horizontal motion, moving left-to-right
    if (dx > SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_MAX_VERTICAL) {
      flipCamera()
    }
  }

  // Show the "under development" billboard a few seconds after the real
  // feed (not just the skeleton) is on screen — giving the person a
  // moment with the live feed first, rather than yanking focus the
  // instant access is granted. Gated on `!showSkeleton`, not just
  // `status === 'ready'`, since status can flip to 'ready' while the
  // skeleton's minimum-display floor is still running.
  useEffect(() => {
    if (status !== 'ready' || showSkeleton) return
    onboardingLog('announcement:timer-armed', { status, showSkeleton })
    const timer = setTimeout(() => {
      triggerAnnouncement()
    }, 5000)
    return () => clearTimeout(timer)
  }, [status, showSkeleton, triggerAnnouncement])

  // Guided tour — shown once the real controls it spotlights are
  // actually on screen (again, `!showSkeleton`, not just `status ===
  // 'ready'` — see above). If the "work in progress" announcement is
  // still queued up for this person (about to open at the 5s mark
  // above), the tour waits for it to be dismissed first so the two
  // never stack; otherwise it starts shortly after the feed is up.
  // Also waits for `!userLoading`: `maybeStartTour` records the tour as
  // "seen" against `user?.id ?? 'anonymous'`, so firing before auth has
  // resolved could permanently record it against the 'anonymous'
  // placeholder instead of the real signed-in account.
  useEffect(() => {
    if (status !== 'ready' || showSkeleton || userLoading) return
    if (!announcementResolved && !announcementOpen) {
      onboardingLog('tour:waiting-on-announcement-decision')
      return
    }
    if (announcementOpen) {
      onboardingLog('tour:waiting-on-announcement-dismiss')
      return
    }
    onboardingLog('tour:timer-armed', { status, showSkeleton, announcementResolved, announcementOpen })
    const timer = setTimeout(() => {
      maybeStartTour()
    }, 900)
    return () => clearTimeout(timer)
  }, [status, showSkeleton, announcementOpen, announcementResolved, userLoading, maybeStartTour])

  // Desktop: right arrow key flips the camera.
  useEffect(() => {
    if (status !== 'ready') return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        flipCamera()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [status, flipCamera])

  // Real detection (WASM vision model) isn't wired up yet — this
  // simulates the UX flow with sample data so the interaction pattern
  // is fully built and ready for a real model to slot into later.
  const runScan = () => {
    if (scanning) return
    setScanning(true)
    setDetection(null)
    setScanProgress(0)
    if (settings.hapticFeedback) triggerHaptic(15)

    // "High-accuracy mode" — slower, more deliberate scan in exchange for
    // (simulated, for now) more precise detections.
    const duration = settings.highAccuracyMode ? 3200 : 1800

    // Drives the reticle's live confidence % readout — ticks in step
    // with the actual scan duration rather than an arbitrary timer, so
    // it reads as real progress instead of a decorative loop.
    const startedAt = Date.now()
    const progressTimer = setInterval(() => {
      setScanProgress(Math.min(1, (Date.now() - startedAt) / duration))
    }, 60)

    setTimeout(() => {
      clearInterval(progressTimer)
      setScanProgress(1)
      const pool = SAMPLE_DETECTIONS_BY_TEMPLATE[selectedTemplateId] ?? FALLBACK_DETECTIONS
      const result = pool[Math.floor(Math.random() * pool.length)]
      setDetection(result)
      setScanning(false)

      // Grab a thumbnail of the frame that was actually scanned — this is
      // what powers the sidebar photo, the scan viewer, the "Chat about
      // this" handoff, and the customization panel below.
      const photo = captureVideoFrame(videoRef.current)
      setScanPhoto(photo)

      // Every completed scan lands in the sidebar's Recent list, exactly
      // like starting a new chat does (see the ControlBar Lens button).
      const scanId = addScanResult(result.label, photo ?? undefined)
      setLastScanId(scanId)

      if (settings.hapticFeedback) triggerHaptic([10, 40, 10])
      if (settings.soundEffects) playScanSound()
      if (settings.pushNotifications && settings.scanCompleteAlerts) notifyScanComplete(result.label)
      if (settings.saveScansToDevice) {
        downloadVideoFrame(videoRef.current, `scan-${Date.now()}.png`)
      }
    }, duration)
  }

  // The only non-live view left: a real 'denied'/'unavailable' status
  // from the browser/OS. There is no manual "Enable Camera" screen —
  // 'idle' and 'requesting' both fall through to the skeleton above via
  // `resolving`, since the camera is always requested automatically on
  // mount. This screen only appears if the person has actually denied
  // camera permission (e.g. from the app's camera settings) and gives
  // them a way to retry after fixing it there.
  // Outer layer vs. inner card — see the comment on the main return below
  // for why this split exists. The denied/unavailable state gets the same
  // treatment so the "feed" region always reads as the same floating
  // panel, whether it's showing live video or an error.
  if (status === 'denied' || status === 'unavailable') {
    return (
      <div className="relative w-full h-[calc(100vh-var(--sp-topbar-h)-var(--sp-bottomnav-h))] lg:h-[calc(100vh-var(--sp-topbar-h))] p-2.5 lg:p-4 bg-[var(--sp-bg-0)]">
        <div className="relative w-full h-full rounded-[26px] border border-[var(--sp-border)] bg-[var(--sp-bg-1)] flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-12 h-12 rounded-[var(--sp-radius-md)] bg-[rgba(var(--sp-danger-rgb),0.1)] border border-[rgba(var(--sp-danger-rgb),0.25)] flex items-center justify-center">
            {status === 'unavailable' ? <CameraOff size={20} className="text-[var(--sp-danger)]" /> : <AlertCircle size={20} className="text-[var(--sp-danger)]" />}
          </div>
          <p className="text-[15px] font-medium text-[var(--sp-text)]">
            {status === 'unavailable' ? 'Camera not available on this device' : 'Camera access was denied'}
          </p>
          <p className="text-[13px] text-[var(--sp-text-faint)] max-w-xs">
            {status === 'denied' && 'Check your browser\'s site settings to allow camera access, then try again.'}
          </p>
          {status === 'denied' && (
            <button
              onClick={() => start()}
              className="mt-2 px-5 py-2.5 rounded-[var(--sp-radius-sm)] bg-[var(--sp-surface)] hover:bg-[var(--sp-surface-hover)] border border-[var(--sp-border)] text-[var(--sp-text)] text-[14px] font-medium transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    // Two layers, not one. `outer` is full-bleed chrome-space — it owns
    // the exact topbar/bottomnav-aware height calc and sits at the app's
    // base surface color, so it reads as part of the same layer the
    // sidebar/topbar/bottom nav live on rather than the feed itself.
    // `inner` is the actual viewfinder: a distinct rounded card, inset
    // from every edge by the outer layer's padding, with its own border
    // and shadow. That inset is what gives the sidebar/topbar/feed/bottom
    // nav their own clearly separate zones — similar in spirit to Kimi's
    // floating content panel, but built around this app's own viewfinder
    // language rather than a plain card.
    <div className="relative w-full h-[calc(100vh-var(--sp-topbar-h)-var(--sp-bottomnav-h))] lg:h-[calc(100vh-var(--sp-topbar-h))] p-2.5 lg:p-4 bg-[var(--sp-bg-0)]">
      <div
        data-tour="viewfinder"
        className="relative w-full h-full rounded-[26px] overflow-hidden bg-black border border-[var(--sp-border)] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.55)]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* The video element is mounted here unconditionally — including
            while the skeleton overlay below is covering it — so `videoRef`
            is already attached the instant `start()`'s getUserMedia call
            resolves. If this were gated on `!showSkeleton` instead, the
            stream would have nowhere to attach to yet, the skeleton would
            be papering over nothing real, and dropping the overlay would
            need a fresh mount (and a dropped first frame) rather than
            simply revealing a feed that's already been playing underneath. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover"
          aria-label="Live camera feed"
        />

        {showSkeleton ? (
          <CameraFeedSkeleton />
        ) : (
          <>
            <ScanReticle scanning={scanning} progress={scanProgress} />

            {selectedTemplate && (
              <div
                data-tour="template-badge"
                className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--sp-bg-1)]/90 backdrop-blur-md border border-[var(--sp-primary)]/40 shadow-[0_4px_16px_rgba(0,0,0,0.35)] text-[var(--sp-text)] text-[13px] font-bold tracking-wide"
              >
                <LayoutTemplate size={15} strokeWidth={2.4} className="text-[var(--sp-primary)] shrink-0" />
                {selectedTemplate.label}
              </div>
            )}

            <DetectionCard
              detection={detection}
              photo={scanPhoto}
              captureId={lastScanId}
              hasPhoto={!!scanPhoto}
              onChat={lastScanId ? () => startChatFromScan(lastScanId, { templateLabel: selectedTemplate?.label }) : undefined}
              onCustomize={scanPhoto ? () => setCustomizeOpen(true) : undefined}
              onDismiss={() => setDetection(null)}
            />

            {/* Scrim — darkens the footage behind the control bar for contrast */}
            <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

            <ControlBar
              scanning={scanning}
              onLens={runScan}
              onFlashlight={() => setFlashOn((v) => !v)}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={setTemplate}
            />

            <PhotoCustomizePanelPortal
              photo={scanPhoto}
              title={detection?.label ?? 'Scan'}
              open={customizeOpen}
              onClose={() => setCustomizeOpen(false)}
              onChat={
                lastScanId
                  ? (caseInfo) => {
                      setCustomizeOpen(false)
                      startChatFromScan(lastScanId, {
                        templateLabel: selectedTemplate?.label,
                        caseInfo: {
                          caseId: caseInfo.caseId || undefined,
                          bodySite: caseInfo.bodySite || undefined,
                          modality: caseInfo.modality,
                          notes: caseInfo.notes || undefined,
                        },
                      })
                    }
                  : undefined
              }
            />
          </>
        )}
      </div>
    </div>
  )
}
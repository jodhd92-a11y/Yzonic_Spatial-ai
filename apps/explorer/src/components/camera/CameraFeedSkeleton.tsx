'use client'

/**
 * Loading placeholder for CameraFeed, shaped like the real thing —
 * viewfinder, template badge, control bar — so there's no layout jump
 * when the real UI mounts in its place.
 *
 * This is NOT a decorative spinner on a fixed timer. CameraFeed only
 * renders it while genuinely waiting on real async work: persisted
 * settings hydrating from storage, and/or `getUserMedia` negotiating
 * camera permission. See SKELETON_MIN_MS in CameraFeed.tsx for the one
 * timing rule this component's caller applies on top of that — a floor,
 * never a substitute, that only smooths out the common case where both
 * of those resolve almost instantly (a returning visit with camera
 * access already granted), so the shimmer doesn't flash for a single
 * frame and cause its own layout jump.
 */
export function CameraFeedSkeleton() {
  return (
    <div
      className="relative w-full h-[calc(100vh-var(--sp-topbar-h)-var(--sp-bottomnav-h))] lg:h-[calc(100vh-var(--sp-topbar-h))] overflow-hidden bg-black"
      role="status"
      aria-label="Loading camera"
    >
      {/* Viewfinder */}
      <div className="absolute inset-0 sp-skeleton-block" style={{ backgroundColor: '#0a0a0b' }} />

      {/* Template badge placeholder, top-left — same position/size as the
          real pill in CameraFeed so it doesn't shift into place. */}
      <div className="absolute top-4 left-4 w-[132px] h-[30px] rounded-full sp-skeleton-block border border-white/10" />

      {/* Scrim, matching the real gradient behind the control bar */}
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

      {/* Control bar placeholder */}
      <div className="absolute left-2 right-2 lg:left-1/2 lg:right-auto lg:w-[min(760px,calc(100%-64px))] lg:-translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+14px)]">
        <div className="relative flex items-center gap-2.5 rounded-[var(--sp-radius-lg)] bg-black/70 backdrop-blur-2xl border border-[var(--sp-border)] px-2.5 py-2.5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5 rounded-[var(--sp-radius-sm)] bg-white/[0.03] border border-[var(--sp-border)] p-0.5">
              <div className="w-11 h-11 rounded-[var(--sp-radius-sm)] sp-skeleton-block" />
              <div className="w-11 h-11 rounded-[var(--sp-radius-sm)] sp-skeleton-block" />
            </div>
            <span className="w-px h-6 bg-white/10 shrink-0" />
            <div className="h-11 w-[96px] rounded-[var(--sp-radius-sm)] sp-skeleton-block" />
          </div>
          <div className="flex-1 h-3 rounded-full sp-skeleton-block max-w-[220px]" />
          <div className="w-14 h-14 rounded-full sp-skeleton-block shrink-0" />
        </div>
      </div>
    </div>
  )
}

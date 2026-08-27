// Single source of truth for the sidebar's expanded/collapsed widths so
// AppShell (content offset) and Sidebar (the rail itself) never drift apart.
export const SIDEBAR_WIDTH = 272
export const SIDEBAR_WIDTH_COLLAPSED = 68

// Single source of truth for the shimmer skeletons' minimum on-screen time.
// Sidebar (store rehydration) and CameraFeed (settings hydration +
// getUserMedia) resolve independently, but sharing one floor means their
// shimmers always end together — one continuous "app is loading" moment
// instead of the sidebar popping in nearly a second before the feed does.
export const SKELETON_MIN_MS = 1000

// Both skeletons need to measure that floor from the *same* instant, not
// each component's own mount tick — those can differ by a frame or two
// depending on render order, which alone was enough to make the sidebar's
// timer fire before the camera feed's. `performance.now()` is monotonic
// and this module only evaluates once per page load, so every importer
// shares the exact same zero point.
export const APP_LOAD_STARTED_AT =
  typeof performance !== 'undefined' ? performance.now() : 0

// Remaining ms until SKELETON_MIN_MS has elapsed since APP_LOAD_STARTED_AT,
// clamped to 0 so a component that mounts late doesn't get a negative
// (i.e. immediately-firing, which is fine) or absurdly long delay.
export function msUntilSkeletonFloor() {
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : 0) - APP_LOAD_STARTED_AT
  return Math.max(0, SKELETON_MIN_MS - elapsed)
}
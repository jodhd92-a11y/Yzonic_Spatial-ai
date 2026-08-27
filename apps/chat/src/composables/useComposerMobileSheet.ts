import { inject, ref, type Ref } from 'vue'

// Shared across Composer's own "+" menu, ModelPicker, and MicRecorder:
// on mobile all three open as a sheet anchored to the *whole* composer
// (not beside/above their own trigger) with no glass blur, so the menu
// content is always reachable with a thumb and never gets clipped by
// the composer's own rounded corners. Which side it opens on is decided
// per-open by anchorMobileSheet below.
export const MOBILE_MENU_BP = 640

export function useComposerBox() {
  return inject<Ref<HTMLElement | null>>('composerBoxEl', ref(null))
}

export function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_MENU_BP
}

// Mobile sheet anchor for all three composer menus. The composer sits
// centered on the greeting screen (room below) but docks at the bottom of
// the viewport once inside a chat (little/no room below) — so this picks
// its side dynamically instead of always dropping down. `side: 'below'`
// anchors from the trigger's `top`; `side: 'above'` anchors from `bottom`
// (distance up from the viewport's bottom edge), mirroring the desktop
// panels, which always open above for the same reason.
export function anchorMobileSheet(composerBoxEl: HTMLElement | null | undefined) {
  const margin = 12
  const rect = composerBoxEl?.getBoundingClientRect()
  const width = rect ? Math.min(rect.width, window.innerWidth - margin * 2) : window.innerWidth - margin * 2
  const left = rect ? Math.max(rect.left, margin) : margin
  if (!rect) {
    return { side: 'below' as const, top: margin, left, width, maxHeight: 320 }
  }

  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  const MIN_SHEET_HEIGHT = 160

  if (spaceBelow >= MIN_SHEET_HEIGHT || spaceBelow >= spaceAbove) {
    const top = rect.bottom + 8
    const maxHeight = Math.max(MIN_SHEET_HEIGHT, window.innerHeight - top - margin)
    return { side: 'below' as const, top, left, width, maxHeight }
  }

  const bottom = window.innerHeight - rect.top + 8
  const maxHeight = Math.max(MIN_SHEET_HEIGHT, spaceAbove - margin - 8)
  return { side: 'above' as const, bottom, left, width, maxHeight }
}

// Desktop model picker: opens ABOVE the *whole* composer, mirroring
// MicRecorder's own desktop options panel (see measureAnchor there) —
// anchored via `bottom` (distance from the viewport's bottom edge up to
// the composer's top), not `top`. The composer docks at the bottom of
// the screen once you're inside a chat, so a panel that grows *downward*
// from it has nowhere to go and gets clipped by the viewport edge; one
// that grows upward from it always has the whole screen above to work
// with.
export function anchorAboveComposerAtTrigger(
  composerBoxEl: HTMLElement | null | undefined,
  triggerEl: HTMLElement | null | undefined,
  width: number,
) {
  const margin = 12
  const boxRect = composerBoxEl?.getBoundingClientRect()
  const triggerRect = triggerEl?.getBoundingClientRect()
  const anchorTop = boxRect?.top ?? triggerRect?.top ?? window.innerHeight
  const bottom = window.innerHeight - anchorTop + 8
  const w = Math.min(width, window.innerWidth - margin * 2)
  let left = triggerRect ? triggerRect.right - w : margin
  left = Math.min(Math.max(left, margin), window.innerWidth - w - margin)
  const maxHeight = Math.max(200, anchorTop - margin - 8)
  return { bottom, left, width: w, maxHeight }
}

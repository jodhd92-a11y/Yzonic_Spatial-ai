import { useRef } from 'react'

/**
 * A link/button that follows the cursor and magnifies within its own
 * bounds — the same "Dock" language macOS uses for its taskbar icons:
 * the closer the pointer sits to the button's center, the more it
 * grows and lifts out of the tray, easing back with a spring the
 * instant the cursor leaves. Used for primary CTAs across the site
 * (Hero, CTA section, nav) — extracted out of Hero.tsx so other
 * sections don't duplicate it.
 *
 * Perf notes:
 * - mousemove writes are rAF-batched (pendingRef + a single in-flight
 *   rafId) so N mousemove events between frames collapse into one
 *   style write, instead of one synchronous style mutation per event.
 * - Only `transform` is ever touched — no layout-triggering
 *   properties — and the CSS transition is switched off while
 *   actively tracking (so the transform follows the cursor 1:1, with
 *   zero lag) and switched back on only for the release, so the
 *   spring-back on mouseleave is the sole animated transition.
 * - getBoundingClientRect runs once per hover (mouseenter), not per
 *   mousemove, avoiding a forced layout read on every frame.
 */
export function MagneticLink({
  href,
  className,
  style,
  children,
}: {
  href: string
  className: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  const apply = () => {
    rafRef.current = null
    const el = ref.current
    const rect = rectRef.current
    const pending = pendingRef.current
    if (!el || !rect || !pending) return

    const dx = pending.x - rect.left - rect.width / 2
    const dy = pending.y - rect.top - rect.height / 2

    // Proximity to center, 0 (edge) → 1 (dead center), radially —
    // this is what makes it "magnify like a Dock icon" rather than
    // just drift toward the cursor.
    const maxDist = Math.max(rect.width, rect.height) / 2
    const dist = Math.min(Math.hypot(dx, dy), maxDist)
    const proximity = 1 - dist / maxDist

    const pullX = dx * 0.2
    const pullY = dy * 0.28
    const scale = 1 + proximity * 0.1
    const lift = proximity * 7

    el.style.transform = `translate(${pullX}px, ${pullY - lift}px) scale(${scale})`
  }

  const handleMouseEnter = () => {
    rectRef.current = ref.current?.getBoundingClientRect() ?? null
    // No transition while actively tracking — the transform should
    // feel glued to the cursor, not chasing it.
    if (ref.current) ref.current.style.transition = 'none'
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    pendingRef.current = { x: e.clientX, y: e.clientY }
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(apply)
    }
  }

  const handleMouseLeave = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const el = ref.current
    if (!el) return
    // Re-enable the spring transition (defined in Hero.module.css)
    // just for the release, so the button eases back to rest instead
    // of snapping.
    el.style.transition = ''
    el.style.transform = ''
  }

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  )
}

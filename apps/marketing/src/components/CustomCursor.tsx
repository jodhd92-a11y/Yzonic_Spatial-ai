import { useEffect, useRef } from 'react'
import styles from './CustomCursor.module.css'

const HOVER_SELECTOR =
  'a, button, .feat-card, .gallery-card, .video-card, .vision-field, .service-card, .stat-item, .zoom-card, [data-magnetic]'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (matchMedia('(hover: none)').matches || window.innerWidth <= 768) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    dot.style.opacity = '0'
    ring.style.opacity = '0'

    // Everything below is driven from ONE rAF loop — both the dot and
    // the ring, no exceptions. Previously the dot wrote to the DOM
    // directly on every raw mousemove event (which can fire 60-120+
    // times/sec), separately from the ring's own rAF-batched update —
    // that mismatch is what caused the laggy feeling. Now both are
    // updated together, once per actual screen refresh.
    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0
    let hasMoved = false
    let rafId: number

    // Velocity is what makes this feel expressive rather than just
    // "a circle that follows the mouse" — the ring stretches along its
    // direction of travel proportional to speed, and relaxes back to
    // a perfect circle the instant you slow down or stop.
    let vx = 0,
      vy = 0

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      if (!hasMoved) {
        hasMoved = true
        dot.style.opacity = '1'
        ring.style.opacity = '1'
        rx = mx
        ry = my
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    const tick = () => {
      const prevRx = rx,
        prevRy = ry
      rx += (mx - rx) * 0.2
      ry += (my - ry) * 0.2
      vx = rx - prevRx
      vy = ry - prevRy

      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`

      const speed = Math.min(18, Math.hypot(vx, vy))
      const stretch = 1 + speed * 0.045
      const squash = Math.max(0.82, 1 - speed * 0.018)
      const travelAngle = speed > 0.4 ? (Math.atan2(vy, vx) * 180) / Math.PI : 0

      ring.style.transform =
        `translate(${rx}px, ${ry}px) translate(-50%,-50%) ` +
        `rotate(${travelAngle}deg) scale(${stretch}, ${squash})`

      rafId = requestAnimationFrame(tick)
    }

    // Backgrounded tabs still fire rAF at throttled rates in some
    // browsers — fully stop the loop instead of relying on that, so a
    // pinned/background tab costs zero main-thread work.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
      } else {
        rafId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    rafId = requestAnimationFrame(tick)

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(HOVER_SELECTOR)
      if (target) ring.classList.add(styles.hover)
    }
    const onOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(HOVER_SELECTOR)
      if (target) ring.classList.remove(styles.hover)
    }
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)

    const onDown = () => ring.classList.add(styles.click)
    const onUp = () => ring.classList.remove(styles.click)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className={styles.cursorDot} />
      <div ref={ringRef} className={styles.cursorRing} />
    </>
  )
}

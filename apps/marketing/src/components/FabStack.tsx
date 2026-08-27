import { useEffect, useRef, useState } from 'react'
import styles from './FabStack.module.css'

// px/second — deliberately framerate-independent (delta-time driven, not
// a flat px/frame) so autoscroll speed is consistent across displays.
const SPEED = 900

export function FabStack() {
  const [autoScrolling, setAutoScrolling] = useState(false)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const displayYRef = useRef<number | null>(null)
  const autoScrollingRef = useRef(false)

  useEffect(() => {
    autoScrollingRef.current = autoScrolling
    if (!autoScrolling) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    lastTimeRef.current = null
    displayYRef.current = null

    const step = (now: number) => {
      if (!autoScrollingRef.current) return
      if (lastTimeRef.current === null) lastTimeRef.current = now
      const dt = Math.min(now - lastTimeRef.current, 48) / 1000
      lastTimeRef.current = now

      const lenis = (window as any).__lenis
      const h = document.documentElement.scrollHeight - window.innerHeight
      const current = lenis ? lenis.scroll : window.scrollY
      const next = current + SPEED * dt

      if (next >= h) {
        setAutoScrolling(false)
        if (lenis) lenis.scrollTo(0, { immediate: true })
        else window.scrollTo(0, 0)
        return
      }

      if (lenis) {
        // A single system driving scroll — fighting Lenis with a second
        // one (raw window.scrollBy) produces stutter, since Lenis
        // reasserts its own interpolated position every frame.
        lenis.scrollTo(next, { immediate: true })
      } else {
        // No Lenis on this device — ease the visible position toward
        // "next" each frame instead of snapping, so it doesn't read as
        // stepped/juddery.
        const eased = (displayYRef.current ?? current) + (next - (displayYRef.current ?? current)) * Math.min(1, dt * 10)
        displayYRef.current = eased
        window.scrollTo(0, eased)
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [autoScrolling])

  // Manual scroll-up or touch cancels autoscroll.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (autoScrollingRef.current && e.deltaY < 0) setAutoScrolling(false)
    }
    const onTouchMove = () => {
      if (autoScrollingRef.current) setAutoScrolling(false)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  function backToTop() {
    const lenis = (window as any).__lenis
    if (lenis) lenis.scrollTo(0)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.stack}>
      <button
        className={`${styles.fab} ${autoScrolling ? styles.active : ''}`}
        aria-label="Toggle auto scroll"
        onClick={() => setAutoScrolling((v) => !v)}
      >
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
        <span className={styles.tip}>Auto scroll</span>
      </button>
      <button className={styles.fab} aria-label="Back to top" onClick={backToTop}>
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        <span className={styles.tip}>Back to top</span>
      </button>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import styles from './SectionDots.module.css'

const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'features-section', label: 'Features' },
  { id: 'showcase-section', label: 'Tech' },
  { id: 'gallery-section', label: 'Gallery' },
  { id: 'video-section', label: 'Videos' },
  { id: 'zoom-section', label: 'Zoom' },
  { id: 'stats-section', label: 'Stats' },
  { id: 'vision-section', label: 'Vision' },
  { id: 'cta-section', label: 'Start' },
  { id: 'about-section', label: 'About' },
]

export function SectionDots() {
  const [activeIndex, setActiveIndex] = useState(0)
  const topsRef = useRef<number[]>([])

  useEffect(() => {
    // Cache each section's absolute document offset — refreshed only on
    // resize/load, never per scroll tick, so the scroll handler itself
    // only reads window.scrollY (cheap, no layout reflow).
    function refresh() {
      topsRef.current = sections.map((s) => {
        const el = document.getElementById(s.id)
        if (!el) return Infinity
        const r = el.getBoundingClientRect()
        return r.top + window.scrollY
      })
    }
    refresh()
    const raf = requestAnimationFrame(refresh)
    window.addEventListener('load', refresh)

    let resizeRaf: number | null = null
    const onResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(refresh)
    }
    window.addEventListener('resize', onResize, { passive: true })

    let ticking = false
    const update = () => {
      const mid = window.scrollY + window.innerHeight * 0.4
      const tops = topsRef.current
      let idx = 0
      for (let i = 0; i < tops.length; i++) {
        if (tops[i] <= mid) idx = i
      }
      setActiveIndex(idx)
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        update()
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('load', refresh)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
    }
  }, [])

  function jumpTo(id: string) {
    const target = document.getElementById(id)
    if (!target) return
    const lenis = (window as any).__lenis
    if (lenis) lenis.scrollTo(target, { offset: -40 })
    else target.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={styles.dots} aria-label="Section navigation">
      {sections.map((s, i) => (
        <button
          key={s.id}
          className={`${styles.dot} ${i === activeIndex ? styles.active : ''}`}
          data-label={s.label}
          aria-label={s.label}
          onClick={() => jumpTo(s.id)}
        />
      ))}
    </div>
  )
}

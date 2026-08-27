import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import styles from './ZoomSection.module.css'
import sectionStyles from './Section.module.css'
import { useReveal } from '../hooks/useReveal'

const layers = [
  {
    num: 'LAYER 01',
    depth: '0m',
    title: 'The Camera',
    desc: "Every frame from your device's camera is captured at native resolution and handed off to the engine without any pre-processing or compression.",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M1.05 12H5M19 12h2.95M12 1.05V5M12 19v2.95" />
      </svg>
    ),
  },
  {
    num: 'LAYER 02',
    depth: '40m',
    title: 'WASM Pipeline',
    desc: 'Rust-compiled WebAssembly module ingests pixels, builds a Gaussian pyramid, and extracts HOG descriptors — all at native speed.',
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    num: 'LAYER 03',
    depth: '85m',
    title: 'Spatial Fusion',
    desc: 'GPS, compass, and gyroscope data fuse with the visual pipeline to anchor every detection in real-world 3D coordinates.',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    num: 'LAYER 04',
    depth: '130m',
    title: 'Live Render',
    desc: 'Detection results composite back over the camera frame at 60fps — bounding boxes, labels, and depth measurements all in real time.',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    num: 'LAYER 05',
    depth: '180m',
    title: 'Privacy Vault',
    desc: 'Every pixel, template, and detection stays inside the browser sandbox. Encrypted IndexedDB persists your data — yours alone, forever.',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

const AUTO_MS = 4200

/**
 * "Keep going deeper." — redesigned as a compact feature-stage rather
 * than five full-height stacked cards.
 *
 * Why this shape:
 * - Height: the old layout summed five ~340px cards + gaps + 160px of
 *   section padding, easily 2500-3000px of scroll. This version is a
 *   single fixed-ish stage (tabs beside one active panel) that never
 *   exceeds roughly one viewport, because only ONE layer is rendered
 *   at a time instead of all five stacked.
 * - Performance: the old version ran 6 independent scroll subscriptions
 *   (one per card + one for the spine) and kept ~5x fire/flame/sheen/
 *   scan/breathe animations looping simultaneously, all the time,
 *   whether or not they were in view. This version has zero scroll
 *   listeners — switching is timer/click driven — and only the single
 *   active panel ever animates. Autoplay itself pauses via
 *   IntersectionObserver the moment the section leaves the viewport.
 */
export function ZoomSection() {
  const containerRef = useReveal()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [inView, setInView] = useState(false)
  const [paused, setPaused] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = sectionRef.current
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.3,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || paused || prefersReducedMotion) return
    const t = setTimeout(() => setActiveIndex((i) => (i + 1) % layers.length), AUTO_MS)
    return () => clearTimeout(t)
  }, [activeIndex, inView, paused, prefersReducedMotion])

  const select = useCallback((i: number) => {
    setActiveIndex(i)
    setPaused(true)
  }, [])

  const layer = layers[activeIndex]
  const showAutoFill = inView && !paused && !prefersReducedMotion

  return (
    <section
      id="zoom-section"
      className={styles.section}
      ref={(el: HTMLElement | null) => {
        ;(containerRef as React.MutableRefObject<HTMLElement | null>).current = el
        sectionRef.current = el
      }}
    >
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={sectionStyles.sectionInner}>
        <span
          className={`${sectionStyles.eyebrow} reveal`}
          style={{ display: 'block', textAlign: 'center', margin: '0 auto 18px' }}
        >
          Infinite Zoom
        </span>
        <h2
          className={`${sectionStyles.h2} reveal`}
          style={{ textAlign: 'center', margin: '0 auto 16px' }}
        >
          Keep going <span className="accent">deeper.</span>
        </h2>
        <p className={`${sectionStyles.body} reveal`} style={{ margin: '0 auto', textAlign: 'center' }}>
          Five layers, one continuous pipeline — from raw pixels to spatial understanding.
        </p>
      </div>

      <div
        className={`${styles.stage} reveal`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className={styles.tabs} role="tablist" aria-label="Architecture layers">
          {layers.map((l, i) => {
            const active = i === activeIndex
            return (
              <button
                key={l.num}
                role="tab"
                aria-selected={active}
                className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                onClick={() => select(i)}
              >
                <span className={styles.tabTop}>
                  <span className={styles.tabNum}>{l.num}</span>
                  <span className={styles.tabDepth}>{l.depth}</span>
                </span>
                <span className={styles.tabTitle}>{l.title}</span>
                <span className={styles.tabTrack} aria-hidden="true">
                  {active && showAutoFill && (
                    <span
                      key={activeIndex}
                      className={styles.tabFill}
                      style={{ animationDuration: `${AUTO_MS}ms` }}
                    />
                  )}
                  {active && !showAutoFill && <span className={styles.tabFillStatic} />}
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.panel} style={{ ['--layer-tint' as string]: `${activeIndex * 14}deg` }}>
          <div className={styles.panelBorder} aria-hidden="true" />
          <div className={styles.panelGlow} aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.div
              key={layer.num}
              className={styles.panelContent}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.panelIcon}>{layer.icon}</div>
              <div className={styles.panelMeta}>
                {layer.num}
                <span className={styles.depthTag}>{layer.depth}</span>
              </div>
              <h3 className={styles.panelTitle}>{layer.title}</h3>
              <p className={styles.panelDesc}>{layer.desc}</p>
            </motion.div>
          </AnimatePresence>

          <div className={styles.panelNav}>
            <button
              className={styles.navBtn}
              aria-label="Previous layer"
              onClick={() => select((activeIndex - 1 + layers.length) % layers.length)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className={styles.navBtn}
              aria-label="Next layer"
              onClick={() => select((activeIndex + 1) % layers.length)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import styles from './Hero.module.css'
import { StarField } from './StarField'
import { Typewriter } from './Typewriter'
import { appLinks } from '../lib/app-links'

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const glassRefs = useRef<(HTMLDivElement | null)[]>([])

  // NavWithLoader and Hero are separate Astro islands (both
  // client:load) — they hydrate in parallel, not sequentially. Left
  // to itself the headline would start "typing" the instant Hero
  // mounts, finishing well before the full-screen loader overlay
  // (which sits on top of everything, z-index 10000) ever clears —
  // so the animation plays out entirely unseen and the headline just
  // appears already-finished the moment the loader fades. Instead we
  // hold it paused at frame zero until NavWithLoader tells us the
  // loader is actually gone, via a plain window event (no shared
  // store needed for two islands). A hard fallback timeout means a
  // missed/late event (or the loader island failing to hydrate at
  // all) can never leave the headline stuck invisible.
  const [heroReady, setHeroReady] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as unknown as { __loaderDone?: boolean }).__loaderDone) {
      setHeroReady(true)
      return
    }
    const onLoaderDone = () => setHeroReady(true)
    window.addEventListener('loader:complete', onLoaderDone)
    const fallback = setTimeout(() => setHeroReady(true), 4000)
    return () => {
      window.removeEventListener('loader:complete', onLoaderDone)
      clearTimeout(fallback)
    }
  }, [])

  // Scroll-linked depth: as the hero scrolls out of view, its content
  // drifts up and fades slightly slower than the scroll itself — a
  // cheap "camera pulling back" cinematic effect, GPU-accelerated
  // since it's only ever opacity + transform.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  // A single IntersectionObserver both pauses the CSS entrance/ambient
  // animations (anim-paused) and cancels the mouse-tracking rAF loop
  // itself while Hero is off-screen — restarting it the instant it
  // scrolls back into view. Avoids an unbounded main-thread cost for
  // the rest of a long single-page session.
  useEffect(() => {
    const hero = heroRef.current
    const bg = bgRef.current
    if (!hero || !bg) return
    const hasHover = !window.matchMedia('(hover: none)').matches
    // Stored as a plain boolean rather than branching on `'IntersectionObserver' in window`
    // directly — lib.dom.d.ts declares that property as always present, so TS's `in`
    // narrowing treats the fallback branch as unreachable and types `window` as `never`
    // there. Routing through a boolean avoids that false-positive narrowing.
    const hasIO = 'IntersectionObserver' in window

    let mouseX = 0
    let mouseY = 0
    let heroRect: DOMRect | null = null
    let rafId: number | null = null

    const measure = () => {
      heroRect = heroRef.current?.getBoundingClientRect() ?? null
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const tick = () => {
      rafId = requestAnimationFrame(tick)

      if (heroRect) {
        const relX = (mouseX - heroRect.left) / heroRect.width - 0.5
        const relY = (mouseY - heroRect.top) / heroRect.height - 0.5
        glassRefs.current.forEach((pane, i) => {
          if (!pane) return
          const depth = 0.35 + i * 0.22
          pane.style.setProperty('--px', `${-relX * 50 * depth}px`)
          pane.style.setProperty('--py', `${-relY * 36 * depth}px`)
        })

        // Spotlight follows the cursor — reuses the same relX/relY
        // already computed above, so this is effectively free.
        if (heroRef.current) {
          const spotX = ((mouseX - heroRect.left) / heroRect.width) * 100
          const spotY = ((mouseY - heroRect.top) / heroRect.height) * 100
          heroRef.current.style.setProperty('--spot-x', `${spotX}%`)
          heroRef.current.style.setProperty('--spot-y', `${spotY}%`)
        }
      }
    }

    const startLoop = () => {
      if (rafId !== null || !hasHover) return
      measure()
      rafId = requestAnimationFrame(tick)
    }
    const stopLoop = () => {
      if (rafId === null) return
      cancelAnimationFrame(rafId)
      rafId = null
    }

    let heroIntersecting = true
    const onVisibility = () => {
      if (document.hidden || !heroIntersecting) stopLoop()
      else startLoop()
    }
    document.addEventListener('visibilitychange', onVisibility)

    let cleanup: (() => void) | null = null

    if (hasIO) {
      const io = new IntersectionObserver(
        (entries) => {
          heroIntersecting = entries[0].isIntersecting
          const visible = heroIntersecting && !document.hidden
          bg.classList.toggle('anim-paused', !visible)
          if (visible) startLoop()
          else stopLoop()
        },
        { threshold: 0 }
      )
      io.observe(hero)

      if (hasHover) {
        window.addEventListener('resize', measure, { passive: true })
        window.addEventListener('mousemove', onMouseMove, { passive: true })
      }

      cleanup = () => {
        io.disconnect()
        window.removeEventListener('resize', measure)
        window.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('visibilitychange', onVisibility)
        stopLoop()
      }
    } else {
      // No IntersectionObserver support — fall back to always running.
      if (hasHover) {
        window.addEventListener('resize', measure, { passive: true })
        window.addEventListener('mousemove', onMouseMove, { passive: true })
        startLoop()
      }
      cleanup = () => {
        window.removeEventListener('resize', measure)
        window.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('visibilitychange', onVisibility)
        stopLoop()
      }
    }

    return cleanup || (() => {})
  }, [])

  return (
    <section id="hero" className={styles.hero} ref={heroRef}>
      <div ref={bgRef}>
        <StarField targetId="hero" />
        <div className={styles.rays} />
        <div ref={spotlightRef} className={`${styles.spotlight} ${styles.active}`} />
        <div className={`${styles.heroOrb} ${styles.orb1}`} />
        <div className={`${styles.heroOrb} ${styles.orb2}`} />

        <div className={styles.heroAurora} aria-hidden="true">
          <div className={`${styles.auroraGlow} ${styles.g1}`} />
          <div className={`${styles.auroraGlow} ${styles.g2}`} />
          <div
            ref={(el) => { glassRefs.current[0] = el }}
            className={`${styles.heroGlass} ${styles.gl1}`}
            style={{ transform: 'translate(var(--px, 0), var(--py, 0))' }}
          />
          <div
            ref={(el) => { glassRefs.current[1] = el }}
            className={`${styles.heroGlass} ${styles.gl2}`}
            style={{ transform: 'translate(var(--px, 0), var(--py, 0))' }}
          />
        </div>
      </div>

      <motion.div className={styles.heroContent} style={{ y: contentY, opacity: contentOpacity }}>
        <div className={styles.heroBadge}>Live Preview — Clinical & Biotech Documentation</div>

        <h1 className={styles.heroH1}>
          {/* Two speeds, not one: a touch slower and a longer pause
              after the first phrase (hesitant, like someone finding
              their words) then noticeably faster on the accent line
              (they know exactly what they're typing now) — reads as
              a person typing this for the first time rather than a
              metronome. Plays on every load — no "only once per
              session" gating, so it's always exactly what you see
              the instant this component mounts. */}
          <Typewriter
            text="Document the case"
            className={styles.lineDim}
            startDelay={0}
            speed={85}
            start={heroReady}
          />
          <Typewriter
            text="the moment you see it."
            className={styles.lineAccent}
            startDelay={'Document the case'.length * 85 + 650}
            speed={65}
            start={heroReady}
          />
        </h1>

        <p className={styles.heroSub}>
          Point your camera at a wound, a specimen, a monitor, or a slide. On-device AI
          measures, tags, and hands it straight to chat — built for doctors, surgeons,
          medical students, and researchers, not general photography.
        </p>

        <div className={styles.heroActions}>
          <a href={appLinks.signup} className={styles.btnPrimary}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Launch Spatial AI Explorer
          </a>
          <span className={styles.dockDivider} aria-hidden="true" />
          <a href="#showcase-section" className={styles.btnSecondary}>
            How it works
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </motion.div>

      <div className={styles.scrollCue}>
        <div className={styles.mouse} />
        Scroll
      </div>
    </section>
  )
}
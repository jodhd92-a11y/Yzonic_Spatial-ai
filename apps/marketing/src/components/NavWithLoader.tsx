import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { openSidebar } from '../stores/ui'
import { appLinks } from '../lib/app-links'
import navStyles from './Nav.module.css'
import loaderStyles from './LoadingScreen.module.css'

const links = [
  { href: '#features-section', label: 'Features' },
  { href: '#showcase-section', label: 'Technology' },
  { href: '#gallery-section', label: 'Gallery' },
  { href: '#vision-section', label: 'Vision' },
  { href: '#about-section', label: 'About' },
]

const RADIUS = 68
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const WORDMARK = 'SPATIAL AI'
const HOLD_MS = 700 // how long the wordmark holds before collapsing into the ring
const COLLAPSE_MS = 420
const RAMP_MS = 1100 // CSS-driven ramp from 0 -> RAMP_TARGET while we wait for the page
const RAMP_TARGET = 92
const FINISH_MS = 300 // CSS-driven finish from RAMP_TARGET -> 100 once ready
const HARD_TIMEOUT_MS = 3500 // absolute ceiling — loader can never hang past this

function LogoMark({ big }: { big: boolean }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        className={big ? loaderStyles.logoRing : navStyles.logoRing}
        cx="14" cy="14" r="12" strokeWidth="1.5"
      />
      <polygon
        className={big ? loaderStyles.logoStarGlow : navStyles.logoStarGlow}
        points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5"
      />
      <polygon
        className={big ? loaderStyles.logoStar : navStyles.logoStar}
        points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5"
      />
    </svg>
  )
}

/**
 * Loading screen.
 *
 * Perf notes (why this is shaped the way it is):
 * - Progress is driven by CSS `transition`, not a rAF + setState loop. The
 *   old version re-rendered the whole overlay tree up to 60x/second; this
 *   version changes React state ~3 times total for the whole animation.
 * - Only `transform`/`opacity` are animated on the continuously-running
 *   pieces (rings, glow, orbit dots) so the browser can composite them on
 *   the GPU instead of repainting/relayouting every frame.
 * - A hard timeout guarantees the loader always finishes, even if the
 *   window `load` event is slow or never fires for some reason.
 */
function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'ring'>('intro')
  const [ramping, setRamping] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)

  // Wordmark intro -> ring stage.
  useEffect(() => {
    const t = setTimeout(() => setPhase('ring'), HOLD_MS)
    return () => clearTimeout(t)
  }, [])

  // Once the ring is showing, kick off the CSS ramp and wait for either the
  // page to finish loading or the hard timeout, whichever comes first.
  useEffect(() => {
    if (phase !== 'ring') return

    // Trigger the ramp on the next frame so the 0% starting state paints
    // first and the CSS transition actually animates.
    const raf = requestAnimationFrame(() => setRamping(true))

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      setFinishing(true)
    }

    if (document.readyState === 'complete') {
      // Page was already ready — still let the ramp play so the loader
      // doesn't feel like a flash, but don't wait longer than that.
      const t = setTimeout(finish, RAMP_MS)
      return () => { cancelAnimationFrame(raf); clearTimeout(t) }
    }

    window.addEventListener('load', finish)
    const hardTimeout = setTimeout(finish, HARD_TIMEOUT_MS)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('load', finish)
      clearTimeout(hardTimeout)
    }
  }, [phase])

  // When "finishing" flips on, the CSS transition to 100% starts; once it's
  // done (FINISH_MS), begin the exit.
  useEffect(() => {
    if (!finishing) return
    const t = setTimeout(() => setIsExiting(true), FINISH_MS)
    return () => clearTimeout(t)
  }, [finishing])

  useEffect(() => {
    if (!isExiting) return
    const t = setTimeout(onComplete, 480)
    return () => clearTimeout(t)
  }, [isExiting, onComplete])

  const progressPct = finishing ? 100 : ramping ? RAMP_TARGET : 0
  const dashOffset = CIRCUMFERENCE * (1 - progressPct / 100)
  const transitionMs = finishing ? FINISH_MS : RAMP_MS

  return (
    <motion.div
      className={loaderStyles.overlay}
      exit={{ opacity: 0, filter: 'blur(6px)' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={loaderStyles.gridBg} />

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="wordmark"
            className={loaderStyles.wordmarkStage}
            exit={{ opacity: 0 }}
            transition={{ duration: COLLAPSE_MS / 1000 }}
          >
            <div style={{ position: 'relative' }}>
              <div className={loaderStyles.wordmark}>
                {WORDMARK.split('').map((ch, i) => (
                  <motion.span
                    key={i}
                    className={loaderStyles.letter}
                    initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.5, filter: 'blur(6px)' }}
                    transition={{ duration: 0.5, delay: i * 0.025, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {ch === ' ' ? <span className={loaderStyles.wordSpace} /> : ch}
                  </motion.span>
                ))}
              </div>
              <div className={loaderStyles.wordmarkUnderline} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'ring' && (
        <motion.div
          className={loaderStyles.logoStage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div className={loaderStyles.glow} />
          <div className={loaderStyles.ringOuter} />
          <div className={loaderStyles.ringMid} />
          <div className={loaderStyles.ringInner} />
          <div className={loaderStyles.orbitDot} style={{ animationDelay: '0s' }} />
          <div className={loaderStyles.orbitDot} style={{ animationDelay: '-1.33s' }} />
          <div className={loaderStyles.orbitDot} style={{ animationDelay: '-2.66s' }} />

          <svg className={loaderStyles.progressRing} viewBox="0 0 156 156">
            <defs>
              <linearGradient id="preloader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <circle className={loaderStyles.progressRingTrack} cx="78" cy="78" r={RADIUS} />
            <circle
              ref={ringRef}
              className={loaderStyles.progressRingFill}
              cx="78" cy="78" r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: `stroke-dashoffset ${transitionMs}ms ease-out` }}
            />
          </svg>

          <motion.div
            layoutId="brand-logo"
            className={loaderStyles.logoBadge}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <LogoMark big />
          </motion.div>
        </motion.div>
      )}

      {phase === 'ring' && (
        <motion.div
          className={loaderStyles.textRow}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className={loaderStyles.label}>Loading experience</div>
          <div className={loaderStyles.bar}>
            <div
              ref={barRef}
              className={loaderStyles.barFill}
              style={{ width: `${progressPct}%`, transition: `width ${transitionMs}ms ease-out` }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export function NavWithLoader() {
  const [scrolled, setScrolled] = useState(false)
  // Collapses the pill down to just the logo while scrolling down (once
  // past the point where "scrolled" styling kicks in anyway), and brings
  // it back the instant the user scrolls up — a common pattern for
  // getting a fixed nav out of the way of content without hiding it
  // outright. Tracked separately from `scrolled` since that only cares
  // about position, not direction.
  const [collapsed, setCollapsed] = useState(false)
  // Skip the loader entirely for reduced-motion users, and for repeat
  // visits within the same session — no need to replay it on every page.
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    return true
  })

  useEffect(() => {
    let ticking = false
    let lastY = window.scrollY

    const update = () => {
      ticking = false
      const y = window.scrollY
      setScrolled(y > 40)

      // Stay expanded near the top regardless of direction — collapsing
      // the instant the page moves a few px reads as jittery, not smart.
      if (y < 120) {
        setCollapsed(false)
      } else {
        const delta = y - lastY
        // Widened from +/-6px to +/-24px — the smaller threshold made
        // the nav collapse/expand on almost any scroll movement, which
        // read as twitchy rather than a deliberate "scrolling down a
        // meaningful amount" gesture.
        if (delta > 24) setCollapsed(true)
        else if (delta < -24) setCollapsed(false)
      }
      lastY = y
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Broadcast loader completion for other islands on the page (e.g.
  // Hero's typewriter headline, which needs to know not to animate
  // itself while it's invisible underneath this overlay). A plain
  // window event plus a flag for late listeners — cheap, and doesn't
  // require wiring a shared store between two independently-hydrated
  // Astro islands for one boolean.
  useEffect(() => {
    if (!loading) {
      ;(window as unknown as { __loaderDone?: boolean }).__loaderDone = true
      window.dispatchEvent(new Event('loader:complete'))
    }
  }, [loading])

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen key="loader" onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      <nav
        className={`${navStyles.navbar} ${scrolled ? navStyles.scrolled : ''} ${collapsed ? navStyles.collapsed : ''}`}
      >
        <a className={navStyles.navLogo} href="/">
          <motion.div layoutId="brand-logo" className={navStyles.logoBadge}>
            <LogoMark big={false} />
          </motion.div>
          <span>Spatial AI</span>
        </a>

        <ul className={navStyles.navCenter} aria-hidden={collapsed}>
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} tabIndex={collapsed ? -1 : undefined}>{link.label}</a>
            </li>
          ))}
        </ul>

        <div className={navStyles.navRight} aria-hidden={collapsed}>
          <button
            className={navStyles.sidebarTrigger}
            onClick={openSidebar}
            aria-label="Open services menu"
            tabIndex={collapsed ? -1 : undefined}
          >
            <div className={navStyles.stDots}>
              <span></span>
              <span></span>
            </div>
            Services
          </button>
          <a href={appLinks.signup} className={navStyles.navCta} tabIndex={collapsed ? -1 : undefined}>
            Try Free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <button
            className={navStyles.menuToggle}
            onClick={openSidebar}
            aria-label="Open menu"
            tabIndex={collapsed ? -1 : undefined}
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
    </>
  )
}
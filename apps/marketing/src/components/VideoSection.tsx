import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './VideoSection.module.css'
import sectionStyles from './Section.module.css'
import { useReveal } from '../hooks/useReveal'
import { useOffscreenPause } from '../hooks/useOffscreenPause'

const PlayIcon = () => (
  <svg viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
  </svg>
)

// Swap `placeholder` for a real <video className={styles.video} src="..."
// autoPlay={false} muted loop playsInline /> once footage is ready — the
// stage/filmstrip markup and theater-mode transition don't need to change.
const videos = [
  { title: 'Spatial AI Explorer', sub: 'Full demo · Live AR detection walkthrough', duration: '02:14' },
  { title: 'Template Match', sub: 'Snap-and-find in under a second', duration: '00:45' },
  { title: 'Voice Commands', sub: 'Natural language search, hands-free', duration: '00:30' },
]

export function VideoSection() {
  const ref = useReveal()
  useOffscreenPause(ref as React.RefObject<HTMLElement | null>)

  const [active, setActive] = useState(0)
  const [theaterOpen, setTheaterOpen] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!theaterOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTheaterOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [theaterOpen])

  const current = videos[active]

  return (
    <section id="video-section" className={styles.section} ref={ref as React.RefObject<HTMLElement>}>
      <div className={sectionStyles.sectionInner}>
        <span className={`${sectionStyles.eyebrow} reveal`}>In Motion</span>
        <h2 className={`${sectionStyles.h2} reveal`}>
          Watch it
          <br />
          <span className="accent">come alive.</span>
        </h2>
        <p className={`${sectionStyles.body} reveal`}>
          One screen, three cuts. Select a reel below, then step into theater mode
          for the full-screen take.
        </p>
      </div>

      <div className={`${styles.theaterWrap} reveal`} data-reveal="scale">
        <motion.button
          type="button"
          className={styles.stage}
          layoutId="theater-stage"
          onClick={() => setTheaterOpen(true)}
          aria-label={`Open theater mode — ${current.title}`}
        >
          <span className={styles.letterbox} data-pos="top" />
          <span className={styles.letterbox} data-pos="bottom" />

          <AnimatePresence mode="wait">
            <motion.div
              key={current.title}
              className={styles.frame}
              initial={{ opacity: 0, scale: 1.035, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.975, filter: 'blur(4px)' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.frameGradient} />
              <div className={styles.frameGrain} />
              <div className={styles.frameVignette} />

              <span className={styles.playBtn}>
                <span className={styles.playRing} />
                <PlayIcon />
              </span>

              <div className={styles.frameMeta}>
                <div>
                  <div className={styles.frameTitle}>{current.title}</div>
                  <div className={styles.frameSub}>{current.sub}</div>
                </div>
                <div className={styles.timecode}>00:00 / {current.duration}</div>
              </div>
            </motion.div>
          </AnimatePresence>

          <span className={styles.expandHint}>
            <ExpandIcon />
            Theater mode
          </span>
        </motion.button>

        <div className={styles.filmstrip} role="tablist" aria-label="Select a video">
          {videos.map((v, i) => (
            <button
              key={v.title}
              role="tab"
              aria-selected={i === active}
              className={`${styles.chip} ${i === active ? styles.chipActive : ''}`}
              onClick={() => setActive(i)}
            >
              <span className={styles.sprockets} />
              <span className={styles.chipThumb}>
                <PlayIcon />
              </span>
              <span className={styles.chipMeta}>
                <span className={styles.chipTitle}>{v.title}</span>
                <span className={styles.chipDuration}>{v.duration}</span>
              </span>
              {i === active && <motion.span className={styles.chipUnderline} layoutId="chip-underline" />}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {theaterOpen && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={() => setTheaterOpen(false)}
          >
            <motion.div
              className={styles.modalStage}
              layoutId="theater-stage"
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={styles.letterbox} data-pos="top" />
              <span className={styles.letterbox} data-pos="bottom" />

              <div className={styles.frame}>
                <div className={styles.frameGradient} />
                <div className={styles.frameGrain} />
                <div className={styles.frameVignette} />
                <span className={styles.playBtn}>
                  <span className={styles.playRing} />
                  <PlayIcon />
                </span>
                <div className={styles.frameMeta}>
                  <div>
                    <div className={styles.frameTitle}>{current.title}</div>
                    <div className={styles.frameSub}>{current.sub}</div>
                  </div>
                  <div className={styles.timecode}>00:00 / {current.duration}</div>
                </div>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                className={styles.closeBtn}
                onClick={() => setTheaterOpen(false)}
                aria-label="Close theater mode"
              >
                <CloseIcon />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

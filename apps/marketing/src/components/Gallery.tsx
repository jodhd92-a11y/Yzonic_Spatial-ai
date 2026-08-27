import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion'
import styles from './Gallery.module.css'
import sectionStyles from './Section.module.css'
import { useReveal } from '../hooks/useReveal'
import { useOffscreenPause } from '../hooks/useOffscreenPause'

const items = [
  { title: 'AR Detection', sub: 'Real-time object recognition' },
  { title: 'Template Match', sub: 'Snap-once-find-forever' },
  { title: 'Spatial Mapping', sub: '3D environment understanding' },
  { title: 'Live Overlay', sub: '60fps AR annotations' },
  { title: 'Voice Intel', sub: 'Natural language search' },
  { title: 'Privacy Layer', sub: 'On-device encryption' },
  { title: 'Sensor Fusion', sub: 'GPS + compass + gyro' },
  { title: 'WASM Core', sub: 'Rust-compiled engine' },
]

const STEP_DEG = 360 / items.length

// Card width must match Gallery.module.css's own breakpoints exactly
// (400px desktop, 280px at <=900px) — otherwise the 3D radius math
// below computes spacing for the desktop size while CSS is actually
// rendering the smaller mobile card, causing cards to overlap/misalign
// on phones and tablets.
function getCardWidth() {
  if (typeof window === 'undefined') return 400
  return window.innerWidth <= 900 ? 280 : 400
}

interface DustDef {
  left: string
  top: string
  size: number
  delay: number
  duration: number
}

function AmbientDust({ active }: { active: boolean }) {
  const [dust, setDust] = useState<DustDef[]>([])
  useEffect(() => {
    setDust(
      Array.from({ length: 14 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1.5 + Math.random() * 2,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 5,
      }))
    )
  }, [])
  return (
    <div className={styles.particleLayer}>
      {active &&
        dust.map((d, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute', left: d.left, top: d.top,
              width: d.size, height: d.size, borderRadius: '50%',
              background: 'var(--primary)',
            }}
            animate={{ opacity: [0, 0.5, 0], y: [0, -24, -48] }}
            transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
    </div>
  )
}

// One card's position around the ring is a FIXED transform (set once,
// based on its index) — only the ring's own rotateY needs to update
// during drag, no matter how many cards there are. Scale/opacity
// still update live per-card, but only two cheap derived values, not
// a full position recompute.
function GalleryCard({
  index,
  angle,
  radius,
}: {
  index: number
  angle: ReturnType<typeof useMotionValue<number>>
  radius: number
}) {
  const item = items[index]
  const cardAngle = index * STEP_DEG

  const facingDistance = useTransform(angle, (val) => {
    const total = cardAngle + val
    const norm = ((total % 360) + 360) % 360
    return Math.min(norm, 360 - norm)
  })
  const scale = useTransform(facingDistance, [0, 90, 180], [1, 0.72, 0.6])
  const opacity = useTransform(facingDistance, [0, 90, 160, 180], [1, 0.55, 0.2, 0.12])

  return (
    <div
      className={styles.cardSlot}
      style={{ transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)` }}
    >
      <motion.div className={styles.card} style={{ scale, opacity }}>
        <div className={styles.cardPlaceholder}>
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.5-3.5L13 16" />
          </svg>
          Drop image {index + 1}
        </div>
        <div className={styles.cardSheen} />
        <div className={styles.indexBadge}>
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </div>
        <div className={styles.cardOverlay}>
          <span className={styles.eyebrowTag}>Spatial AI</span>
          <div className={styles.caption}>{item.title}</div>
          <div className={styles.sub}>{item.sub}</div>
        </div>
      </motion.div>
    </div>
  )
}

export function Gallery() {
  const ref = useReveal()
  useOffscreenPause(ref)
  const angle = useMotionValue(0)
  const [playing, setPlaying] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [cardWidth, setCardWidth] = useState(400)
  const [inView, setInView] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const update = () => setCardWidth(getCardWidth())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // The ring auto-rotates continuously and the ambient dust runs 14
  // infinite tweens — both are pure waste while this section is
  // scrolled far out of view, so they're only allowed to run once the
  // section is genuinely on screen (rootMargin starts them slightly
  // early so there's no visible "cold start" when it arrives).
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0].isIntersecting),
      { rootMargin: '200px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref])

  const radius = useMemo(
    () => Math.round((cardWidth / 2) / Math.tan(Math.PI / items.length) * 1.35),
    [cardWidth]
  )

  const pointerState = useRef({ active: false, lastX: 0, lastT: 0, velocity: 0 })

  useEffect(() => {
    if (!playing || dragging || prefersReducedMotion || !inView) return
    const controls = animate(angle, angle.get() - 360, {
      duration: 50,
      ease: 'linear',
      repeat: Infinity,
    })
    return () => controls.stop()
  }, [playing, dragging, prefersReducedMotion, inView, angle])

  const handlePointerDown = (e: React.PointerEvent) => {
    setPlaying(false)
    setDragging(true)
    pointerState.current = { active: true, lastX: e.clientX, lastT: performance.now(), velocity: 0 }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = pointerState.current
    if (!state.active) return
    const now = performance.now()
    const dx = e.clientX - state.lastX
    const dt = Math.max(1, now - state.lastT)
    const sensitivity = 0.35
    angle.set(angle.get() + dx * sensitivity)
    state.velocity = (dx / dt) * sensitivity * 16
    state.lastX = e.clientX
    state.lastT = now
  }

  const handlePointerUp = () => {
    const state = pointerState.current
    if (!state.active) return
    state.active = false
    setDragging(false)
    // Real momentum: release the ring with its last measured velocity
    // and let physics-based inertia decay it to a stop.
    animate(angle, angle.get() + state.velocity * 12, {
      type: 'inertia',
      velocity: state.velocity * 60,
      power: 0.4,
      timeConstant: 280,
      restDelta: 0.5,
    })
  }

  return (
    <section id="gallery-section" className={styles.gallery} ref={ref as React.RefObject<HTMLElement>}>
      <div className={styles.ambientGlow}>
        <div className={`${styles.ambientBlob} ${styles.blob1}`} />
        <div className={`${styles.ambientBlob} ${styles.blob2}`} />
      </div>

      <AmbientDust active={inView} />

      <div className={styles.head}>
        <div>
          <span className={`${sectionStyles.eyebrow} reveal`}>Visual Showcase</span>
          <h2 className={`${sectionStyles.h2} reveal`}>
            A gallery of
            <br />
            <span className="accent">moments.</span>
          </h2>
        </div>
        <div className={`${styles.controls} reveal`}>
          <button
            className={`${styles.controlBtn} ${playing ? styles.active : ''}`}
            onClick={() => setPlaying(true)}
          >
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" /></svg>
            Run
          </button>
          <button
            className={`${styles.controlBtn} ${!playing ? styles.active : ''}`}
            onClick={() => setPlaying(false)}
          >
            <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor" /><rect x="14" y="4" width="4" height="16" fill="currentColor" /></svg>
            Pause
          </button>
          <span className={styles.hint}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 11l-6 6v3h9M22 12l-4-4v3H10v2h8v3l4-4z" />
            </svg>
            Drag to rotate
          </span>
        </div>
      </div>

      <div
        className={`${styles.stage} ${dragging ? styles.grabbing : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <motion.div className={styles.ring} style={{ rotateY: angle }}>
          {items.map((_, i) => (
            <GalleryCard key={i} index={i} angle={angle} radius={radius} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

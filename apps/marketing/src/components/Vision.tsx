import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import styles from './Vision.module.css'
import sectionStyles from './Section.module.css'
import { useOffscreenPause } from '../hooks/useOffscreenPause'

const chapters = [
  {
    title: 'Surgery & the OR',
    desc: 'Intra-op field documentation, sterile-field and PPE verification, and specimen capture — real-time clinical documentation in the operating theatre.',
    color: '#4fc3f7',
  },
  {
    title: 'Bedside & Nursing Care',
    desc: 'Wound staging with a calibrated scale, medication label verification, patient ID checks, and monitor readouts — captured accurately in seconds at the bedside.',
    color: '#7c4dff',
  },
  {
    title: 'Pathology & Laboratory Medicine',
    desc: 'Gross specimen photography, gel and blot documentation, culture and colony counts, and microscopy capture — properly measured, for the lab notebook and the chart.',
    color: '#66bb6a',
  },
  {
    title: 'Biotech Research',
    desc: 'Document cell cultures, plate assays, and electrophoresis runs with real-world scale and case metadata attached — reproducible records from bench to publication.',
    color: '#ffb74d',
  },
  {
    title: 'Medical Education',
    desc: 'Build a de-identified, redacted, well-tagged teaching set from real cases — every image carries modality, body site, and scale so students see it accurately.',
    color: '#ff6b9d',
  },
  {
    title: 'Diagnostic Imaging',
    desc: 'Photograph film, light-box, and screen-displayed studies with legible, tone-accurate capture — a fast bridge between imaging and the record.',
    color: '#29b6f6',
  },
]

const N = chapters.length

function Chapter({
  index,
  progress,
}: {
  index: number
  progress: ReturnType<typeof useScroll>['scrollYProgress']
}) {
  const start = index / N
  const end = (index + 1) / N
  const pad = 0.02

  // Clamped to [0, 1] — without this, the first chapter's lower bound
  // goes slightly negative and the last chapter's upper bound goes
  // slightly above 1, both outside the valid scroll-progress range.
  // That's what triggered the "offsets must be monotonically
  // non-decreasing" error from the browser's native animation engine.
  const b0 = Math.max(0, start - pad)
  const b1 = Math.min(1, Math.max(b0 + 0.001, start + pad))
  const b2 = Math.max(b1 + 0.001, end - pad)
  const b3 = Math.min(1, Math.max(b2 + 0.001, end + pad))

  const opacity = useTransform(
    progress,
    [b0, b1, b2, b3],
    [0, 1, 1, 0]
  )
  const y = useTransform(
    progress,
    [b0, b1, b2, b3],
    [30, 0, 0, -30]
  )

  const chapter = chapters[index]

  return (
    <motion.div className={styles.chapter} style={{ opacity, y }}>
      <span className={styles.chapterLabel} style={{ color: chapter.color }}>
        {String(index + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
      </span>
      <h3 className={styles.chapterTitle}>{chapter.title}</h3>
      <p className={styles.chapterDesc}>{chapter.desc}</p>
    </motion.div>
  )
}

export function Vision() {
  const outerRef = useRef<HTMLDivElement>(null)
  useOffscreenPause(outerRef)
  const [active, setActive] = useState(0)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(N - 1, Math.max(0, Math.floor(v * N)))
    setActive(idx)
  })

  const orbColor = useTransform(
    scrollYProgress,
    chapters.map((_, i) => (i + 0.5) / N),
    chapters.map((c) => c.color)
  )
  const orbRotate = useTransform(scrollYProgress, [0, 1], [0, 180])
  const orbScale = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0.85, 1, 1, 0.85])

  const jumpTo = (i: number) => {
    const el = outerRef.current
    if (!el) return
    const targetY = el.offsetTop + (el.offsetHeight * (i + 0.5)) / N
    window.scrollTo({ top: targetY, behavior: 'smooth' })
  }

  return (
    <div id="vision-section" ref={outerRef} className={styles.outer}>
      <div className={styles.sticky}>
        <div className={styles.eyebrowRow}>
          <span className={sectionStyles.eyebrow}>Where It's Used</span>
        </div>

        <div className={styles.core}>
          <div className={styles.orbWrap}>
            <motion.div
              className={styles.orbGlow}
              style={{ background: orbColor }}
            />
            <motion.div
              className={styles.orbRing + ' ' + styles.ring1}
              style={{ borderColor: orbColor, rotate: orbRotate }}
            />
            <div className={`${styles.orbRing} ${styles.ring2}`} style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
            <motion.div
              className={styles.orbRing + ' ' + styles.ring3}
              style={{ borderColor: orbColor }}
            />
            <motion.div
              className={styles.orbCore}
              style={{ background: orbColor, scale: orbScale }}
            >
              <span className={styles.orbNum}>{String(active + 1).padStart(2, '0')}</span>
            </motion.div>
          </div>

          <div className={styles.textCol}>
            {chapters.map((_, i) => (
              <Chapter key={i} index={i} progress={scrollYProgress} />
            ))}
          </div>
        </div>

        <div className={styles.rail}>
          {chapters.map((c, i) => (
            <div
              key={i}
              className={`${styles.railDot} ${i === active ? styles.active : ''}`}
              onClick={() => jumpTo(i)}
              style={{ background: i === active ? c.color : undefined }}
            />
          ))}
        </div>

        <div className={styles.progressText}>
          SCROLL TO EXPLORE · {String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}

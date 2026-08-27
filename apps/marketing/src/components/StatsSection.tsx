import { useEffect, useRef, useState } from 'react'
import styles from './StatsSection.module.css'

const stats = [
  { target: 60, suffix: '', label: 'Frames per second, live detection' },
  { target: 100, suffix: '%', label: 'On-device, zero cloud' },
  { target: 12, suffix: 'ms', label: 'Average detection latency' },
  { target: 5, suffix: '', label: 'Sensors fused simultaneously' },
]

function StatItem({ target, suffix, label }: (typeof stats)[number]) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        const duration = 1800
        let start: number | null = null
        const step = (ts: number) => {
          if (start === null) start = ts
          const p = Math.min((ts - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(eased * target))
          if (p < 1) requestAnimationFrame(step)
          else setValue(target)
        }
        requestAnimationFrame(step)
        io.unobserve(el)
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [target])

  return (
    <div ref={ref} className={`${styles.item} ${visible ? styles.visible : ''}`}>
      <div className={styles.num}>
        {value}
        {suffix}
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  )
}

export function StatsSection() {
  return (
    <section id="stats-section" className={styles.section}>
      <div className={styles.grid}>
        {stats.map((s) => (
          <StatItem key={s.label} {...s} />
        ))}
      </div>
    </section>
  )
}

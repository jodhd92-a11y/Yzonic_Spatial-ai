import { useEffect, useRef, useState } from 'react'
import styles from './ThemeSwitcher.module.css'

type ThemeName = 'default' | 'pink' | 'yellow' | 'golden' | 'green' | 'violet' | 'coral'

const THEMES: { name: ThemeName; color: string; label: string }[] = [
  { name: 'default', color: '#4fc3f7', label: 'Light blue theme' },
  { name: 'pink', color: '#ff6b9d', label: 'Pink theme' },
  { name: 'yellow', color: '#ffd93d', label: 'Yellow theme' },
  { name: 'golden', color: '#ffb74d', label: 'Golden theme' },
  { name: 'green', color: '#66bb6a', label: 'Green theme' },
  { name: 'violet', color: '#a78bfa', label: 'Violet theme' },
  { name: 'coral', color: '#ff7e5f', label: 'Coral theme' },
]

const STORAGE_KEY = 'sai_theme'

export function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeName>('default')
  const [open, setOpen] = useState(false)
  const rippleHostRef = useRef<HTMLDivElement>(null)
  const skipRipple = useRef(true)

  // Restore saved theme on mount without firing the ripple flourish.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null
      if (saved && THEMES.some((t) => t.name === saved)) {
        applyTheme(saved)
      }
    } catch {
      /* localStorage unavailable — theme just stays default */
    }
    skipRipple.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyTheme(name: ThemeName) {
    if (name === 'default') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', name)
    }
    setActive(name)
    if ((window as any).__updateHeroColors) setTimeout((window as any).__updateHeroColors, 50)
    try {
      localStorage.setItem(STORAGE_KEY, name)
    } catch {
      /* ignore */
    }
  }

  function fireRipple(x: number, y: number, color: string) {
    const host = rippleHostRef.current
    if (!host) return
    host.style.setProperty('--ripple-color', color)

    const halo = document.createElement('div')
    halo.className = 'halo'
    halo.style.left = `${x}px`
    halo.style.top = `${y}px`
    halo.style.setProperty('--ripple-color', color)
    host.appendChild(halo)
    void halo.offsetWidth
    halo.classList.add('fire')

    const wave = document.createElement('div')
    wave.className = 'wave'
    wave.style.left = `${x}px`
    wave.style.top = `${y}px`
    wave.style.setProperty('--ripple-color', color)
    const cover = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight) * 1.05)
    wave.style.width = `${cover}px`
    wave.style.height = `${cover}px`
    host.appendChild(wave)
    void wave.offsetWidth
    wave.classList.add('fire')

    const sparkCount = window.innerWidth <= 768 ? 8 : 12
    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement('div')
      spark.className = 'spark'
      spark.style.left = `${x}px`
      spark.style.top = `${y}px`
      spark.style.setProperty('--ripple-color', color)
      const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.4
      const dist = 60 + Math.random() * 90
      spark.style.setProperty('--sx', `${(Math.cos(angle) * dist).toFixed(1)}px`)
      spark.style.setProperty('--sy', `${(Math.sin(angle) * dist).toFixed(1)}px`)
      const sz = 5 + Math.random() * 7
      spark.style.width = `${sz}px`
      spark.style.height = `${sz}px`
      spark.style.animationDelay = `${(Math.random() * 0.08).toFixed(3)}s`
      host.appendChild(spark)
      void spark.offsetWidth
      spark.classList.add('fire')
    }

    setTimeout(() => {
      while (host.firstChild) host.removeChild(host.firstChild)
    }, 1400)
  }

  function handlePick(theme: (typeof THEMES)[number], e: React.MouseEvent<HTMLButtonElement>) {
    applyTheme(theme.name)
    setOpen(false)

    if (!skipRipple.current) {
      let x = window.innerWidth / 2
      let y = window.innerHeight / 2
      if (e.clientX || e.clientY) {
        x = e.clientX
        y = e.clientY
      } else {
        const r = e.currentTarget.getBoundingClientRect()
        x = r.left + r.width / 2
        y = r.top + r.height / 2
      }
      fireRipple(x, y, theme.color)
    }
  }

  const activeColor = THEMES.find((t) => t.name === active)?.color ?? THEMES[0].color

  return (
    <>
      <div
        className={`${styles.switcher} ${open ? styles.open : ''}`}
        aria-label="Color theme switcher"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}
      >
        <button
          className={styles.toggle}
          aria-label="Open theme picker"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.toggleSwatch} style={{ ['--dot-color' as any]: activeColor }} />
        </button>
        <div className={styles.label}>Theme</div>
        <div className={styles.dots}>
          {THEMES.map((theme) => (
            <button
              key={theme.name}
              className={`${styles.dot} ${active === theme.name ? styles.active : ''}`}
              style={{ ['--dot-color' as any]: theme.color }}
              aria-label={theme.label}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => handlePick(theme, e)}
            />
          ))}
        </div>
      </div>
      <div ref={rippleHostRef} className={styles.rippleHost} />
    </>
  )
}

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useStore } from '@nanostores/react'
import { sidebarOpen as sidebarOpenStore, closeSidebar } from '../stores/ui'
import { appLinks } from '../lib/app-links'
import styles from './Sidebar.module.css'

const navLinks = [
  { href: '#features-section', title: 'Features', desc: 'Core capabilities & engine' },
  { href: '#showcase-section', title: 'Technology', desc: 'How it works under the hood' },
  { href: '#gallery-section', title: 'Gallery', desc: 'Visual showcase & demos' },
  { href: '#video-section', title: 'Videos', desc: 'Watch it in motion' },
  { href: '#vision-section', title: 'Vision', desc: 'Future goals & applications' },
  { href: '#about-section', title: 'About', desc: 'Yzonic.corp & founder' },
]

const services = [
  { title: 'On-Device AI', desc: 'WASM vision core, zero cloud' },
  { title: 'Template Match', desc: 'Snap once, find anywhere' },
  { title: 'Spatial Mapping', desc: 'GPS + compass + gyro fusion' },
  { title: 'Voice Intel', desc: 'Natural language commands' },
]

interface DustDef {
  left: string
  top: string
  size: number
  delay: number
  duration: number
}

function MenuDust() {
  const [dust, setDust] = useState<DustDef[]>([])
  useEffect(() => {
    setDust(
      Array.from({ length: 20 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 5,
      }))
    )
  }, [])
  return (
    <div className={styles.particleLayer}>
      {dust.map((d, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', left: d.left, top: d.top,
            width: d.size, height: d.size, borderRadius: '50%',
            background: 'var(--primary)',
          }}
          animate={{ opacity: [0, 0.6, 0], y: [0, -30, -60] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

const linkVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

// No more open/onClose props — this island reads/writes the shared
// nanostore directly, since it's a separate React root from NavWithLoader
// (which is the one that actually triggers openSidebar()).
export function Sidebar() {
  const open = useStore(sidebarOpenStore)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ clipPath: 'circle(0% at 90% 5%)' }}
          animate={{ clipPath: 'circle(150% at 90% 5%)' }}
          exit={{ clipPath: 'circle(0% at 90% 5%)' }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <MenuDust />

          <div className={styles.head}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Menu
            </span>
            <button className={styles.close} onClick={closeSidebar} aria-label="Close menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className={styles.body}>
            <div className={styles.navColumn}>
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className={styles.bigLink}
                  custom={i}
                  variants={linkVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={closeSidebar}
                >
                  <span className={styles.bigLinkNum}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.bigLinkText}>{link.title}</span>
                  <span className={styles.bigLinkDesc}>{link.desc}</span>
                </motion.a>
              ))}
            </div>

            <div className={styles.sideColumn}>
              <div>
                <span className={styles.label}>Services</span>
                <div className={styles.services}>
                  {services.map((s) => (
                    <div key={s.title} className={styles.serviceCard}>
                      <div className={styles.scTitle}>{s.title}</div>
                      <div className={styles.scDesc}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className={styles.label}>Get Started</span>
                <div className={styles.ctaRow}>
                  <a href={appLinks.signup} className={styles.ctaPrimary} onClick={closeSidebar}>
                    Launch App
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a href={appLinks.login} className={styles.ctaSecondary} onClick={closeSidebar}>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.foot}>
            <span className={styles.footText}>© 2026 Yzonic.corp</span>
            <div className={styles.footSocial}>
              <a href="#" aria-label="X / Twitter">
                <svg viewBox="0 0 24 24"><path d="M4 4l16 16M20 4L4 20" /></svg>
              </a>
              <a href="#" aria-label="GitHub">
                <svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
              </a>
              <a href="#" aria-label="Email">
                <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

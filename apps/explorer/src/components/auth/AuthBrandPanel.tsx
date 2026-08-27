'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthLogoMark } from './AuthLogoMark'
import { AuthHeroDevice } from './AuthHeroDevice'

const TAGLINES = [
  { title: 'Point. Document. Chart it.', body: 'Aim your camera at a wound, specimen, or monitor and get a properly measured, case-tagged photo back.' },
  { title: 'Built for the bedside and the bench.', body: 'Spatial·AI documents wounds, specimens, slides, and procedures with scale, redaction, and case metadata built in.' },
  { title: 'For clinicians, surgeons & researchers.', body: 'No general camera clutter — every workflow here maps to real clinical or lab documentation.' },
]

export function AuthBrandPanel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % TAGLINES.length), 4200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-[var(--auth-bg-0)] lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* layered mesh background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-mesh auth-mesh-1" />
        <div className="auth-mesh auth-mesh-2" />
        <div className="auth-mesh auth-mesh-3" />
        <div className="auth-grain" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(5,7,13,0.35)_100%)]" />
      </div>

      {/* header */}
      <div className="relative z-10 flex items-center gap-2.5">
        <AuthLogoMark size={30} />
        <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-[var(--auth-text)]">
          Spatial<span className="text-[var(--auth-primary)]">·</span>AI
        </span>
      </div>

      {/* Reuses AuthHeroDevice (the mobile-signup phone frame — scan-ring
          and "Scanning environment…" label already removed) scaled up
          for the desktop panel. The hover-driven 3D tilt suits a
          mouse-driven desktop view better than it ever did on touch. */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="scale-[1.7]">
          <AuthHeroDevice />
        </div>
      </div>

      {/* rotating tagline */}
      <div className="relative z-10 min-h-[92px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <h2 className="font-[family-name:var(--font-auth-serif)] text-[30px] italic leading-[1.15] text-[var(--auth-text)]">
              {TAGLINES[index].title}
            </h2>
            <p className="mt-2.5 max-w-[360px] text-[14px] leading-relaxed text-[var(--auth-text-dim)]">
              {TAGLINES[index].body}
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex gap-1.5">
          {TAGLINES.map((_, i) => (
            <button
              key={i}
              aria-label={`Show tagline ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 20 : 8,
                backgroundColor: i === index ? 'var(--auth-primary)' : 'rgba(245,247,250,0.18)',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .auth-mesh {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
        }
        .auth-mesh-1 {
          width: 55%; height: 55%; top: -12%; left: -8%;
          background: var(--auth-primary); opacity: 0.22;
          animation: auth-mesh-drift-1 24s ease-in-out infinite alternate;
        }
        .auth-mesh-2 {
          width: 50%; height: 50%; bottom: -15%; right: -10%;
          background: var(--auth-accent); opacity: 0.24;
          animation: auth-mesh-drift-2 28s ease-in-out infinite alternate;
        }
        .auth-mesh-3 {
          width: 35%; height: 35%; top: 40%; left: 30%;
          background: var(--auth-primary-deep); opacity: 0.12;
          animation: auth-mesh-drift-1 20s ease-in-out infinite alternate-reverse;
        }
        .auth-grain {
          position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        @keyframes auth-mesh-drift-1 {
          from { transform: translate(0,0) scale(1); }
          to { transform: translate(5%,8%) scale(1.1); }
        }
        @keyframes auth-mesh-drift-2 {
          from { transform: translate(0,0) scale(1); }
          to { transform: translate(-6%,-5%) scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-mesh { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

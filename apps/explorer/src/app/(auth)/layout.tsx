'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { AuthLogoMark } from '@/components/auth/AuthLogoMark'

const ROUTE_ORDER = ['/login', '/signup', '/verify-otp', '/forgot-password', '/reset-password']

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevIndexRef = useRef(ROUTE_ORDER.indexOf(pathname))
  const currentIndex = ROUTE_ORDER.indexOf(pathname)
  const direction = currentIndex >= prevIndexRef.current ? 1 : -1
  prevIndexRef.current = currentIndex

  return (
    <div className="auth-scope h-dvh w-full overflow-hidden bg-[var(--auth-bg-0)] text-[var(--auth-text)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      {/* Desktop: branded left panel */}
      <AuthBrandPanel />

      {/* Form column — full-bleed on mobile, right half on desktop */}
      <div className="relative flex h-dvh flex-col overflow-y-auto">
        {/* mobile-only aurora backdrop (desktop gets the brand panel instead) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="auth-aurora auth-aurora-1" />
          <div className="auth-aurora auth-aurora-2" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--auth-bg-0)_75%)]" />
        </div>

        <div className="relative z-10 flex min-h-full flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-12 xl:px-20">
          {/* mobile header — desktop shows the brand panel instead */}
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <AuthLogoMark size={28} />
            <span className="font-[family-name:var(--font-display)] text-[14px] font-semibold tracking-tight text-[var(--auth-text-dim)]">
              Spatial<span className="text-[var(--auth-primary)]">·</span>AI
            </span>
          </Link>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-[400px]">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={pathname}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -18 }}
                  transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-[var(--auth-text-faint)]">
            By continuing you agree to Spatial·AI&apos;s Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <style>{`
        .auth-aurora {
          position: absolute; width: 90vw; height: 90vw; max-width: 600px; max-height: 600px;
          border-radius: 50%; filter: blur(90px); opacity: 0.25;
        }
        .auth-aurora-1 { top: -25%; left: -20%; background: var(--auth-primary); animation: auth-drift-1 22s ease-in-out infinite alternate; }
        .auth-aurora-2 { bottom: -25%; right: -20%; background: var(--auth-accent); animation: auth-drift-2 26s ease-in-out infinite alternate; }
        @keyframes auth-drift-1 { from { transform: translate(0,0) scale(1); } to { transform: translate(6%,8%) scale(1.08); } }
        @keyframes auth-drift-2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-6%,-6%) scale(1.05); } }
        @media (prefers-reduced-motion: reduce) {
          .auth-aurora { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { primaryNavItems } from './navItems'
import { triggerHaptic } from '@/lib/scan-effects'

// Elastic but critically-settled — one gentle overshoot on the blob/icon,
// never a second wobble. This is what reads as "liquid" rather than
// "bouncy": the material momentarily overshoots like a droplet finding
// its shape, then holds still.
const BLOB_SPRING = { type: 'spring' as const, stiffness: 480, damping: 30, mass: 0.8 }
const ICON_SPRING = { type: 'spring' as const, stiffness: 560, damping: 22, mass: 0.55 }
const TAP_SPRING = { type: 'spring' as const, stiffness: 700, damping: 32 }

export function BottomNav() {
  const { activePage, setPage } = useAppStore()
  const hapticEnabled = useAppStore((s) => s.settings.hapticFeedback)
  const reduceMotion = useReducedMotion()
  // Per-tab ripple key — bumped on every tap so a fresh <span> mounts and
  // plays its one-shot CSS animation, even for repeated taps on the same
  // still-active tab (React wouldn't remount a same-key element otherwise).
  const [ripple, setRipple] = useState<{ id: string; key: number } | null>(null)

  return (
    // Full-bleed edge-to-edge, same as before — no outer wrapper/margin,
    // so the glass material itself reaches both screen edges and there's
    // no gap of page background showing (which is what read as a "black
    // rectangle" behind a floating capsule). Height is still exactly
    // --sp-bottomnav-h + safe-area, same constant every other component
    // (CameraFeed, ChatEmbed, AppShell, TourGuide) already keys off.
    <nav
      className="sp-nav-liquid lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch rounded-t-[26px]"
      style={{ height: 'calc(var(--sp-bottomnav-h) + var(--sp-safe-bottom))', paddingBottom: 'var(--sp-safe-bottom)' }}
    >
      {primaryNavItems.map((item) => {
        const Icon = item.icon
        const active = activePage === item.id
        return (
          <motion.button
            key={item.id}
            onClick={() => {
              setRipple({ id: item.id, key: Date.now() })
              if (active) return
              if (hapticEnabled) triggerHaptic(8)
              setPage(item.id)
            }}
            whileTap={{ scale: 0.9 }}
            transition={reduceMotion ? { duration: 0.1 } : TAP_SPRING}
            className="relative flex-1 flex items-center justify-center gap-1.5 min-h-[44px] overflow-hidden select-none"
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            {/* Tap ripple — a quick radial pulse in the brand color,
                purely decorative (CSS keyframe, compositor thread) so it
                never competes with the blob/icon spring physics above it. */}
            {ripple?.id === item.id && (
              <span
                key={ripple.key}
                aria-hidden
                className="sp-tap-ripple absolute w-16 h-16 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(var(--sp-primary-rgb),0.4), transparent 70%)' }}
                onAnimationEnd={() => setRipple((r) => (r?.key === ripple.key ? null : r))}
              />
            )}

            {/* Liquid blob — one shared layoutId morphs between tabs
                instead of fading in/out per-tab. Sized to hug just the
                icon + (when active) its label — never the full tab-width
                hit area — so it reads as a bead of light riding under the
                content rather than a block filling the whole segment. A
                gradient core plus an inset specular ring gives it a
                raised-glass look instead of a flat colored pill. */}
            {active && (
              <motion.span
                layoutId="bottomNavBlob"
                transition={reduceMotion ? { duration: 0.15 } : BLOB_SPRING}
                className="sp-nav-blob absolute rounded-full"
                style={{ top: '18%', bottom: '18%', left: '18%', right: '18%' }}
              />
            )}

            <motion.span
              key={active ? `${item.id}-on` : `${item.id}-off`}
              initial={reduceMotion ? false : { scale: active ? 0.55 : 1, rotate: active ? -16 : 0 }}
              animate={{ scale: active ? 1.08 : 1, rotate: 0, y: active ? -0.5 : 0 }}
              transition={reduceMotion ? { duration: 0.1 } : ICON_SPRING}
              className="relative z-10 flex items-center justify-center"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.3 : 1.9}
                fill={active ? 'currentColor' : 'none'}
                fillOpacity={active ? 0.18 : 0}
                className={[
                  'transition-colors duration-200',
                  active ? 'text-white' : 'text-[var(--sp-text-faint)]',
                ].join(' ')}
              />
            </motion.span>

            {/* Label — width/opacity spring in only for the active tab, so
                the resting bar stays icon-only and just the selected tab
                opens up to name itself, without shifting neighboring
                tabs (each tab is an equal flex-1 segment, so the label
                grows inside its own segment's existing space). */}
            <motion.span
              initial={false}
              animate={{ width: active ? 'auto' : 0, opacity: active ? 1 : 0, marginLeft: active ? 2 : 0 }}
              transition={reduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 420, damping: 38 }}
              className="relative z-10 overflow-hidden whitespace-nowrap"
            >
              <span className="text-[12px] font-semibold text-white pr-0.5">{item.label}</span>
            </motion.span>
          </motion.button>
        )
      })}
    </nav>
  )
}

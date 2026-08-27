'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/**
 * Wraps any interactive element (typically a button) so it "pulls" gently
 * toward the pointer on hover and snaps back with a spring on leave — the
 * cursor-magnetism micro-interaction expensive product UIs use on primary
 * actions. Pure CSS transforms driven by framer-motion springs, so it never
 * fights the child's own hover/tap animations or disabled state.
 */
export function Magnetic({
  children,
  strength = 14,
  className,
  disabled,
}: {
  children: React.ReactNode
  /** Max pixel pull toward the pointer. Keep small (10-20) for buttons —
   * this is a subtle "alive" cue, not a drag interaction. */
  strength?: number
  className?: string
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 320, damping: 22, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 320, damping: 22, mass: 0.4 })

  if (disabled) return <div className={className}>{children}</div>

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        x.set(((e.clientX - rect.left - rect.width / 2) / rect.width) * strength)
        y.set(((e.clientY - rect.top - rect.height / 2) / rect.height) * strength)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

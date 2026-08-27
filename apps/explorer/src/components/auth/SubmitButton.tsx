'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'

export function SubmitButton({
  children,
  loading,
  success,
  ...props
}: React.ComponentPropsWithoutRef<typeof motion.button> & { loading?: boolean; success?: boolean }) {
  return (
    <motion.button
      type="submit"
      disabled={loading || success || props.disabled}
      suppressHydrationWarning
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
      className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--auth-primary),var(--auth-accent))] text-[14.5px] font-semibold text-black transition-transform duration-150 disabled:cursor-not-allowed"
      {...props}
    >
      {/* shine sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.35)_50%,transparent_80%)] transition-transform duration-700 group-hover:translate-x-full" />
      <AnimatePresence mode="wait" initial={false}>
        {success ? (
          <motion.span
            key="success"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Check size={19} strokeWidth={3} />
          </motion.span>
        ) : loading ? (
          <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 size={18} className="animate-spin" />
          </motion.span>
        ) : (
          <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

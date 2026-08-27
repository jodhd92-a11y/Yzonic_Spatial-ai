'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function FormMessage({ message, tone }: { message: string | null; tone: 'error' | 'success' }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] ${
              tone === 'error'
                ? 'border-[var(--auth-danger)]/30 bg-[var(--auth-danger)]/10 text-[var(--auth-danger)]'
                : 'border-[var(--auth-success)]/30 bg-[var(--auth-success)]/10 text-[var(--auth-success)]'
            }`}
            role={tone === 'error' ? 'alert' : 'status'}
          >
            {tone === 'error' ? (
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            )}
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

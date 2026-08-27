'use client'

import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { motion } from 'framer-motion'

const LENGTH = 6

export interface OtpInputHandle {
  shake: () => void
  clear: () => void
  success: () => void
}

interface OtpInputProps {
  onComplete: (code: string) => void
  disabled?: boolean
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(({ onComplete, disabled }, ref) => {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const [shaking, setShaking] = useState(false)
  const [litUpTo, setLitUpTo] = useState(-1) // success ripple progress, -1 = off
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useImperativeHandle(ref, () => ({
    shake: () => {
      setShaking(true)
      setTimeout(() => setShaking(false), 420)
    },
    clear: () => {
      setDigits(Array(LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    },
    success: () => {
      // left-to-right confirmation ripple before the page navigates away
      LENGTH_ARRAY.forEach((_, i) => {
        setTimeout(() => setLitUpTo(i), i * 45)
      })
    },
  }))

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  function setDigit(index: number, value: string) {
    const next = [...digits]
    next[index] = value
    setDigits(next)

    if (value && index < LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (next.every((d) => d !== '')) {
      onComplete(next.join(''))
    }
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, '').slice(-1)
    setDigit(index, value)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    const next = Array(LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const lastIndex = Math.min(pasted.length, LENGTH) - 1
    inputRefs.current[lastIndex]?.focus()
    if (pasted.length === LENGTH) onComplete(pasted)
  }

  return (
    <motion.div
      animate={shaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex justify-between gap-2"
    >
      {digits.map((digit, i) => {
        const isLit = litUpTo >= i
        return (
          <motion.input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={disabled}
            suppressHydrationWarning
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            animate={
              isLit
                ? { scale: [1, 1.12, 1], borderColor: 'var(--auth-success)' }
                : digit
                  ? { scale: [1.08, 1] }
                  : {}
            }
            transition={{ duration: 0.25 }}
            className="h-[52px] w-full min-w-0 rounded-xl border border-[var(--auth-glass-border)] bg-black/20 text-center font-[family-name:var(--font-geist-mono)] text-xl font-medium text-[var(--auth-text)] outline-none transition-colors duration-150 focus:border-[var(--auth-primary)]/70 focus:ring-2 focus:ring-[var(--auth-primary)]/25 disabled:opacity-50"
          />
        )
      })}
    </motion.div>
  )
})
OtpInput.displayName = 'OtpInput'

const LENGTH_ARRAY = Array.from({ length: LENGTH })

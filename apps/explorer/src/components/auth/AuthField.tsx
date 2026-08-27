'use client'

import { forwardRef, useId, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  delay?: number
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, type = 'text', delay = 0, className, onFocus, onBlur, ...props }, ref) => {
    const id = useId()
    const [showPassword, setShowPassword] = useState(false)
    const [focused, setFocused] = useState(false)
    const isPassword = type === 'password'
    const resolvedType = isPassword && showPassword ? 'text' : type
    const hasValue = !!props.value || !!props.defaultValue
    const floated = focused || hasValue

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex flex-col gap-1.5"
      >
        <div className="relative">
          {label && (
            <motion.label
              htmlFor={id}
              animate={floated ? { top: 6, fontSize: 11, opacity: 0.65 } : { top: 13, fontSize: 15, opacity: 0.5 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="pointer-events-none absolute left-3.5 origin-left font-medium text-[var(--auth-text)]"
            >
              {label}
            </motion.label>
          )}
          <input
            id={id}
            ref={ref}
            type={resolvedType}
            aria-invalid={!!error}
            suppressHydrationWarning
            onFocus={(e) => {
              setFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              onBlur?.(e)
            }}
            className={`w-full rounded-xl border bg-black/20 px-3.5 text-[15px] text-[var(--auth-text)] outline-none transition-all duration-200 ${
              label ? 'h-[52px] pt-[19px] pb-[7px]' : 'h-[46px]'
            } ${
              error
                ? 'border-[var(--auth-danger)] focus:ring-2 focus:ring-[var(--auth-danger)]/30'
                : 'border-[var(--auth-glass-border)] focus:border-[var(--auth-primary)]/60 focus:ring-2 focus:ring-[var(--auth-primary)]/20'
            } ${isPassword ? 'pr-10' : ''} ${className ?? ''}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--auth-text-faint)] transition-colors hover:text-[var(--auth-text-dim)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-[12.5px] text-[var(--auth-danger)]"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    )
  },
)
AuthField.displayName = 'AuthField'

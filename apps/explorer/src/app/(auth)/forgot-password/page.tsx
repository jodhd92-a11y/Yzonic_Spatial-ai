'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AuthField } from '@/components/auth/AuthField'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { FormMessage } from '@/components/auth/FormMessage'
import { authApi, ApiError } from '@/lib/auth-api'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setLoading(false)
      setSuccess(true)
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 480)
    } catch (err) {
      setLoading(false)
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="font-[family-name:var(--font-auth-serif)] text-[32px] italic leading-tight text-[var(--auth-text)]"
      >
        Reset your password
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-2.5 text-[14px] text-[var(--auth-text-dim)]"
      >
        Enter your email and we&apos;ll send you a code to reset it.
      </motion.p>

      <FormMessage message={error} tone="error" />

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3.5">
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          required
          delay={0.15}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="mt-1.5">
          <SubmitButton loading={loading} success={success}>
            Send reset code
          </SubmitButton>
        </div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-7 text-center text-[13.5px] text-[var(--auth-text-dim)]"
      >
        Remembered it after all?{' '}
        <Link href="/login" className="font-medium text-[var(--auth-primary)] hover:underline">
          Back to sign in
        </Link>
      </motion.p>
    </div>
  )
}

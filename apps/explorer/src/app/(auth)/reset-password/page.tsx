'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthField } from '@/components/auth/AuthField'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { FormMessage } from '@/components/auth/FormMessage'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { authApi, ApiError } from '@/lib/auth-api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({ email, code, newPassword })
      setLoading(false)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 480)
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
        Set a new password
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-2.5 text-[14px] text-[var(--auth-text-dim)]"
      >
        Enter the code we emailed you along with your new password.
      </motion.p>

      <FormMessage message={error} tone="error" />

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3.5">
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          required
          delay={0.12}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          label="6-digit code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          delay={0.17}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <div>
          <AuthField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            delay={0.22}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordStrengthMeter password={newPassword} />
        </div>

        <div className="mt-1.5">
          <SubmitButton loading={loading} success={success}>
            Reset password
          </SubmitButton>
        </div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.32 }}
        className="mt-7 text-center text-[13.5px] text-[var(--auth-text-dim)]"
      >
        <Link href="/login" className="font-medium text-[var(--auth-primary)] hover:underline">
          Back to sign in
        </Link>
      </motion.p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

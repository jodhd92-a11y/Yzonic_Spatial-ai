'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AuthField } from '@/components/auth/AuthField'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { FormMessage } from '@/components/auth/FormMessage'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { AuthHeroDevice } from '@/components/auth/AuthHeroDevice'
import { authApi, ApiError } from '@/lib/auth-api'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await authApi.signup({ email, password, name: name || undefined })
      setLoading(false)
      setSuccess(true)
      setTimeout(() => router.push(`/verify-otp?email=${encodeURIComponent(email)}`), 480)
    } catch (err) {
      setLoading(false)
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="mb-7 lg:hidden"
      >
        <AuthHeroDevice />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="font-[family-name:var(--font-auth-serif)] text-[36px] italic leading-[1.05] text-[var(--auth-text)]"
      >
        Create your account
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-2.5 text-[14px] text-[var(--auth-text-dim)]"
      >
        Takes about a minute to get started.
      </motion.p>

      <div className="mt-8">
        <OAuthButtons />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="my-6 flex items-center gap-3"
      >
        <div className="h-px flex-1 bg-[var(--auth-glass-border)]" />
        <span className="text-[11.5px] text-[var(--auth-text-faint)]">or continue with email</span>
        <div className="h-px flex-1 bg-[var(--auth-glass-border)]" />
      </motion.div>

      <FormMessage message={error} tone="error" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <AuthField
          label="Name"
          type="text"
          autoComplete="name"
          delay={0.18}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          required
          delay={0.23}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <AuthField
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            delay={0.28}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <div className="mt-1.5">
          <SubmitButton loading={loading} success={success}>
            Create account
          </SubmitButton>
        </div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-7 text-center text-[13.5px] text-[var(--auth-text-dim)]"
      >
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[var(--auth-primary)] hover:underline">
          Sign in
        </Link>
      </motion.p>
    </div>
  )
}

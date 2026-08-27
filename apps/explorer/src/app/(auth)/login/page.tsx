'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthField } from '@/components/auth/AuthField'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { FormMessage } from '@/components/auth/FormMessage'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { authApi, ApiError } from '@/lib/auth-api'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      setError("That sign-in attempt didn't work. Please try again or use email instead.")
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authApi.login({ email, password })
      setLoading(false)
      setSuccess(true)
      setTimeout(() => router.push('/'), 480)
    } catch (err) {
      setLoading(false)
      if (err instanceof ApiError && err.message.toLowerCase().includes('not verified')) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="font-[family-name:var(--font-auth-serif)] text-[36px] italic leading-[1.05] text-[var(--auth-text)]"
      >
        Welcome back
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-2.5 text-[14px] text-[var(--auth-text-dim)]"
      >
        Sign in to pick up where you left off.
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
          label="Email"
          type="email"
          autoComplete="email"
          required
          delay={0.18}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            delay={0.23}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="mt-2 text-right"
          >
            <Link href="/forgot-password" className="text-[12.5px] text-[var(--auth-primary)] hover:underline">
              Forgot password?
            </Link>
          </motion.div>
        </div>

        <div className="mt-1.5">
          <SubmitButton loading={loading} success={success}>
            Sign in
          </SubmitButton>
        </div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-7 text-center text-[13.5px] text-[var(--auth-text-dim)]"
      >
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-[var(--auth-primary)] hover:underline">
          Sign up
        </Link>
      </motion.p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

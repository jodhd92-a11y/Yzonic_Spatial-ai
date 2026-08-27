'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { OtpInput, type OtpInputHandle } from '@/components/auth/OtpInput'
import { FormMessage } from '@/components/auth/FormMessage'
import { authApi, ApiError } from '@/lib/auth-api'

const RESEND_COOLDOWN = 60

function VerifyOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const otpRef = useRef<OtpInputHandle>(null)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleComplete(code: string) {
    setError(null)
    setVerifying(true)
    try {
      await authApi.verifyOtp({ email, code, purpose: 'SIGNUP_VERIFY' })
      otpRef.current?.success()
      setTimeout(() => router.push('/'), 620)
    } catch (err) {
      setVerifying(false)
      otpRef.current?.shake()
      otpRef.current?.clear()
      setError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.')
    }
  }

  async function handleResend() {
    setError(null)
    setInfo(null)
    try {
      await authApi.resendOtp({ email, purpose: 'SIGNUP_VERIFY' })
      setInfo('A new code is on its way.')
      setCooldown(RESEND_COOLDOWN)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend code.')
    }
  }

  if (!email) {
    return (
      <div>
        <h1 className="font-[family-name:var(--font-auth-serif)] text-[30px] italic leading-tight text-[var(--auth-text)]">
          Missing email
        </h1>
        <p className="mt-2.5 text-[14px] text-[var(--auth-text-dim)]">
          We couldn&apos;t tell which account to verify. Please sign up or sign in again.
        </p>
      </div>
    )
  }

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="font-[family-name:var(--font-auth-serif)] text-[32px] italic leading-tight text-[var(--auth-text)]"
      >
        Check your inbox
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
        className="mt-2.5 text-[14px] leading-relaxed text-[var(--auth-text-dim)]"
      >
        Enter the 6-digit code we sent to <span className="text-[var(--auth-text)]">{email}</span>.
      </motion.p>

      <div className="mt-8">
        <FormMessage message={error} tone="error" />
        <FormMessage message={info} tone="success" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <OtpInput ref={otpRef} onComplete={handleComplete} disabled={verifying} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-[13px] text-[var(--auth-text-faint)]"
        >
          {cooldown > 0 ? (
            <span>Resend code in {cooldown}s</span>
          ) : (
            <button type="button" onClick={handleResend} className="text-[var(--auth-primary)] hover:underline">
              Resend code
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  )
}

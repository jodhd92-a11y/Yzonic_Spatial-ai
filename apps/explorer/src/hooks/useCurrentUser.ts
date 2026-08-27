'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi, ApiError } from '@/lib/auth-api'
import { useAppStore, type AppUser } from '@/store/useAppStore'

function toAppUser(user: { id: string; name: string | null; email: string }): AppUser {
  const displayName = user.name?.trim() || user.email.split('@')[0]
  return {
    id: user.id,
    name: displayName,
    email: user.email,
    plan: 'Free plan',
    avatar: displayName.charAt(0).toUpperCase(),
  }
}

export function useLoadCurrentUser() {
  const router = useRouter()
  const setUser = useAppStore((s) => s.setUser)
  const clearUser = useAppStore((s) => s.clearUser)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const user = await authApi.me()
        if (!cancelled) setUser(toAppUser(user))
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Access token expired — try one silent refresh before giving up.
          try {
            await authApi.refresh()
            const user = await authApi.me()
            if (!cancelled) setUser(toAppUser(user))
            return
          } catch {
            // Refresh token is gone/expired too — genuinely signed out.
          }
        }
        if (!cancelled) {
          clearUser()
          router.push('/login')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [setUser, clearUser, router])
}

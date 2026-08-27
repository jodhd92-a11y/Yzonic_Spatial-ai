'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/**
 * Applies the General settings tab's Theme preference to the document —
 * the one piece of settings state that has to live outside React (it
 * toggles a class on `<html>`, which paints before hydration matters).
 * "System" tracks the OS-level `prefers-color-scheme` live, the same way
 * every other production app's theme setting behaves.
 */
export function ThemeEffect() {
  const theme = useAppStore((s) => s.settings.theme)

  useEffect(() => {
    const root = document.documentElement
    const apply = (mode: 'light' | 'dark') => {
      root.classList.remove('light', 'dark')
      root.classList.add(mode)
    }

    if (theme !== 'system') {
      apply(theme)
      return
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    apply(mql.matches ? 'dark' : 'light')
    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  return null
}

'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

// Marks a history entry as one of ours, so we can tell "the guard's own
// re-armed state" apart from a real prior page (e.g. /login) that might
// still be sitting further back in history.
const GUARD_STATE = { spGuard: true }

/**
 * Makes the back button behave like a native app instead of a browser:
 *  - From any page other than camera (home) → jump to camera, don't
 *    actually move through browser history (so it can never land back
 *    on /login or any other page that came before sign-in).
 *  - From camera (home) → ask "Do you want to exit?" instead of leaving.
 *
 * Works by keeping a "guard" entry on top of the history stack at all
 * times and re-pushing it on every popstate, so the URL/history position
 * never actually changes underneath the app — every back press is
 * handled in-app instead of by the browser.
 */
export function useBackButtonGuard() {
  const activePage = useAppStore((s) => s.activePage)
  const setPage = useAppStore((s) => s.setPage)
  const exitConfirmOpen = useAppStore((s) => s.exitConfirmOpen)
  const openExitConfirm = useAppStore((s) => s.openExitConfirm)

  // popstate fires with whatever activePage/exitConfirmOpen were at the
  // time the listener was attached unless we read from refs, since the
  // effect below only runs once on mount.
  const activePageRef = useRef(activePage)
  const exitConfirmOpenRef = useRef(exitConfirmOpen)
  useEffect(() => {
    activePageRef.current = activePage
  }, [activePage])
  useEffect(() => {
    exitConfirmOpenRef.current = exitConfirmOpen
  }, [exitConfirmOpen])

  useEffect(() => {
    if (!window.history.state?.spGuard) {
      window.history.pushState(GUARD_STATE, '')
    }

    function onPopState() {
      // Re-arm immediately so this back press never actually lands on a
      // previous (possibly pre-auth) page — it's handled in-app instead.
      window.history.pushState(GUARD_STATE, '')

      if (exitConfirmOpenRef.current) return // dialog's already up

      if (activePageRef.current !== 'camera') {
        setPage('camera')
        return
      }
      openExitConfirm()
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [setPage, openExitConfirm])
}

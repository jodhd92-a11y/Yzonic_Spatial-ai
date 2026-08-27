'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/**
 * Host-side counterpart to the chat iframe's own shortcut set (see
 * apps/chat/src/composables/useShortcuts.ts). Cmd/Ctrl+1/2/3 jump between
 * sections; Cmd/Ctrl+K starts a new chat; Cmd/Ctrl+B toggles the sidebar
 * (wired in Sidebar.tsx); "?" opens the keyboard-shortcuts guide — the same
 * key Claude/Kimi use. Only fires when focus isn't inside a text field —
 * and never while the chat iframe has focus, since key events inside an
 * iframe don't bubble to the parent document; the iframe's own listener
 * handles that case instead.
 */
export function useGlobalShortcuts() {
  const setPage = useAppStore((s) => s.setPage)
  const startNewChat = useAppStore((s) => s.startNewChat)
  const toggleShortcuts = useAppStore((s) => s.toggleShortcuts)
  const shortcutsOpen = useAppStore((s) => s.shortcutsOpen)
  const closeShortcuts = useAppStore((s) => s.closeShortcuts)
  const tourOpen = useAppStore((s) => s.tourOpen)
  const endTour = useAppStore((s) => s.endTour)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inField = !!target && ['INPUT', 'TEXTAREA'].includes(target.tagName)

      if (e.key === 'Escape') {
        if (shortcutsOpen) closeShortcuts()
        if (tourOpen) endTour()
        return
      }

      // "?" (Shift+/) opens the shortcuts guide from anywhere, mirroring
      // Claude/Kimi/Slack — deliberately not gated behind a modifier key.
      if (e.key === '?' && !inField) {
        e.preventDefault()
        toggleShortcuts()
        return
      }

      const mod = e.metaKey || e.ctrlKey
      if (!mod || inField) return

      if (e.key === '1') {
        e.preventDefault()
        setPage('camera')
      } else if (e.key === '2') {
        e.preventDefault()
        setPage('chat')
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        startNewChat()
      } else if (e.key === '/') {
        e.preventDefault()
        toggleShortcuts()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setPage, startNewChat, toggleShortcuts, shortcutsOpen, closeShortcuts, tourOpen, endTour])
}

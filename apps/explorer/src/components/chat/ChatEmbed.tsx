'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

// The chat experience is a standalone Vue 3 app (apps/chat) — see its
// README for why. It's embedded full-bleed here rather than ported to
// React so it keeps Vue's own ecosystem (Pinia, Vue Router, @vueuse/motion)
// instead of losing that on the way into this Next.js shell.
const CHAT_APP_URL = process.env.NEXT_PUBLIC_CHAT_APP_URL ?? 'http://localhost:3001'

export function ChatEmbed() {
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const user = useAppStore((s) => s.user)
  const activeChatId = useAppStore((s) => s.activeChatId)
  const setPage = useAppStore((s) => s.setPage)
  const pendingChatSeed = useAppStore((s) => s.pendingChatSeed)
  const consumeChatSeed = useAppStore((s) => s.consumeChatSeed)

  const postToChat = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: 'spatial-shell', type, ...payload },
      new URL(CHAT_APP_URL).origin,
    )
  }, [])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== new URL(CHAT_APP_URL).origin) return
      if (e.data?.source !== 'spatial-chat') return
      if (e.data.type === 'ready') {
        setLoaded(true)
        // "Chat about this" from a scan (camera page) hands off a seed
        // (label + thumbnail) here — forwarded straight into the Vue app's
        // init payload so it lands as the opening message, same call as
        // sending the user/activeChatId across.
        postToChat('init', { user, activeChatId, scanSeed: pendingChatSeed ?? undefined })
        if (pendingChatSeed) consumeChatSeed()
      }
      if (e.data.type === 'navigate' && typeof e.data.page === 'string') {
        setPage(e.data.page)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [postToChat, setPage, user, activeChatId, pendingChatSeed, consumeChatSeed])

  return (
    // AppShell suppresses its own TopBar for this page (chat renders its
    // own), so this container owns the full height below the sidebar —
    // just subtract the bottom tab bar on mobile, nothing on desktop.
    <div className="relative w-full h-[calc(100vh-var(--sp-safe-top)-var(--sp-bottomnav-h)-var(--sp-safe-bottom))] lg:h-[calc(100vh-var(--sp-safe-top))] overflow-hidden">
      <iframe
        ref={iframeRef}
        src={`${CHAT_APP_URL}/chat${activeChatId ? `/${activeChatId}` : ''}`}
        title="Chat"
        className="h-full w-full border-0"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 200ms ease-out' }}
        allow="clipboard-write; microphone"
      />
    </div>
  )
}

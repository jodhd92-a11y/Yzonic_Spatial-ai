import { onMounted, onUnmounted } from 'vue'

/**
 * Thin postMessage bridge to the parent (explorer) shell. The iframe is
 * sandboxed from the host app's React/Zustand state, so anything the host
 * needs to tell us (theme, auth token, safe-area insets) — or that we need
 * to tell it (page title, unread badge, cross-app navigation) — travels
 * through here instead.
 */
const TARGET_ORIGIN = '*' // tighten to the shell's exact origin in production

// Standalone — any component can call this to talk to the host without
// mounting its own message listener. Only ChatView needs `useBridge()`
// below (once, for the listener); everyone else just imports this.
export function postToHost(type: string, payload: Record<string, unknown> = {}) {
  window.parent?.postMessage({ source: 'spatial-chat', type, ...payload }, TARGET_ORIGIN)
}

/** Ask the host to switch to another top-level section (camera, explore, …). */
export function navigateHost(page: string) {
  postToHost('navigate', { page })
}

/** True when running inside the explorer host's iframe (vs. standalone dev). */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true // cross-origin frame access throws — that itself means "embedded"
  }
}

export function useBridge(onHostMessage?: (data: Record<string, unknown>) => void) {
  function handleMessage(e: MessageEvent) {
    if (!e.data || e.data.source !== 'spatial-shell') return
    onHostMessage?.(e.data)
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
    postToHost('ready')
  })
  onUnmounted(() => window.removeEventListener('message', handleMessage))

  return { post: postToHost }
}

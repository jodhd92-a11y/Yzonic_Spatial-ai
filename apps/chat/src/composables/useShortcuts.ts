import { onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useUiStore } from '@/stores/ui'
import { useThemeStore } from '@/stores/theme'
import { navigateHost, isEmbedded } from '@/composables/useBridge'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)
const embedded = isEmbedded()

export const SHORTCUTS = [
  { keys: [isMac ? '⌘' : 'Ctrl', 'K'], label: 'New chat' },
  { keys: [isMac ? '⌘' : 'Ctrl', 'B'], label: 'Toggle sidebar' },
  { keys: [isMac ? '⌘' : 'Ctrl', 'J'], label: 'Toggle theme' },
  { keys: [isMac ? '⌘' : 'Ctrl', ','], label: 'Open settings' },
  { keys: ['E'], label: 'Edit last message (when focused)' },
  ...(embedded
    ? [
        { keys: [isMac ? '⌘' : 'Ctrl', '1'], label: 'Go to Camera' },
        { keys: [isMac ? '⌘' : 'Ctrl', '2'], label: 'Go to Explore' },
      ]
    : []),
  { keys: ['/'], label: 'Focus message box' },
  { keys: [isMac ? '⌘' : 'Ctrl', '/'], label: 'Command palette' },
  { keys: ['Esc'], label: 'Close dialog / blur input' },
]

export function useShortcuts() {
  const chat = useChatStore()
  const ui = useUiStore()
  const theme = useThemeStore()

  function isTypingTarget(el: EventTarget | null) {
    const t = el as HTMLElement | null
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
  }

  function onKeydown(e: KeyboardEvent) {
    const mod = isMac ? e.metaKey : e.ctrlKey

    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      chat.newConversation()
      return
    }
    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      ui.toggleSidebar()
      return
    }
    if (mod && e.key.toLowerCase() === 'j') {
      e.preventDefault()
      theme.toggle()
      return
    }
    if (mod && e.key === ',') {
      e.preventDefault()
      ui.settingsOpen = !ui.settingsOpen
      return
    }
    if (embedded && mod && e.key === '1') {
      e.preventDefault()
      navigateHost('camera')
      return
    }
    if (embedded && mod && e.key === '2') {
      e.preventDefault()
      navigateHost('explore')
      return
    }
    if (mod && e.key === '/') {
      e.preventDefault()
      ui.commandPaletteOpen = !ui.commandPaletteOpen
      return
    }
    if (e.key === 'Escape') {
      if (ui.commandPaletteOpen) ui.commandPaletteOpen = false
      else if (ui.settingsOpen) ui.settingsOpen = false
      else (document.activeElement as HTMLElement | null)?.blur?.()
      return
    }
    if (e.key === '/' && !isTypingTarget(e.target)) {
      e.preventDefault()
      document.querySelector<HTMLTextAreaElement>('textarea')?.focus()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}

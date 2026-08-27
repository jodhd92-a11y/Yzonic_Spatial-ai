import { defineStore } from 'pinia'

export type ThemeMode = 'dark' | 'light'
export type AccentTheme = 'blue' | 'pink' | 'yellow' | 'golden' | 'green' | 'violet' | 'coral'

const MODE_KEY = 'sp-theme'
const ACCENT_KEY = 'sp-accent-theme'

export const ACCENTS: { id: AccentTheme; label: string; swatch: [string, string] }[] = [
  { id: 'blue', label: 'Aurora', swatch: ['#4fc3f7', '#7c4dff'] },
  { id: 'violet', label: 'Violet', swatch: ['#a78bfa', '#ec4899'] },
  { id: 'pink', label: 'Blossom', swatch: ['#ff6b9d', '#ff9bd2'] },
  { id: 'coral', label: 'Coral', swatch: ['#ff7e5f', '#feb47b'] },
  { id: 'golden', label: 'Golden', swatch: ['#ffb74d', '#d4a017'] },
  { id: 'yellow', label: 'Solar', swatch: ['#ffd93d', '#fb923c'] },
  { id: 'green', label: 'Meadow', swatch: ['#66bb6a', '#a3e635'] },
]

function readStoredMode(): ThemeMode | null {
  try {
    const v = localStorage.getItem(MODE_KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

function readStoredAccent(): AccentTheme | null {
  try {
    const v = localStorage.getItem(ACCENT_KEY) as AccentTheme | null
    return v && ACCENTS.some((a) => a.id === v) ? v : null
  } catch {
    return null
  }
}

function applyMode(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.toggle('light', mode === 'light')
  root.classList.toggle('dark', mode === 'dark')
  root.style.colorScheme = mode
}

function applyAccent(accent: AccentTheme) {
  const root = document.documentElement
  if (accent === 'blue') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', accent)
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: (readStoredMode() ?? 'dark') as ThemeMode,
    accent: (readStoredAccent() ?? 'blue') as AccentTheme,
  }),
  actions: {
    init() {
      applyMode(this.mode)
      applyAccent(this.accent)
    },
    setMode(mode: ThemeMode) {
      this.mode = mode
      applyMode(mode)
      try {
        localStorage.setItem(MODE_KEY, mode)
      } catch {
        /* private-browsing / disabled storage — theme just won't persist */
      }
    },
    setAccent(accent: AccentTheme) {
      this.accent = accent
      applyAccent(accent)
      try {
        localStorage.setItem(ACCENT_KEY, accent)
      } catch {
        /* ignore */
      }
    },
    toggle() {
      this.setMode(this.mode === 'dark' ? 'light' : 'dark')
    },
  },
})

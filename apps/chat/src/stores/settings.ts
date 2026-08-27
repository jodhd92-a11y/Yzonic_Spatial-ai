import { defineStore } from 'pinia'
import { i18n, SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n'

export type FontSize = 'sm' | 'md' | 'lg'
export type Density = 'compact' | 'comfortable' | 'spacious'
export type BubbleStyle = 'bubble' | 'flat'
export type ChatWidth = 'narrow' | 'default' | 'wide'
export type SendKey = 'enter' | 'mod-enter'
export type CodeTheme = 'auto' | 'high-contrast' | 'soft'
// The 5 languages with the largest number of speakers worldwide.
export type Language = SupportedLocale

interface SettingsState {
  fontSize: FontSize
  density: Density
  bubbleStyle: BubbleStyle
  chatWidth: ChatWidth
  sendKey: SendKey
  codeTheme: CodeTheme
  language: Language
  showTimestamps: boolean
  soundEffects: boolean
  autoScroll: boolean
  reduceMotion: boolean
  customInstructions: string
  onboardingSeen: boolean
}

const STORAGE_KEY = 'sp-settings'

const defaults: SettingsState = {
  fontSize: 'md',
  density: 'comfortable',
  bubbleStyle: 'bubble',
  chatWidth: 'default',
  sendKey: 'enter',
  codeTheme: 'auto',
  language: 'en',
  showTimestamps: true,
  soundEffects: false,
  autoScroll: true,
  reduceMotion: false,
  customInstructions: '',
  onboardingSeen: false,
}

function readStored(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    // Older builds supported a wider set of languages (de, ja, pt…). Fall
    // back to English for any value outside today's 5 supported locales
    // instead of leaving the UI pointed at a language with no messages.
    if (parsed.language && !SUPPORTED_LOCALES.includes(parsed.language)) {
      delete parsed.language
    }
    return parsed
  } catch {
    return {}
  }
}

function persist(state: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function applyToDom(state: SettingsState) {
  const root = document.documentElement
  root.setAttribute('data-font-size', state.fontSize)
  root.setAttribute('data-density', state.density)
  root.setAttribute('data-bubble', state.bubbleStyle)
  root.setAttribute('data-chat-width', state.chatWidth)
  root.setAttribute('data-code-theme', state.codeTheme)
  root.classList.toggle('sp-reduce-motion', state.reduceMotion)
  root.setAttribute('lang', state.language)
  // This is the actual fix: previously nothing ever told vue-i18n about
  // the selected language, so `settings.language` changed in the store
  // but every <template> kept rendering its fallback (English) text.
  i18n.global.locale.value = state.language
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({ ...defaults, ...readStored() }),
  actions: {
    init() {
      applyToDom(this.$state)
    },
    update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
      this.$state[key] = value
      applyToDom(this.$state)
      persist(this.$state)
    },
    resetAll() {
      Object.assign(this.$state, defaults)
      applyToDom(this.$state)
      persist(this.$state)
    },
    markOnboardingSeen() {
      this.update('onboardingSeen', true)
    },
  },
})

import { createI18n } from 'vue-i18n'
import type { MessageSchema } from './messageSchema'
import en from './locales/en'
import zh from './locales/zh'
import hi from './locales/hi'
import es from './locales/es'
import fr from './locales/fr'

// The 5 languages with the largest number of speakers worldwide
// (English, Mandarin Chinese, Hindi, Spanish, French). Keep this in sync
// with the `Language` union in `stores/settings.ts` and the picker in
// `ProfileMenu.vue`.
export const SUPPORTED_LOCALES = ['en', 'zh', 'hi', 'es', 'fr'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const i18n = createI18n<[MessageSchema], SupportedLocale, false>({
  legacy: false, // required for Composition API `useI18n()` / `t()` outside <template>
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, zh, hi, es, fr },
})

export default i18n

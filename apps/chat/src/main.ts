import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { useThemeStore } from './stores/theme'
import { useSettingsStore } from './stores/settings'
import { useChatStore } from './stores/chat'
import { vTooltip } from './lib/tooltipDirective'
import './styles/globals.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router).use(MotionPlugin).use(i18n)
app.directive('tooltip', vTooltip)

// Apply the saved/system theme and customization settings before the
// first paint so there's no flash of the wrong palette or layout.
useThemeStore(pinia).init()
useSettingsStore(pinia).init()
useChatStore(pinia).init()

app.mount('#app')

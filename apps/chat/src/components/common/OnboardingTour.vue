<script setup lang="ts">
// A minimal first-run guide: a few dismissible spotlight callouts pointing
// at the features that aren't self-explanatory (theme switcher, settings,
// capability pills, sidebar collapse). Shown once, ever, per browser.
import { ref, onMounted } from 'vue'
import { ArrowRight, Sparkles } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

const settings = useSettingsStore()
const ui = useUiStore()
const visible = ref(false)
const step = ref(0)

const steps = [
  {
    title: 'Make it yours',
    body: 'Pick an accent theme, text size, density, and more from the palette icon in the top bar — or open full Settings any time.',
  },
  {
    title: 'Steer each message',
    body: 'Toggle Web Search, Deep Research, or Docs above the composer before you send to change how a message is handled.',
  },
  {
    title: 'Edit, regenerate, revisit',
    body: 'Hover any message to edit-and-resend, regenerate a reply, or copy it. Pin chats from the sidebar to keep them close.',
  },
]

onMounted(() => {
  if (!settings.onboardingSeen) {
    setTimeout(() => (visible.value = true), 700)
  }
})

function next() {
  if (step.value < steps.length - 1) step.value++
  else finish()
}

function finish() {
  visible.value = false
  settings.markOnboardingSeen()
}

function openSettings() {
  finish()
  ui.settingsOpen = true
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 translate-y-3"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="visible"
      class="fixed bottom-5 right-5 left-5 z-[190] w-auto max-w-[300px] sm:left-auto overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/95 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div class="flex items-center gap-2 border-b border-[var(--sp-border)] px-4 py-2.5">
        <Sparkles :size="13" class="text-[var(--sp-primary)]" />
        <span class="text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Quick tour · {{ step + 1 }}/{{ steps.length }}</span>
        <button @click="finish" class="ml-auto text-[11px] text-[var(--sp-text-faint)] hover:text-[var(--sp-text)]">Skip</button>
      </div>
      <div class="px-4 py-3.5">
        <p class="text-[13.5px] font-semibold text-[var(--sp-text)]">{{ steps[step].title }}</p>
        <p class="mt-1 text-[12.5px] leading-relaxed text-[var(--sp-text-dim)]">{{ steps[step].body }}</p>
      </div>
      <div class="flex items-center justify-between border-t border-[var(--sp-border)] px-4 py-2.5">
        <button @click="openSettings" class="text-[11.5px] text-[var(--sp-text-faint)] hover:text-[var(--sp-text)]">Open Settings</button>
        <button
          @click="next"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-black"
          style="background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent))"
        >
          {{ step < steps.length - 1 ? 'Next' : 'Got it' }}
          <ArrowRight :size="12" />
        </button>
      </div>
    </div>
  </Transition>
</template>

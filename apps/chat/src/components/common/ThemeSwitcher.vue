<script setup lang="ts">
// Puts the theme front and center: mode toggle plus every accent swatch
// from the marketing site's palette, live-previewed via data-theme.
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Palette, Sun, Moon, Check } from 'lucide-vue-next'
import { useThemeStore, ACCENTS } from '@/stores/theme'

const theme = useThemeStore()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false))
</script>

<template>
  <div ref="root" class="relative">
    <button
      @click="open = !open"
      aria-label="Theme"
      v-tooltip="'Theme'"
      class="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--sp-text-dim)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
    >
      <Palette :size="17" />
      <span
        class="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full ring-2 ring-[var(--sp-bg-1)]"
        style="background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent))"
      />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      >
        <p class="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Appearance</p>

        <div class="mb-2.5 flex rounded-xl border border-[var(--sp-border)] bg-white/[0.02] p-1">
          <button
            @click="theme.setMode('dark')"
            :class="[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium transition-colors',
              theme.mode === 'dark' ? 'bg-white/[0.08] text-[var(--sp-text)]' : 'text-[var(--sp-text-faint)] hover:text-[var(--sp-text-dim)]',
            ]"
          >
            <Moon :size="13" /> Dark
          </button>
          <button
            @click="theme.setMode('light')"
            :class="[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium transition-colors',
              theme.mode === 'light' ? 'bg-white/[0.08] text-[var(--sp-text)]' : 'text-[var(--sp-text-faint)] hover:text-[var(--sp-text-dim)]',
            ]"
          >
            <Sun :size="13" /> Light
          </button>
        </div>

        <p class="px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Accent</p>
        <div class="grid grid-cols-4 gap-2 px-0.5 pb-0.5">
          <button
            v-for="a in ACCENTS"
            :key="a.id"
            @click="theme.setAccent(a.id)"
            v-tooltip="a.label"
            class="group flex flex-col items-center gap-1.5 rounded-xl py-1.5 transition-colors hover:bg-white/[0.05]"
          >
            <span
              class="relative flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset ring-white/10 transition-transform group-hover:scale-105"
              :style="{ background: `linear-gradient(135deg, ${a.swatch[0]}, ${a.swatch[1]})` }"
            >
              <Check v-if="theme.accent === a.id" :size="13" class="text-black/70" stroke-width="3" />
            </span>
            <span class="text-[9.5px] leading-none text-[var(--sp-text-faint)]">{{ a.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

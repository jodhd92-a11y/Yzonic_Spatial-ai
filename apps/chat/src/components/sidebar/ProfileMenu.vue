<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronsUpDown, Settings, Globe, ChevronLeft, ChevronRight, Check, X } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore, type Language } from '@/stores/settings'

const props = defineProps<{ collapsed: boolean }>()

const { t } = useI18n()
const userStore = useUserStore()
const ui = useUiStore()
const settings = useSettingsStore()

const MENU_WIDTH = 240
const open = ref(false)
const view = ref<'main' | 'language'>('main')
const anchor = ref({ bottom: 0, left: 0 })
const panelWidth = ref(MENU_WIDTH)
const btnRef = ref<HTMLButtonElement | null>(null)

// The 5 languages with the largest number of speakers worldwide, each
// shown in its own name. Every id here must exist in src/i18n/locales.
const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
]
const currentLanguageLabel = computed(() => LANGUAGES.find((l) => l.id === settings.language)?.label ?? 'English')

function handleToggle() {
  const margin = 8
  const rect = btnRef.value?.getBoundingClientRect()
  if (!rect) return

  if (props.collapsed) {
    // Flyout tight against the icon — same side the tooltip uses — instead
    // of trailing the cursor off toward the middle of the screen.
    panelWidth.value = MENU_WIDTH
    const left = Math.min(rect.right + 8, window.innerWidth - MENU_WIDTH - margin)
    const bottom = Math.max(window.innerHeight - rect.bottom, margin)
    anchor.value = { bottom, left }
  } else {
    // Expanded rail (desktop) and the mobile drawer both size the menu to
    // match the button's own width so it reads as part of the sidebar
    // instead of spilling past its edge.
    panelWidth.value = rect.width
    const bottom = Math.max(window.innerHeight - rect.bottom, margin)
    anchor.value = { bottom, left: rect.left }
  }

  view.value = 'main'
  open.value = !open.value
}

function closeMenu() {
  open.value = false
}

function openSettings() {
  closeMenu()
  ui.settingsOpen = true
}

function selectLanguage(id: Language) {
  settings.update('language', id)
  view.value = 'main'
}
</script>

<template>
  <div class="relative shrink-0 border-t border-white/[0.06] px-2 pb-2 pt-1">
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" @click="closeMenu" />
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-[0.98]"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 translate-y-1 scale-[0.98]"
      >
        <div
          v-if="open"
          :style="{ bottom: `${anchor.bottom}px`, left: `${anchor.left}px`, width: `${panelWidth}px` }"
          class="fixed z-50 overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <template v-if="view === 'main'">
            <div class="relative px-3 py-2.5 pr-9">
              <button
                @click="closeMenu"
                v-tooltip="'Close'"
                class="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[var(--sp-text-faint)] transition-colors hover:bg-white/[0.08] hover:text-[var(--sp-text)]"
                aria-label="Close"
              >
                <X :size="14" />
              </button>
              <div class="truncate text-[13px] font-medium text-[var(--sp-text)]">{{ userStore.user?.name ?? t('profileMenu.guest') }}</div>
              <div class="truncate text-[11.5px] text-[var(--sp-text-faint)]">{{ userStore.user?.email ?? t('profileMenu.notSignedIn') }}</div>
            </div>
            <div class="mb-1 h-px bg-[var(--sp-border)]" />

            <button
              @click="openSettings"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
            >
              <Settings :size="15" /> {{ t('profileMenu.settings') }}
            </button>

            <button
              @click="view = 'language'"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
            >
              <Globe :size="15" />
              <span class="flex-1">{{ t('profileMenu.language') }}</span>
              <span class="text-[11px] text-[var(--sp-text-faint)]">{{ currentLanguageLabel }}</span>
              <ChevronRight :size="13" class="text-[var(--sp-text-faint)]" />
            </button>
          </template>

          <template v-else>
            <button
              @click="view = 'main'"
              class="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--sp-text)] transition-colors hover:bg-white/[0.06]"
            >
              <ChevronLeft :size="15" /> {{ t('profileMenu.language') }}
            </button>
            <div class="max-h-64 overflow-y-auto">
              <button
                v-for="lang in LANGUAGES"
                :key="lang.id"
                @click="selectLanguage(lang.id)"
                class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
              >
                <span class="flex-1">{{ lang.label }}</span>
                <Check v-if="lang.id === settings.language" :size="14" class="text-[var(--sp-primary)]" />
              </button>
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>

    <button
      ref="btnRef"
      @click="handleToggle"
      v-tooltip="props.collapsed ? { text: userStore.user?.name ?? 'Account', placement: 'right' } : ''"
      class="flex w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl py-2 pl-3 pr-3 transition-colors hover:bg-white/[0.05]"
    >
      <div class="relative shrink-0">
        <div
          class="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-black"
          style="background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent))"
        >
          {{ userStore.initial }}
        </div>
        <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--sp-bg-1)] bg-emerald-400" />
      </div>

      <span v-if="!props.collapsed" class="flex min-w-0 flex-1 flex-col items-start leading-tight">
        <span class="w-full truncate text-left text-[13px] font-medium text-[var(--sp-text)]">
          {{ userStore.user?.name ?? t('profileMenu.guest') }}
        </span>
        <span class="w-full truncate text-left text-[11px] text-[var(--sp-text-faint)]">
          {{ userStore.user?.email ?? t('profileMenu.notSignedIn') }}
        </span>
      </span>
      <ChevronsUpDown v-if="!props.collapsed" :size="14" class="shrink-0 text-[var(--sp-text-faint)]" />
    </button>
  </div>
</template>

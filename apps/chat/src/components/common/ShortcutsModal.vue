<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { X, Search, SquarePen, PanelLeft, SunMoon, Settings as SettingsIcon, MessageSquare } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import { SHORTCUTS } from '@/composables/useShortcuts'

const ui = useUiStore()
const chat = useChatStore()
const theme = useThemeStore()

const query = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

// Reset + refocus the search field every time the palette opens, so it's
// never left showing a stale query from the last time it was used.
watch(
  () => ui.commandPaletteOpen,
  async (open) => {
    if (!open) return
    query.value = ''
    await nextTick()
    inputEl.value?.focus()
  },
)

interface QuickAction { id: string; label: string; icon: typeof SquarePen; run: () => void }
const actions = computed<QuickAction[]>(() => [
  { id: 'new', label: 'New chat', icon: SquarePen, run: () => chat.newConversation() },
  { id: 'sidebar', label: 'Toggle sidebar', icon: PanelLeft, run: () => ui.toggleSidebar() },
  { id: 'theme', label: 'Toggle theme', icon: SunMoon, run: () => theme.toggle() },
  { id: 'settings', label: 'Open settings', icon: SettingsIcon, run: () => { ui.settingsOpen = true } },
])

const filteredActions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return actions.value
  return actions.value.filter((a) => a.label.toLowerCase().includes(q))
})

// Recent chats when the field is empty, filtered by title once you type —
// the same "search or jump" pattern ChatGPT/Claude's own Cmd+K palettes use.
const filteredChats = computed(() => {
  const q = query.value.trim().toLowerCase()
  const pool = chat.sortedConversations
  return (q ? pool.filter((c) => c.title.toLowerCase().includes(q)) : pool.slice(0, 6)).slice(0, 8)
})

const hasResults = computed(() => filteredActions.value.length > 0 || filteredChats.value.length > 0)

function close() {
  ui.commandPaletteOpen = false
}
function runAction(a: QuickAction) {
  a.run()
  close()
}
function openChat(id: string) {
  chat.selectConversation(id)
  close()
}
function onEnter() {
  if (filteredActions.value.length) runAction(filteredActions.value[0])
  else if (filteredChats.value.length) openChat(filteredChats.value[0].id)
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="ui.commandPaletteOpen"
      class="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 px-4 pt-[14vh] backdrop-blur-sm"
      @click.self="close"
    >
      <div
        v-motion
        :initial="{ opacity: 0, y: 12, scale: 0.97 }"
        :enter="{ opacity: 1, y: 0, scale: 1, transition: { duration: 180, ease: 'easeOut' } }"
        class="flex max-h-[70vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-1)] shadow-2xl"
      >
        <!-- Search — doubles as a quick switcher (chats) and a command
             runner (actions), the same combined role Cmd+K plays in most
             modern AI chat apps. -->
        <div class="flex items-center gap-2.5 border-b border-[var(--sp-border)] px-4 py-3">
          <Search :size="15" class="shrink-0 text-[var(--sp-text-faint)]" />
          <input
            ref="inputEl"
            v-model="query"
            placeholder="Search chats or run a command…"
            class="w-full bg-transparent text-[13.5px] text-[var(--sp-text)] placeholder:text-[var(--sp-text-faint)] focus:outline-none"
            @keydown.enter="onEnter"
            @keydown.esc="close"
          />
          <button
            class="shrink-0 rounded-lg p-1 text-[var(--sp-text-faint)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
            @click="close"
            aria-label="Close"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <div v-if="filteredActions.length" class="mb-1">
            <p class="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Actions</p>
            <button
              v-for="a in filteredActions"
              :key="a.id"
              @click="runAction(a)"
              class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <component :is="a.icon" :size="14" class="text-[var(--sp-text-dim)]" />
              </span>
              <span class="text-[13px] font-medium text-[var(--sp-text)]">{{ a.label }}</span>
            </button>
          </div>

          <div v-if="filteredChats.length" class="mb-1">
            <p class="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">
              {{ query.trim() ? 'Chats' : 'Recent' }}
            </p>
            <button
              v-for="c in filteredChats"
              :key="c.id"
              @click="openChat(c.id)"
              :class="[
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]',
                chat.activeId === c.id && 'bg-white/[0.04]',
              ]"
            >
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <MessageSquare :size="13" class="text-[var(--sp-text-dim)]" />
              </span>
              <span class="min-w-0 flex-1 truncate text-[13px] text-[var(--sp-text)]">{{ c.title }}</span>
            </button>
          </div>

          <p v-if="!hasResults" class="px-3 py-6 text-center text-[12px] text-[var(--sp-text-faint)]">No matches for "{{ query }}"</p>

          <!-- Full shortcut reference stays reachable underneath, so
               nothing that lived here before is lost. -->
          <div class="mt-1 border-t border-[var(--sp-border)] pt-1">
            <p class="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Keyboard shortcuts</p>
            <div
              v-for="s in SHORTCUTS"
              :key="s.label"
              class="flex items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-[12.5px] text-[var(--sp-text-dim)]"
            >
              <span>{{ s.label }}</span>
              <span class="flex shrink-0 items-center gap-1">
                <kbd
                  v-for="k in s.keys"
                  :key="k"
                  class="rounded-md border border-[var(--sp-border)] bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--sp-text)]"
                >
                  {{ k }}
                </kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// The "advanced customizable features" home base: appearance, behavior,
// custom instructions, data controls, and a shortcuts/guide tab — the
// same shape every major chat product converges on, consolidated here
// instead of scattered one-off toggles.
import { ref, computed } from 'vue'
import {
  X, Palette, SlidersHorizontal, MessageSquareText, Database,
  Keyboard, Sun, Moon, Check, Download, Trash2, RotateCcw, Volume2, VolumeX,
} from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useThemeStore, ACCENTS } from '@/stores/theme'
import { useSettingsStore, type FontSize, type Density, type ChatWidth, type BubbleStyle } from '@/stores/settings'
import { useChatStore } from '@/stores/chat'
import { SHORTCUTS } from '@/composables/useShortcuts'

const ui = useUiStore()
const theme = useThemeStore()
const settings = useSettingsStore()
const chat = useChatStore()

type Tab = 'appearance' | 'behavior' | 'instructions' | 'data' | 'guide'
const tab = ref<Tab>('appearance')
const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'behavior', label: 'Behavior', icon: SlidersHorizontal },
  { id: 'instructions', label: 'Custom Instructions', icon: MessageSquareText },
  { id: 'data', label: 'Data Controls', icon: Database },
  { id: 'guide', label: 'Shortcuts & Guide', icon: Keyboard },
]

const fontSizes: { id: FontSize; label: string }[] = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Default' },
  { id: 'lg', label: 'Large' },
]
const densities: { id: Density; label: string; hint: string }[] = [
  { id: 'compact', label: 'Compact', hint: 'Tighter spacing, more on screen' },
  { id: 'comfortable', label: 'Comfortable', hint: 'Balanced default' },
  { id: 'spacious', label: 'Spacious', hint: 'Extra breathing room' },
]
const widths: { id: ChatWidth; label: string }[] = [
  { id: 'narrow', label: 'Narrow' },
  { id: 'default', label: 'Default' },
  { id: 'wide', label: 'Wide' },
]
const bubbleStyles: { id: BubbleStyle; label: string }[] = [
  { id: 'bubble', label: 'Rounded bubbles' },
  { id: 'flat', label: 'Flat / minimal' },
]

const exported = ref(false)
function exportChats() {
  const data = JSON.stringify(chat.conversations, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spatial-ai-chats-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  exported.value = true
  setTimeout(() => (exported.value = false), 1500)
}

const confirmingClear = ref(false)
function clearAll() {
  if (!confirmingClear.value) {
    confirmingClear.value = true
    setTimeout(() => (confirmingClear.value = false), 3000)
    return
  }
  chat.conversations = []
  chat.activeId = null
  confirmingClear.value = false
}

const storageEstimate = computed(() => {
  try {
    return `${(JSON.stringify(chat.conversations).length / 1024).toFixed(1)} KB`
  } catch {
    return '—'
  }
})
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
      v-if="ui.settingsOpen"
      class="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4"
      @click.self="ui.settingsOpen = false"
    >
      <div
        v-motion
        :initial="{ opacity: 0, y: 14, scale: 0.97 }"
        :enter="{ opacity: 1, y: 0, scale: 1, transition: { duration: 180, ease: 'easeOut' } }"
        class="flex h-[min(640px,88vh)] w-full max-w-[760px] overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-1)] shadow-2xl"
      >
        <!-- Tab rail -->
        <div class="hidden w-[200px] shrink-0 flex-col border-r border-[var(--sp-border)] bg-white/[0.015] p-2 sm:flex">
          <p class="px-2.5 pb-2 pt-1.5 text-[12px] font-semibold text-[var(--sp-text)]">Settings</p>
          <button
            v-for="t in tabs"
            :key="t.id"
            @click="tab = t.id"
            :class="[
              'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors',
              tab === t.id ? 'bg-[var(--sp-primary)]/[0.12] text-[var(--sp-text)]' : 'text-[var(--sp-text-dim)] hover:bg-white/[0.05] hover:text-[var(--sp-text)]',
            ]"
          >
            <component :is="t.icon" :size="14" :class="tab === t.id ? 'text-[var(--sp-primary)]' : ''" />
            {{ t.label }}
          </button>
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <div class="flex items-center justify-between border-b border-[var(--sp-border)] px-5 py-3">
            <h2 class="text-[13.5px] font-semibold text-[var(--sp-text)] sm:hidden">{{ tabs.find(t => t.id === tab)?.label }}</h2>
            <h2 class="hidden text-[13.5px] font-semibold text-[var(--sp-text)] sm:block">{{ tabs.find(t => t.id === tab)?.label }}</h2>
            <button class="rounded-lg p-1 text-[var(--sp-text-faint)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]" @click="ui.settingsOpen = false" aria-label="Close">
              <X :size="16" />
            </button>
          </div>

          <!-- Mobile tab strip: the rail above is hidden below sm, so this is
               the only way to switch tabs on a phone. -->
          <div class="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--sp-border)] px-3 py-2 sm:hidden">
            <button
              v-for="t in tabs"
              :key="t.id"
              @click="tab = t.id"
              :class="[
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                tab === t.id ? 'bg-[var(--sp-primary)]/[0.14] text-[var(--sp-primary)]' : 'text-[var(--sp-text-dim)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
              ]"
            >
              <component :is="t.icon" :size="13" />
              {{ t.label }}
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <!-- Appearance -->
            <div v-if="tab === 'appearance'" class="space-y-6">
              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Mode</p>
                <div class="flex rounded-xl border border-[var(--sp-border)] bg-white/[0.02] p-1">
                  <button
                    @click="theme.setMode('dark')"
                    :class="['flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-medium transition-colors', theme.mode === 'dark' ? 'bg-white/[0.08] text-[var(--sp-text)]' : 'text-[var(--sp-text-faint)]']"
                  ><Moon :size="13" /> Dark</button>
                  <button
                    @click="theme.setMode('light')"
                    :class="['flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-medium transition-colors', theme.mode === 'light' ? 'bg-white/[0.08] text-[var(--sp-text)]' : 'text-[var(--sp-text-faint)]']"
                  ><Sun :size="13" /> Light</button>
                </div>
              </section>

              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Accent</p>
                <div class="grid grid-cols-7 gap-2">
                  <button v-for="a in ACCENTS" :key="a.id" @click="theme.setAccent(a.id)" v-tooltip="a.label" class="flex flex-col items-center gap-1.5">
                    <span
                      class="relative flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset ring-white/10 transition-transform hover:scale-105"
                      :style="{ background: `linear-gradient(135deg, ${a.swatch[0]}, ${a.swatch[1]})` }"
                    >
                      <Check v-if="theme.accent === a.id" :size="13" class="text-black/70" stroke-width="3" />
                    </span>
                  </button>
                </div>
              </section>

              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Text size</p>
                <div class="flex gap-2">
                  <button
                    v-for="f in fontSizes" :key="f.id" @click="settings.update('fontSize', f.id)"
                    :class="['flex-1 rounded-lg border py-2 text-[12.5px] font-medium transition-colors', settings.fontSize === f.id ? 'border-[var(--sp-primary)]/50 bg-[var(--sp-primary)]/[0.1] text-[var(--sp-text)]' : 'border-[var(--sp-border)] text-[var(--sp-text-dim)] hover:border-[var(--sp-border-hover)]']"
                  >{{ f.label }}</button>
                </div>
              </section>

              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Message density</p>
                <div class="space-y-1.5">
                  <button
                    v-for="d in densities" :key="d.id" @click="settings.update('density', d.id)"
                    :class="['flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors', settings.density === d.id ? 'border-[var(--sp-primary)]/50 bg-[var(--sp-primary)]/[0.08]' : 'border-[var(--sp-border)] hover:border-[var(--sp-border-hover)]']"
                  >
                    <span>
                      <span class="block text-[12.5px] font-medium text-[var(--sp-text)]">{{ d.label }}</span>
                      <span class="block text-[11px] text-[var(--sp-text-faint)]">{{ d.hint }}</span>
                    </span>
                    <Check v-if="settings.density === d.id" :size="14" class="text-[var(--sp-primary)]" />
                  </button>
                </div>
              </section>

              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Bubble style</p>
                <div class="flex gap-2">
                  <button
                    v-for="b in bubbleStyles" :key="b.id" @click="settings.update('bubbleStyle', b.id)"
                    :class="['flex-1 rounded-lg border py-2 text-[12.5px] font-medium transition-colors', settings.bubbleStyle === b.id ? 'border-[var(--sp-primary)]/50 bg-[var(--sp-primary)]/[0.1] text-[var(--sp-text)]' : 'border-[var(--sp-border)] text-[var(--sp-text-dim)] hover:border-[var(--sp-border-hover)]']"
                  >{{ b.label }}</button>
                </div>
              </section>

              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Chat width</p>
                <div class="flex gap-2">
                  <button
                    v-for="w in widths" :key="w.id" @click="settings.update('chatWidth', w.id)"
                    :class="['flex-1 rounded-lg border py-2 text-[12.5px] font-medium transition-colors', settings.chatWidth === w.id ? 'border-[var(--sp-primary)]/50 bg-[var(--sp-primary)]/[0.1] text-[var(--sp-text)]' : 'border-[var(--sp-border)] text-[var(--sp-text-dim)] hover:border-[var(--sp-border-hover)]']"
                  >{{ w.label }}</button>
                </div>
              </section>
            </div>

            <!-- Behavior -->
            <div v-else-if="tab === 'behavior'" class="space-y-1">
              <button
                @click="settings.update('sendKey', settings.sendKey === 'enter' ? 'mod-enter' : 'enter')"
                class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-white/[0.03]"
              >
                <span>
                  <span class="block text-[13px] font-medium text-[var(--sp-text)]">Send message with</span>
                  <span class="block text-[11.5px] text-[var(--sp-text-faint)]">Choose the key that submits the composer</span>
                </span>
                <span class="rounded-full border border-[var(--sp-border)] px-2.5 py-1 text-[11.5px] text-[var(--sp-text-dim)]">
                  {{ settings.sendKey === 'enter' ? 'Enter' : 'Ctrl / ⌘ + Enter' }}
                </span>
              </button>

              <button @click="settings.update('showTimestamps', !settings.showTimestamps)" class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-white/[0.03]">
                <span>
                  <span class="block text-[13px] font-medium text-[var(--sp-text)]">Show timestamps</span>
                  <span class="block text-[11.5px] text-[var(--sp-text-faint)]">On hover, next to message actions</span>
                </span>
                <span :class="['flex h-5 w-9 items-center rounded-full px-0.5 transition-colors', settings.showTimestamps ? 'justify-end bg-[var(--sp-primary)]' : 'justify-start bg-white/[0.1]']">
                  <span class="h-4 w-4 rounded-full bg-white shadow" />
                </span>
              </button>

              <button @click="settings.update('autoScroll', !settings.autoScroll)" class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-white/[0.03]">
                <span>
                  <span class="block text-[13px] font-medium text-[var(--sp-text)]">Auto-scroll while streaming</span>
                  <span class="block text-[11.5px] text-[var(--sp-text-faint)]">Follows new tokens until you scroll up</span>
                </span>
                <span :class="['flex h-5 w-9 items-center rounded-full px-0.5 transition-colors', settings.autoScroll ? 'justify-end bg-[var(--sp-primary)]' : 'justify-start bg-white/[0.1]']">
                  <span class="h-4 w-4 rounded-full bg-white shadow" />
                </span>
              </button>

              <button @click="settings.update('soundEffects', !settings.soundEffects)" class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-white/[0.03]">
                <span class="flex items-center gap-2.5">
                  <Volume2 v-if="settings.soundEffects" :size="15" class="text-[var(--sp-text-dim)]" />
                  <VolumeX v-else :size="15" class="text-[var(--sp-text-faint)]" />
                  <span>
                    <span class="block text-[13px] font-medium text-[var(--sp-text)]">Sound effects</span>
                    <span class="block text-[11.5px] text-[var(--sp-text-faint)]">Soft cue on send &amp; reply</span>
                  </span>
                </span>
                <span :class="['flex h-5 w-9 items-center rounded-full px-0.5 transition-colors', settings.soundEffects ? 'justify-end bg-[var(--sp-primary)]' : 'justify-start bg-white/[0.1]']">
                  <span class="h-4 w-4 rounded-full bg-white shadow" />
                </span>
              </button>

              <button @click="settings.update('reduceMotion', !settings.reduceMotion)" class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-white/[0.03]">
                <span>
                  <span class="block text-[13px] font-medium text-[var(--sp-text)]">Reduce motion</span>
                  <span class="block text-[11.5px] text-[var(--sp-text-faint)]">Minimize animation throughout the app</span>
                </span>
                <span :class="['flex h-5 w-9 items-center rounded-full px-0.5 transition-colors', settings.reduceMotion ? 'justify-end bg-[var(--sp-primary)]' : 'justify-start bg-white/[0.1]']">
                  <span class="h-4 w-4 rounded-full bg-white shadow" />
                </span>
              </button>
            </div>

            <!-- Custom instructions -->
            <div v-else-if="tab === 'instructions'" class="space-y-3">
              <p class="text-[12.5px] text-[var(--sp-text-dim)]">
                Tell the assistant how you'd like it to respond. This applies to every new conversation.
              </p>
              <textarea
                v-model="settings.customInstructions"
                @blur="settings.update('customInstructions', settings.customInstructions)"
                rows="8"
                placeholder="e.g. Keep answers concise. Prefer code examples in TypeScript. Address me by name."
                class="w-full resize-none rounded-xl border border-[var(--sp-border)] bg-white/[0.02] p-3 text-[13px] leading-relaxed text-[var(--sp-text)] placeholder:text-[var(--sp-text-faint)] focus:border-[var(--sp-primary)]/50 focus:outline-none"
              />
              <p class="text-[11px] text-[var(--sp-text-faint)]">{{ settings.customInstructions.length }} / 1500 characters</p>
            </div>

            <!-- Data controls -->
            <div v-else-if="tab === 'data'" class="space-y-4">
              <div class="rounded-xl border border-[var(--sp-border)] p-4">
                <p class="text-[13px] font-medium text-[var(--sp-text)]">Local storage used</p>
                <p class="mt-0.5 text-[12px] text-[var(--sp-text-faint)]">{{ storageEstimate }} across {{ chat.conversations.length }} conversation(s) — stored only in this browser.</p>
              </div>

              <button @click="exportChats" class="flex w-full items-center justify-between rounded-lg border border-[var(--sp-border)] px-3.5 py-3 text-left transition-colors hover:border-[var(--sp-border-hover)] hover:bg-white/[0.03]">
                <span>
                  <span class="block text-[13px] font-medium text-[var(--sp-text)]">Export all chats</span>
                  <span class="block text-[11.5px] text-[var(--sp-text-faint)]">Download everything as JSON</span>
                </span>
                <span class="flex items-center gap-1.5 text-[12px] text-[var(--sp-primary)]">
                  <Check v-if="exported" :size="14" /> <Download v-else :size="14" />
                </span>
              </button>

              <button @click="clearAll" class="flex w-full items-center justify-between rounded-lg border px-3.5 py-3 text-left transition-colors" :class="confirmingClear ? 'border-red-400/50 bg-red-400/[0.08]' : 'border-[var(--sp-border)] hover:border-red-400/40 hover:bg-red-400/[0.05]'">
                <span>
                  <span class="block text-[13px] font-medium" :class="confirmingClear ? 'text-red-400' : 'text-[var(--sp-text)]'">
                    {{ confirmingClear ? 'Click again to confirm' : 'Clear all conversations' }}
                  </span>
                  <span class="block text-[11.5px] text-[var(--sp-text-faint)]">This can't be undone</span>
                </span>
                <Trash2 :size="14" :class="confirmingClear ? 'text-red-400' : 'text-[var(--sp-text-faint)]'" />
              </button>

              <button @click="settings.resetAll" class="flex w-full items-center justify-between rounded-lg border border-[var(--sp-border)] px-3.5 py-3 text-left transition-colors hover:border-[var(--sp-border-hover)] hover:bg-white/[0.03]">
                <span class="text-[13px] font-medium text-[var(--sp-text)]">Reset settings to default</span>
                <RotateCcw :size="14" class="text-[var(--sp-text-faint)]" />
              </button>
            </div>

            <!-- Guide -->
            <div v-else-if="tab === 'guide'" class="space-y-5">
              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Keyboard shortcuts</p>
                <ul class="divide-y divide-[var(--sp-border)] overflow-hidden rounded-xl border border-[var(--sp-border)]">
                  <li v-for="s in SHORTCUTS" :key="s.label" class="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] text-[var(--sp-text-dim)]">
                    <span>{{ s.label }}</span>
                    <span class="flex items-center gap-1">
                      <kbd v-for="k in s.keys" :key="k" class="rounded-md border border-[var(--sp-border)] bg-white/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-[var(--sp-text)]">{{ k }}</kbd>
                    </span>
                  </li>
                </ul>
              </section>
              <section>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Tips</p>
                <ul class="space-y-2 text-[12.5px] leading-relaxed text-[var(--sp-text-dim)]">
                  <li>• Hover any message to copy it, edit &amp; resend your own messages, or regenerate a reply.</li>
                  <li>• Toggle Web Search / Deep Research / Docs pills above the composer to steer how a message is handled.</li>
                  <li>• Pin important chats from the sidebar's hover actions to keep them at the top.</li>
                  <li>• Collapse the sidebar to an icon rail from the top bar when you want more room to read.</li>
                  <li>• Everything in this panel — theme, density, text size, chat width — is saved to this browser automatically.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

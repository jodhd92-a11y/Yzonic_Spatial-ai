<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ChevronDown, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-vue-next'
import { useChatStore, MODELS, EFFORT_LEVELS } from '@/stores/chat'
import { onClickOutside } from '@vueuse/core'
import { useComposerBox, isMobileViewport, anchorMobileSheet, anchorAboveComposerAtTrigger } from '@/composables/useComposerMobileSheet'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const chat = useChatStore()
const open = ref(false)
const effortsOpen = ref(false)
const effortSide = ref<'right' | 'left'>('right')
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const effortTrigger = ref<HTMLElement | null>(null)

// `panel` is always teleported straight to <body> (see toggleOpen below),
// which moves it outside `root`'s DOM subtree entirely. Without `ignore`,
// onClickOutside sees every tap inside that teleported panel as an
// "outside" click and closes the menu the instant you touch anything in
// it — including the effort row, which made it look like the effort menu
// simply didn't open.
onClickOutside(root, () => {
  open.value = false
  effortsOpen.value = false
}, { ignore: [panel] })

const composerBoxEl = useComposerBox()
const DESKTOP_PANEL_WIDTH = 288
// Mobile gets a below-composer sheet stretching the composer's width;
// desktop gets a smaller dropdown, anchored ABOVE the *whole* composer
// (not just this button) — since the composer docks at the bottom of the
// screen once inside a chat, a panel that opens downward has nowhere to
// go and gets clipped by the viewport edge.
const sheetMode = ref(false)
const sheetSide = ref<'above' | 'below'>('below')
const panelStyle = ref<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({
  top: 0,
  left: 0,
  width: DESKTOP_PANEL_WIDTH,
  maxHeight: 320,
})
// Mobile gets a proper two-screen drill-down (models -> effort) instead of
// squeezing the effort list in underneath the model list.
const mobileView = ref<'models' | 'effort'>('models')

function toggleOpen() {
  open.value = !open.value
  effortsOpen.value = false
  mobileView.value = 'models'
  if (!open.value) return
  sheetMode.value = isMobileViewport()
  if (sheetMode.value) {
    const anchor = anchorMobileSheet(composerBoxEl.value)
    sheetSide.value = anchor.side
    panelStyle.value = anchor
  } else {
    panelStyle.value = anchorAboveComposerAtTrigger(composerBoxEl.value, root.value, DESKTOP_PANEL_WIDTH)
  }
}

const current = () => MODELS.find((m) => m.id === chat.selectedModelId)!
const currentEffort = () => EFFORT_LEVELS.find((e) => e.id === chat.reasoningEffort)!

// Desktop: the effort list opens as a side flyout next to its trigger row
// — like a standard submenu — rather than stacking below it. Flip to the
// left when there isn't enough room on the right so it never runs
// off-screen. Mobile: it's a full drill-down screen instead (see
// mobileView), so this just swaps the sheet's content.
const FLYOUT_WIDTH = 256
async function toggleEfforts() {
  if (sheetMode.value) {
    mobileView.value = 'effort'
    return
  }
  effortsOpen.value = !effortsOpen.value
  if (!effortsOpen.value) return
  await nextTick()
  const rect = panel.value?.getBoundingClientRect()
  if (rect) {
    const margin = 12
    effortSide.value = window.innerWidth - rect.right < FLYOUT_WIDTH + margin ? 'left' : 'right'
  }
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      v-if="compact"
      @click="toggleOpen"
      v-tooltip="'Change model'"
      :class="[
        'flex h-9 w-full items-center justify-center rounded-lg transition-colors',
        open ? 'bg-white/[0.1] text-[var(--sp-text)]' : 'text-[var(--sp-text-dim)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
      ]"
    >
      <Sparkles :size="15" class="text-[var(--sp-primary)]" />
    </button>
    <button
      v-else
      @click="toggleOpen"
      :class="[
        'flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[var(--sp-text)] transition-colors hover:bg-white/[0.06]',
        open && 'bg-white/[0.06]',
      ]"
    >
      <span class="truncate">{{ current().name }}</span>
      <ChevronDown :size="13" class="shrink-0 text-[var(--sp-text-faint)]" :class="['transition-transform', open && 'rotate-180']" />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        :enter-from-class="sheetMode && sheetSide === 'below' ? 'opacity-0 scale-95 -translate-y-1' : 'opacity-0 scale-95 translate-y-1'"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="open"
          ref="panel"
          class="sp-composer-menu fixed z-40 rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
          :style="sheetMode
            ? {
                ...(sheetSide === 'above' ? { bottom: `${panelStyle.bottom}px` } : { top: `${panelStyle.top}px` }),
                left: `${panelStyle.left}px`,
                width: `${panelStyle.width}px`,
              }
            : { bottom: `${panelStyle.bottom}px`, left: `${panelStyle.left}px`, width: `${panelStyle.width}px` }"
        >
          <!-- Scrolling lives on this inner wrapper, not on `panel` itself.
               Setting overflow-y on `panel` implicitly forces its
               overflow-x to `auto` too (a CSS quirk: an axis left
               `visible` computes to `auto` once the other axis isn't
               `visible`), which was clipping the effort flyout below —
               it's an `absolute` child positioned outside panel's own
               bounds via `left-full`/`right-full`, so it never visibly
               opened on desktop. Keeping `panel` itself overflow-visible
               lets the flyout escape freely. -->
          <div class="overflow-y-auto" :style="{ maxHeight: `${panelStyle.maxHeight}px` }">
          <template v-if="!sheetMode || mobileView === 'models'">
            <button
              v-for="m in MODELS"
              :key="m.id"
              @click="chat.selectModel(m.id); open = false"
              class="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 text-[13px] font-medium text-[var(--sp-text)]">
                  {{ m.name }}
                  <span class="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[var(--sp-text-faint)]">{{ m.contextWindow }}</span>
                </div>
                <div class="mt-0.5 truncate text-[11.5px] text-[var(--sp-text-faint)]">{{ m.description }}</div>
              </div>
              <Check v-if="m.id === chat.selectedModelId" :size="15" class="mt-0.5 shrink-0 text-[var(--sp-primary)]" />
            </button>

            <div class="my-1 h-px bg-[var(--sp-border)]" />

            <button
              ref="effortTrigger"
              @click="toggleEfforts"
              @mouseenter="!sheetMode && !effortsOpen && toggleEfforts()"
              :class="[
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                effortsOpen ? 'bg-white/[0.06]' : 'hover:bg-white/[0.06]',
              ]"
            >
              <span class="min-w-0 flex-1">
                <span class="block text-[13px] font-medium text-[var(--sp-text)]">Effort</span>
                <span class="mt-0.5 block truncate text-[11.5px] text-[var(--sp-text-faint)]">{{ currentEffort().label }}</span>
              </span>
              <ChevronRight :size="14" class="shrink-0 text-[var(--sp-text-faint)] transition-transform" :class="!sheetMode && effortSide === 'left' && effortsOpen && 'rotate-180'" />
            </button>
          </template>

          <!-- Mobile: dedicated drill-down screen for effort, not an
               inline addendum under the model list — a proper "place" for
               it, matching how the rest of the app's mobile sheets work. -->
          <template v-else>
            <button
              @click="mobileView = 'models'"
              class="mb-1 flex items-center gap-1 rounded-xl px-2 py-2 text-left text-[12.5px] font-medium text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
            >
              <ChevronLeft :size="15" />
              Back
            </button>
            <div class="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Reasoning effort</div>
            <button
              v-for="e in EFFORT_LEVELS"
              :key="e.id"
              @click="chat.setEffort(e.id); open = false"
              class="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <div class="min-w-0 flex-1">
                <div class="text-[13px] font-medium text-[var(--sp-text)]">{{ e.label }}</div>
                <div class="mt-0.5 truncate text-[11.5px] text-[var(--sp-text-faint)]">{{ e.description }}</div>
              </div>
              <Check v-if="e.id === chat.reasoningEffort" :size="15" class="mt-0.5 shrink-0 text-[var(--sp-primary)]" />
            </button>
          </template>
          </div>

        <!-- Desktop: effort submenu flies out beside the trigger row, same
             as a standard OS-style submenu, instead of expanding downward. -->
        <Transition
          v-if="!sheetMode"
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="effortsOpen"
            class="sp-composer-menu absolute z-30 w-64 overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] bottom-0"
            :class="effortSide === 'right' ? 'left-full ml-2' : 'right-full mr-2'"
          >
            <button
              v-for="e in EFFORT_LEVELS"
              :key="e.id"
              @click="chat.setEffort(e.id); open = false; effortsOpen = false"
              class="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <div class="min-w-0 flex-1">
                <div class="text-[13px] font-medium text-[var(--sp-text)]">{{ e.label }}</div>
                <div class="mt-0.5 truncate text-[11.5px] text-[var(--sp-text-faint)]">{{ e.description }}</div>
              </div>
              <Check v-if="e.id === chat.reasoningEffort" :size="15" class="mt-0.5 shrink-0 text-[var(--sp-primary)]" />
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

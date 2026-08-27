<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { Mic, Trash2, Lock, ChevronUp, Check, X, AudioLines } from 'lucide-vue-next'
import { useIntervalFn, onKeyStroke, onClickOutside } from '@vueuse/core'
import { useComposerBox, isMobileViewport, anchorMobileSheet } from '@/composables/useComposerMobileSheet'

const emit = defineEmits<{
  /** A "voice message" finished recording — hand the (simulated) transcript back to the composer. */
  insertText: [text: string]
  /** Quick-tap live dictation toggled on/off. */
  dictateToggle: [value: boolean]
}>()

type Phase = 'idle' | 'pending' | 'recording' | 'locked' | 'processing'
const phase = ref<Phase>('idle')
const listening = ref(false)

// Holding the mic button still starts a recording directly. A plain click
// (no hold, no drag) now opens the options menu in one tap — no hidden
// intermediate arrow to find first.
const HOLD_THRESHOLD = 220 // ms — press-and-hold longer than this starts recording
const CANCEL_DX = -90 // px dragged left -> cancel
const LOCK_DY = -64 // px dragged up -> lock hands-free

let holdTimer: ReturnType<typeof setTimeout> | null = null
let dragStarted = false
const startX = ref(0)
const startY = ref(0)
const dragX = ref(0)
const dragY = ref(0)
const nearCancel = computed(() => phase.value === 'recording' && dragX.value < CANCEL_DX * 0.55)
const willCancel = computed(() => dragX.value < CANCEL_DX)
const nearLock = computed(() => phase.value === 'recording' && dragY.value < LOCK_DY * 0.55)

const wrapRef = ref<HTMLElement | null>(null)
const btnRef = ref<HTMLElement | null>(null)
const PANEL_WIDTH = 280
const anchor = ref({ bottom: 0, left: 0 })
const composerBoxEl = useComposerBox()
const optionsMobile = ref(false)
const optionsMobileStyle = ref<{ side: 'above' | 'below'; top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({ side: 'below', top: 0, left: 0, width: 0, maxHeight: 320 })
const optionsPanel = ref<HTMLElement | null>(null)

const optionsOpen = ref(false)
// optionsPanel gets teleported to <body>, moving it outside wrapRef's DOM
// subtree — without `ignore` here, any tap inside it (Record / Live
// dictation) reads as an "outside" click and closes the menu instantly.
onClickOutside(wrapRef, () => {
  optionsOpen.value = false
}, { ignore: [optionsPanel] })

const elapsed = ref(0)
const { pause: pauseTimer, resume: resumeTimer } = useIntervalFn(
  () => { elapsed.value += 1 },
  1000,
  { immediate: false },
)
const elapsedLabel = computed(() => {
  const m = Math.floor(elapsed.value / 60).toString().padStart(2, '0')
  const s = (elapsed.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const bars = Array.from({ length: 28 }, (_, i) => i)

function measureAnchor() {
  const rect = btnRef.value?.getBoundingClientRect()
  if (!rect) return
  const margin = 12
  anchor.value = {
    bottom: window.innerHeight - rect.top + margin,
    left: Math.min(Math.max(rect.left + rect.width / 2 - PANEL_WIDTH / 2, margin), window.innerWidth - PANEL_WIDTH - margin),
  }
}

function onPointerDown(e: PointerEvent) {
  if (phase.value === 'locked' || phase.value === 'processing') return
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  startX.value = e.clientX
  startY.value = e.clientY
  dragX.value = 0
  dragY.value = 0
  dragStarted = false
  phase.value = 'pending'
  measureAnchor()
  holdTimer = setTimeout(() => {
    if (phase.value === 'pending') startRecording()
  }, HOLD_THRESHOLD)
}

function onPointerMove(e: PointerEvent) {
  if (phase.value !== 'recording' && phase.value !== 'pending') return
  dragX.value = e.clientX - startX.value
  dragY.value = e.clientY - startY.value
  if (Math.abs(dragX.value) > 4 || Math.abs(dragY.value) > 4) dragStarted = true
  if (phase.value === 'recording' && dragY.value < LOCK_DY) lockRecording()
}

function onPointerUp() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
  if (phase.value === 'pending') {
    phase.value = 'idle'
    // A plain tap (no hold, no drag) opens the options menu directly —
    // covers both a quick dictation toggle and the full recording flow.
    if (!dragStarted) toggleOptions()
    return
  }
  if (phase.value === 'recording') {
    if (willCancel.value) cancelRecording()
    else finishRecording()
  }
  // 'locked' phase ignores pointerup — stopped via the panel's own buttons.
}

function toggleOptions() {
  optionsOpen.value = !optionsOpen.value
  if (!optionsOpen.value) return
  optionsMobile.value = isMobileViewport()
  if (optionsMobile.value) optionsMobileStyle.value = anchorMobileSheet(composerBoxEl.value)
  else measureAnchor()
}

function startRecording() {
  optionsOpen.value = false
  phase.value = 'recording'
  elapsed.value = 0
  resumeTimer()
}
function lockRecording() {
  phase.value = 'locked'
}
function cancelRecording() {
  pauseTimer()
  phase.value = 'idle'
}
function finishRecording() {
  pauseTimer()
  phase.value = 'processing'
  setTimeout(() => {
    const secs = elapsed.value
    emit('insertText', `[Voice message · ${Math.max(1, secs)}s — simulated transcript] `)
    phase.value = 'idle'
  }, 600)
}
function toggleListening() {
  optionsOpen.value = false
  listening.value = !listening.value
  emit('dictateToggle', listening.value)
}

onKeyStroke('Escape', () => {
  if (phase.value === 'recording' || phase.value === 'locked') cancelRecording()
  optionsOpen.value = false
})

onBeforeUnmount(() => { if (holdTimer) clearTimeout(holdTimer) })

const panelOpen = computed(() => phase.value === 'recording' || phase.value === 'locked' || phase.value === 'processing')
</script>

<template>
  <div ref="wrapRef" class="relative">
    <button
      ref="btnRef"
      v-tooltip="'Tap for options · hold to record'"
      class="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors"
      :class="listening || panelOpen || optionsOpen ? 'text-red-400' : 'text-[var(--sp-text-dim)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="cancelRecording"
    >
      <Mic :size="17" />
      <span v-if="listening" class="absolute inset-0 -z-10 animate-ping rounded-full bg-red-400/20" />
      <span
        v-if="phase === 'recording' || phase === 'pending'"
        v-motion
        :initial="{ scale: 0.6, opacity: 0 }"
        :enter="{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } }"
        class="absolute inset-0 -z-10 rounded-full bg-red-400/25"
        :class="phase === 'recording' && 'animate-pulse'"
      />
    </button>

    <Teleport to="body">
      <!-- Options menu — opens on a single plain tap of the mic button.
           Plain rows, no per-row wobble — the mic button above already
           carries the icon personality. -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-2"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="optionsOpen"
          ref="optionsPanel"
          class="sp-composer-menu fixed z-50 overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
          :class="optionsMobile ? 'overflow-y-auto' : ''"
          :style="optionsMobile
            ? {
                ...(optionsMobileStyle.side === 'above' ? { bottom: `${optionsMobileStyle.bottom}px` } : { top: `${optionsMobileStyle.top}px` }),
                left: `${optionsMobileStyle.left}px`,
                width: `${optionsMobileStyle.width}px`,
                maxHeight: `${optionsMobileStyle.maxHeight}px`,
              }
            : { bottom: `${anchor.bottom}px`, left: `${anchor.left}px`, width: `${PANEL_WIDTH}px` }"
        >
          <button
            @click="startRecording"
            class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <Mic :size="14" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[13px] font-medium text-[var(--sp-text)]">Record voice message</span>
              <span class="block truncate text-[11px] text-[var(--sp-text-faint)]">Same as holding the mic button</span>
            </span>
          </button>
          <button
            @click="toggleListening"
            class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
              <AudioLines :size="14" class="text-[var(--sp-text-dim)]" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[13px] font-medium text-[var(--sp-text)]">Live dictation</span>
              <span class="block truncate text-[11px] text-[var(--sp-text-faint)]">{{ listening ? 'Stop typing what you say' : 'Type what you say as you speak' }}</span>
            </span>
          </button>
        </div>
      </Transition>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-90 translate-y-3"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 scale-90 translate-y-2"
      >
        <div
          v-if="panelOpen"
          :style="{ bottom: `${anchor.bottom}px`, left: `${anchor.left}px`, width: `${PANEL_WIDTH}px` }"
          class="fixed z-50 select-none overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <!-- Recording / locked state -->
          <div v-if="phase !== 'processing'" class="p-3">
            <div class="mb-2.5 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span class="tabular-nums text-[13px] font-semibold text-[var(--sp-text)]">{{ elapsedLabel }}</span>
              </div>
              <span
                v-if="phase === 'locked'"
                v-motion
                :initial="{ opacity: 0, y: -4 }"
                :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 24 } }"
                class="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-[var(--sp-text-faint)]"
              >
                <Lock :size="10" /> Locked
              </span>
              <span v-else class="flex items-center gap-1 text-[10.5px] text-[var(--sp-text-faint)]" :class="nearLock && 'text-[var(--sp-primary)]'">
                <ChevronUp :size="12" :class="nearLock && 'animate-bounce'" /> Slide up to lock
              </span>
            </div>

            <!-- Waveform -->
            <div class="mb-2.5 flex h-9 items-end justify-center gap-[3px] overflow-hidden rounded-lg bg-white/[0.03] px-2">
              <span
                v-for="i in bars"
                :key="i"
                class="mic-wave-bar w-[3px] shrink-0 rounded-full bg-gradient-to-t from-red-500/70 to-red-400"
                :style="{ animationDelay: `${(i % 9) * 70}ms`, animationDuration: `${560 + (i % 5) * 90}ms` }"
              />
            </div>

            <!-- Controls -->
            <div class="flex items-center justify-between gap-2">
              <button
                @click="cancelRecording"
                v-tooltip="'Cancel'"
                class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--sp-text-faint)] transition-colors hover:bg-white/[0.08] hover:text-red-400"
                :class="nearCancel && 'bg-red-500/15 text-red-400'"
              >
                <Trash2 :size="15" />
              </button>

              <span v-if="phase === 'recording'" class="flex-1 text-center text-[10.5px]" :class="nearCancel ? 'text-red-400' : 'text-[var(--sp-text-faint)]'">
                <X :size="10" class="mr-0.5 inline" />slide to cancel
              </span>
              <span v-else class="flex-1 text-center text-[10.5px] text-[var(--sp-text-faint)]">Hands-free — tap check to send</span>

              <button
                @click="finishRecording"
                v-tooltip="'Finish and insert'"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] text-black transition-transform"
              >
                <Check :size="15" stroke-width="3" />
              </button>
            </div>
          </div>

          <!-- Processing / "transcribing" state -->
          <div v-else class="flex items-center justify-center gap-2.5 px-4 py-4">
            <span
              v-motion
              :initial="{ rotate: 0 }"
              :enter="{ rotate: 360, transition: { duration: 700, repeat: Infinity, ease: 'linear' } }"
              class="h-3.5 w-3.5 rounded-full border-2 border-[var(--sp-primary)]/30 border-t-[var(--sp-primary)]"
            />
            <span class="text-[12.5px] font-medium text-[var(--sp-text-dim)]">Transcribing…</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes mic-wave {
  0%, 100% { height: 20%; }
  50% { height: 100%; }
}
.mic-wave-bar {
  animation-name: mic-wave;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  height: 20%;
}
</style>

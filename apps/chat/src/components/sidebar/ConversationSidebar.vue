<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui'
import SidebarBody from './SidebarBody.vue'

const ui = useUiStore()
const query = ref('')

// --- Flicker fix -----------------------------------------------------
// The old rail flickered for two stacked reasons:
//  1) `backdrop-blur-xl` sitting directly on the element whose `width`
//     was being transitioned. Browsers repaint/recompute a backdrop
//     filter every frame its box resizes, which shows up as a visible
//     strobe during the animation. Fix: the blur now lives on a
//     *fixed-width* layer (always 280px) that sits behind the content;
//     the outer <aside> only clips it via `overflow-hidden` as it
//     resizes, which is a cheap clip instead of a filter recompute.
//  2) SidebarBody swaps between two structurally different subtrees
//     (icon-only rail vs full list) via v-if the instant the toggle
//     fires — mid-flight through the width transition. The wide list
//     would flash inside the still-narrow rail (or vice versa). Fix:
//     `renderCollapsed` below lags the real state so the content swap
//     only happens once the rail has (mostly) finished resizing.
const RAIL_MS = 420
let swapTimer: ReturnType<typeof setTimeout> | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null
const renderCollapsed = ref(ui.sidebarCollapsed)
// A short opacity dip right around the content swap — without it the
// icon-only rail and the full list pop in/out instantly mid-glide,
// which reads as a stutter no matter how smooth the width easing is.
const contentSettled = ref(true)
const FADE_MS = 140

watch(
  () => ui.sidebarCollapsed,
  (collapsed) => {
    if (swapTimer) clearTimeout(swapTimer)
    if (fadeTimer) clearTimeout(fadeTimer)
    contentSettled.value = false
    if (collapsed) {
      // Collapsing: the icon-only rail never overflows, so swap content
      // right away — only the width needs to animate.
      renderCollapsed.value = true
    } else {
      // Expanding: wait for the rail to (nearly) reach full width before
      // mounting the wider content, so it never has to squeeze into a
      // too-narrow container mid-transition.
      swapTimer = setTimeout(() => {
        renderCollapsed.value = false
      }, RAIL_MS * 0.5)
    }
    fadeTimer = setTimeout(() => {
      contentSettled.value = true
    }, RAIL_MS * 0.5)
  },
)
onBeforeUnmount(() => {
  if (swapTimer) clearTimeout(swapTimer)
  if (fadeTimer) clearTimeout(fadeTimer)
})
</script>

<template>
  <!-- Desktop rail -->
  <aside
    class="relative hidden h-full shrink-0 overflow-hidden border-r border-[var(--sp-border)] lg:flex [contain:layout_style] [will-change:width]"
    :style="{
      width: ui.sidebarCollapsed ? '72px' : '280px',
      transition: `width ${RAIL_MS}ms cubic-bezier(0.19, 1, 0.22, 1)`,
    }"
  >
    <!-- Fixed-width blur/background layer — never resizes, so its
         backdrop-filter is never recomputed during the rail animation. -->
    <div class="absolute inset-y-0 left-0 w-[280px] bg-[var(--sp-bg-1)]/70 backdrop-blur-xl" />

    <div
      class="relative z-10 flex h-full shrink-0 flex-col overflow-hidden"
      :style="{
        width: ui.sidebarCollapsed ? '72px' : '280px',
        opacity: contentSettled ? 1 : 0.4,
        transition: `width ${RAIL_MS}ms cubic-bezier(0.19, 1, 0.22, 1), opacity ${FADE_MS}ms ease-out`,
      }"
    >
      <SidebarBody v-model:query="query" :collapsed="renderCollapsed" />
    </div>
  </aside>

  <!-- Mobile scrim + drawer -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0"
  >
    <div v-if="ui.sidebarOpen" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" @click="ui.closeSidebar()" />
  </Transition>
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="-translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="-translate-x-full"
  >
    <aside v-if="ui.sidebarOpen" class="fixed left-0 top-0 z-50 flex h-full w-[300px] max-w-[85vw] flex-col border-r border-[var(--sp-border)] bg-[var(--sp-bg-1)] lg:hidden">
      <SidebarBody v-model:query="query" show-close-button @navigate="ui.closeSidebar()" />
    </aside>
  </Transition>
</template>

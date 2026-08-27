<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { tooltipState } from '@/stores/tooltip'

// One shared floating tooltip, teleported to <body> and positioned via
// fixed coordinates written by the v-tooltip directive.
//
// Positioning is measured, not guessed: once the tooltip is in the DOM we
// read its actual rendered size and clamp it to stay fully inside the
// viewport (with an 8px margin), then nudge the little arrow sideways so
// it still points at whatever triggered it even after the box got shifted
// off-center to avoid spilling past the edge of the window.
const MARGIN = 8
const ttEl = ref<HTMLElement | null>(null)
const measured = ref<{ left: number; top: number; arrow: number } | null>(null)

// Rough guess used for the very first paint, before we've measured the
// real element — close enough that there's no visible jump for the
// common (non-clamped) case, and it's immediately corrected below anyway.
const fallback = computed(() => {
  const { x, y, placement } = tooltipState
  const w = 120
  const h = 30
  if (placement === 'top') return { left: x - w / 2, top: y - h, arrow: 0 }
  if (placement === 'bottom') return { left: x - w / 2, top: y, arrow: 0 }
  if (placement === 'left') return { left: x - w, top: y - h / 2, arrow: 0 }
  return { left: x, top: y - h / 2, arrow: 0 }
})

const pos = computed(() => measured.value ?? fallback.value)

watch(
  () => [tooltipState.visible, tooltipState.text, tooltipState.placement, tooltipState.x, tooltipState.y],
  () => {
    measured.value = null
    if (!tooltipState.visible) return
    nextTick(() => {
      const el = ttEl.value
      if (!el || !tooltipState.visible) return
      const rect = el.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const { x, y, placement } = tooltipState

      let left = x
      let top = y
      if (placement === 'top') { left = x - w / 2; top = y - h }
      else if (placement === 'bottom') { left = x - w / 2; top = y }
      else if (placement === 'left') { left = x - w; top = y - h / 2 }
      else { left = x; top = y - h / 2 }

      const clampedLeft = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, window.innerWidth - w - MARGIN))
      const clampedTop = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, window.innerHeight - h - MARGIN))

      let arrow = 0
      if (placement === 'top' || placement === 'bottom') {
        const room = Math.max(0, w / 2 - 14)
        arrow = Math.min(room, Math.max(-room, x - (clampedLeft + w / 2)))
      } else {
        const room = Math.max(0, h / 2 - 14)
        arrow = Math.min(room, Math.max(-room, y - (clampedTop + h / 2)))
      }

      measured.value = { left: clampedLeft, top: clampedTop, arrow }
    })
  },
  { flush: 'post' },
)

const boxStyle = computed(() => ({ left: `${pos.value.left}px`, top: `${pos.value.top}px` }))
const arrowStyle = computed(() => {
  const { placement } = tooltipState
  const offset = pos.value.arrow
  if (placement === 'top' || placement === 'bottom') return { left: `calc(50% + ${offset}px)` }
  return { top: `calc(50% + ${offset}px)` }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="sp-tt-enter"
      leave-active-class="sp-tt-leave"
      enter-from-class="sp-tt-hidden"
      leave-to-class="sp-tt-hidden"
    >
      <div
        v-if="tooltipState.visible && tooltipState.text"
        ref="ttEl"
        class="sp-tooltip"
        :class="`sp-tooltip--${tooltipState.placement}`"
        :style="boxStyle"
        role="tooltip"
      >
        <span class="sp-tooltip__glow" aria-hidden="true" />
        <span class="sp-tooltip__text">{{ tooltipState.text }}</span>
        <span class="sp-tooltip__arrow" :style="arrowStyle" aria-hidden="true" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sp-tooltip {
  position: fixed;
  z-index: 500;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  max-width: min(280px, calc(100vw - 16px));
  padding: 6px 11px;
  border-radius: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--sp-text);
  background:
    linear-gradient(180deg, rgba(var(--sp-primary-rgb), 0.1), transparent 60%),
    color-mix(in srgb, var(--sp-bg-2) 88%, black 4%);
  border: 1px solid var(--sp-border-hover);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 10px 28px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(0, 0, 0, 0.15),
    0 0 22px -4px rgba(var(--sp-primary-rgb), 0.35);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
}

.sp-tooltip__glow {
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(120deg, rgba(var(--sp-primary-rgb), 0.55), rgba(var(--sp-accent-rgb), 0.35) 60%, transparent);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.55;
}

.sp-tooltip__text {
  position: relative;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp-tooltip__arrow {
  position: absolute;
  width: 7px;
  height: 7px;
  background: color-mix(in srgb, var(--sp-bg-2) 88%, black 4%);
  border: 1px solid var(--sp-border-hover);
  border-top: none;
  border-left: none;
}

.sp-tooltip--top .sp-tooltip__arrow {
  bottom: -4.5px;
  transform: translateX(-50%) rotate(45deg);
}
.sp-tooltip--bottom .sp-tooltip__arrow {
  top: -4.5px;
  transform: translateX(-50%) rotate(225deg);
  border-top: 1px solid var(--sp-border-hover);
  border-left: 1px solid var(--sp-border-hover);
  border-bottom: none;
  border-right: none;
}
.sp-tooltip--left .sp-tooltip__arrow {
  right: -4.5px;
  transform: translateY(-50%) rotate(-45deg);
}
.sp-tooltip--right .sp-tooltip__arrow {
  left: -4.5px;
  transform: translateY(-50%) rotate(135deg);
}

.sp-tt-enter {
  transition: opacity 0.16s cubic-bezier(.22, .61, .36, 1), transform 0.2s cubic-bezier(.34, 1.56, .64, 1);
}
.sp-tt-leave {
  transition: opacity 0.1s ease-in, transform 0.12s ease-in;
}
.sp-tt-hidden {
  opacity: 0;
  transform: scale(0.94) translateY(2px);
}
</style>

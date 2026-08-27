<script setup lang="ts">
// The glass "badge" chrome that wraps LogoMark in the marketing navbar and
// loader (apps/marketing Nav.module.css .logoBadge) — gradient fill, soft
// border, ambient glow, and a spring rotate+scale on hover. Reused here so
// the sidebar header / greeting screen read as the same brand chrome, not
// just the same icon.
import LogoMark from './LogoMark.vue'

withDefaults(defineProps<{ size?: number; markSize?: number; interactive?: boolean }>(), {
  size: 38,
  interactive: true,
})
</script>

<template>
  <div
    class="sp-badge"
    :class="{ 'sp-badge--interactive': interactive }"
    :style="{ width: `${size}px`, height: `${size}px`, borderRadius: `${Math.round(size * 0.32)}px` }"
  >
    <LogoMark :size="markSize ?? Math.round(size * 0.63)" />
  </div>
</template>

<style scoped>
.sp-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, rgba(var(--sp-primary-rgb), 0.38), rgba(var(--sp-accent-rgb), 0.26));
  border: 1.5px solid rgba(var(--sp-primary-rgb), 0.6);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.28) inset,
    0 2px 10px rgba(0, 0, 0, 0.3),
    0 0 18px rgba(var(--sp-primary-rgb), 0.3);
  transition:
    border-radius 0.5s cubic-bezier(.34, 1.56, .64, 1),
    box-shadow 0.4s cubic-bezier(.22, .61, .36, 1),
    background 0.5s cubic-bezier(.22, .61, .36, 1),
    transform 0.5s cubic-bezier(.34, 1.56, .64, 1);
}
.sp-badge--interactive:hover {
  border-radius: 46% !important;
  transform: scale(1.06);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.24) inset,
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 0 26px rgba(var(--sp-primary-rgb), 0.32);
}
.sp-badge--interactive:hover :deep(.sp-logo) {
  transform: rotate(180deg) scale(1.1);
}
.sp-badge :deep(.sp-logo) {
  transition: transform 0.6s cubic-bezier(.34, 1.56, .64, 1);
  transform-origin: 50% 50%;
}
</style>

<script setup lang="ts">
// Matches apps/marketing's LogoMark exactly (Nav.tsx / LoadingScreen): a
// thin ring plus a 4-point sparkle/star, not the mountain favicon glyph.
// Keep this in sync with apps/marketing/src/components/NavWithLoader.tsx
// if that source ever changes — it's the single canonical brand mark.
withDefaults(defineProps<{ size?: number; animated?: boolean }>(), {
  size: 24,
  animated: true,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="sp-logo"
    :class="{ 'sp-logo--animated': animated }"
    role="img"
    aria-label="Spatial AI logo"
  >
    <circle class="sp-logo__ring" cx="14" cy="14" r="12" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    <polygon
      class="sp-logo__glow"
      points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5"
    />
    <polygon
      class="sp-logo__star"
      points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5"
    />
  </svg>
</template>

<style scoped>
.sp-logo__ring {
  stroke: var(--sp-primary);
  transition: stroke 0.6s;
}
.sp-logo__star {
  fill: var(--sp-primary);
  transition: fill 0.6s;
  transform-origin: 14px 14px;
}
.sp-logo__glow {
  fill: var(--sp-accent);
  opacity: 0.6;
  filter: blur(3px);
  transform-origin: 14px 14px;
  pointer-events: none;
}
.sp-logo--animated .sp-logo__glow {
  animation: sp-star-glow 2.4s ease-in-out infinite;
}

@keyframes sp-star-glow {
  0%, 100% { opacity: 0.4; transform: scale(0.92); }
  50%      { opacity: 0.75; transform: scale(1.12); }
}

@media (prefers-reduced-motion: reduce) {
  .sp-logo--animated .sp-logo__glow { animation: none; }
}
</style>

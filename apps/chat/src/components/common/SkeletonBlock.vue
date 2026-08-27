<script setup lang="ts">
// Shared shimmer placeholder — a neutral block with the same `.sp-shimmer`
// sweep already used for uploading attachments in the composer, so every
// "still loading" moment in the app (sidebar rows, message bubbles,
// images) reads as one consistent loading language instead of a mix of
// spinners, dots, and blank space.
withDefaults(
  defineProps<{ width?: string; height?: string; rounded?: string }>(),
  { width: '100%', height: '0.9em', rounded: '6px' },
)
</script>

<template>
  <span
    class="relative inline-block shrink-0 overflow-hidden bg-white/[0.06]"
    :style="{ width, height, borderRadius: rounded }"
  >
    <span class="sp-shimmer absolute inset-0" />
  </span>
</template>

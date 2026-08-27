<script setup lang="ts">
// Quiet, ambient backdrop: two soft aurora blobs drifting behind a faint
// grid. Pure CSS/SVG, GPU-composited (transform + opacity only) so it never
// competes with the chat stream for main-thread time.
</script>

<template>
  <div class="pointer-events-none fixed inset-0 overflow-hidden -z-10">
    <div
      class="sp-aurora absolute -top-1/4 -left-1/4 h-[70vh] w-[70vh] rounded-full blur-[110px] opacity-30"
      style="background: radial-gradient(circle, var(--sp-primary) 0%, transparent 70%)"
    />
    <div
      class="sp-aurora absolute -bottom-1/4 -right-1/4 h-[65vh] w-[65vh] rounded-full blur-[110px] opacity-25"
      style="background: radial-gradient(circle, var(--sp-accent) 0%, transparent 70%); animation-delay: -9s"
    />
    <div
      class="absolute inset-0 opacity-[0.035]"
      style="background-image: linear-gradient(to right, var(--sp-text) 1px, transparent 1px), linear-gradient(to bottom, var(--sp-text) 1px, transparent 1px); background-size: 48px 48px"
    />
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0%,var(--sp-bg-0)_78%)]" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label: string; active?: boolean }>(), { active: false })
</script>

<template>
  <button
    :aria-label="label"
    v-tooltip="{ text: label, placement: 'bottom' }"
    :class="[
      'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150',
      active
        ? 'bg-[var(--sp-primary)]/[0.14] text-[var(--sp-primary)]'
        : 'text-[var(--sp-text-dim)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
    ]"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
</script>

<template>
  <!-- YouTube-style shimmer placeholder for the reply that hasn't started
       streaming yet, replacing the old three-dot bounce so every "still
       loading" moment in the app shares the same shimmer language. -->
  <div class="flex flex-col gap-2 py-0.5" style="max-width: 22rem">
    <SkeletonBlock width="88%" height="0.85em" />
    <SkeletonBlock width="62%" height="0.85em" />
  </div>
</template>

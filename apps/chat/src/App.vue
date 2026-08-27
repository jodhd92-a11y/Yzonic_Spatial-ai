<script setup lang="ts">
import { RouterView } from 'vue-router'
import ImmersiveBackground from '@/components/layout/ImmersiveBackground.vue'
import ShortcutsModal from '@/components/common/ShortcutsModal.vue'
import SettingsModal from '@/components/common/SettingsModal.vue'
import OnboardingTour from '@/components/common/OnboardingTour.vue'
import TooltipHost from '@/components/common/TooltipHost.vue'
import AnnouncementBillboard from '@/components/common/AnnouncementBillboard.vue'
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden bg-[var(--sp-bg-0)] text-[var(--sp-text)]">
    <ImmersiveBackground />
    <RouterView />
    <ShortcutsModal />
    <SettingsModal />
    <OnboardingTour />
    <AnnouncementBillboard />
    <TooltipHost />
  </div>
</template>

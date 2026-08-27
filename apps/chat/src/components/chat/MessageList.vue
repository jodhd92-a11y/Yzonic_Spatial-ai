<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ArrowDown } from 'lucide-vue-next'
import type { ChatMessage } from '@/types/chat'
import { useSettingsStore } from '@/stores/settings'
import MessageBubble from './MessageBubble.vue'

const props = defineProps<{ messages: ChatMessage[] }>()
const settings = useSettingsStore()
const scrollEl = ref<HTMLElement | null>(null)
const pinnedToBottom = ref(true)
const showJump = ref(false)

function onScroll() {
  const node = scrollEl.value
  if (!node) return
  const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
  pinnedToBottom.value = distanceFromBottom < 80
  showJump.value = distanceFromBottom > 240
}

function jumpToBottom() {
  scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: 'smooth' })
}

watch(
  () => [props.messages.length, props.messages.at(-1)?.content],
  async () => {
    if (!settings.autoScroll || !pinnedToBottom.value) return
    await nextTick()
    scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight })
  },
)
</script>

<template>
  <div class="relative min-h-0 flex-1">
    <div ref="scrollEl" @scroll="onScroll" class="h-full overflow-y-auto">
      <div
        class="mx-auto flex flex-col px-4 pb-4 pt-8 sm:px-6"
        style="max-width: var(--sp-chat-max); gap: var(--sp-msg-gap)"
      >
        <MessageBubble v-for="m in messages" :key="m.id" :message="m" />
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-90"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-2 scale-90"
    >
      <button
        v-if="showJump"
        @click="jumpToBottom"
        aria-label="Scroll to latest message"
        class="absolute bottom-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--sp-border)] bg-[var(--sp-bg-1)]/90 text-[var(--sp-text-dim)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors hover:text-[var(--sp-text)]"
      >
        <ArrowDown :size="15" />
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { useBridge } from '@/composables/useBridge'
import { useShortcuts } from '@/composables/useShortcuts'
import { uid } from '@/lib/utils'
import ConversationSidebar from '@/components/sidebar/ConversationSidebar.vue'
import TopBar from '@/components/layout/TopBar.vue'
import MessageList from '@/components/chat/MessageList.vue'
import Composer from '@/components/composer/Composer.vue'
import AppSkeleton from '@/components/layout/AppSkeleton.vue'

const route = useRoute()
const router = useRouter()
const chat = useChatStore()
const userStore = useUserStore()

useBridge((data) => {
  if (data.type === 'init' && data.user) userStore.setUser(data.user as never)
  // "Chat about this" from a scan in the camera app arrives here as a
  // seed (label, thumbnail, template, case info) — turn it into a fresh
  // conversation opened with that photo attached and the clinical context
  // already stated, same as if the person had attached it themselves and
  // typed a full case-aware question about it.
  if (data.type === 'init' && data.scanSeed) {
    const seed = data.scanSeed as {
      label: string
      thumbnail?: string
      templateLabel?: string
      caseInfo?: { caseId?: string; bodySite?: string; modality?: string; notes?: string }
    }

    const contextLines: string[] = []
    if (seed.templateLabel) contextLines.push(`Workflow: ${seed.templateLabel}`)
    if (seed.caseInfo?.caseId) contextLines.push(`Case/specimen ID: ${seed.caseInfo.caseId}`)
    if (seed.caseInfo?.bodySite) contextLines.push(`Body site / source: ${seed.caseInfo.bodySite}`)
    if (seed.caseInfo?.modality) contextLines.push(`Modality: ${seed.caseInfo.modality}`)
    if (seed.caseInfo?.notes) contextLines.push(`Notes: ${seed.caseInfo.notes}`)

    const openingPrompt = contextLines.length
      ? `I captured this from the ${seed.label.toLowerCase()} — here's the case context:\n${contextLines.join('\n')}\n\nWhat should I take into account, and what would you flag for follow-up?`
      : `What can you tell me about this ${seed.label.toLowerCase()}?`

    // Start from a clean slate — sendMessage() below creates the actual
    // conversation (and the sidebar entry with it) the moment this first
    // message goes out, same as any other new chat. The activeId watcher
    // further down pushes the URL to /chat/<id> once that happens.
    chat.activeId = null
    chat.sendMessage(openingPrompt, seed.thumbnail
      ? [{ id: uid('scan'), name: `${seed.label}.jpg`, size: 0, type: 'image/jpeg', previewUrl: seed.thumbnail }]
      : undefined)
  }
})
useShortcuts()

onMounted(() => {
  const id = route.params.id as string | undefined
  if (id) {
    chat.selectConversation(id)
  } else {
    // Landing on bare /chat (a fresh app open, not a specific chat link)
    // should always show New Chat — even if a previous session left some
    // other conversation active in localStorage.
    chat.activeId = null
  }
})

// Keep the URL in sync with the active conversation so refresh/back-forward
// behave, without fighting the store as the source of truth.
watch(
  () => chat.activeId,
  (id) => {
    if (id && route.params.id !== id) router.replace(`/chat/${id}`)
    if (!id && route.path !== '/chat') router.replace('/chat')
  },
)
</script>

<template>
  <AppSkeleton v-if="!chat.hydrated" />

  <div v-else class="flex h-full w-full">
    <ConversationSidebar />

    <div class="flex min-w-0 flex-1 flex-col">
      <TopBar />

      <div v-if="chat.active && chat.active.messages.length" class="flex min-h-0 flex-1 flex-col">
        <MessageList :messages="chat.active.messages" />
        <div class="px-4 pb-5 pt-2 sm:px-6">
          <div class="mx-auto" style="max-width: var(--sp-chat-max)">
            <Composer />
          </div>
        </div>
      </div>

      <div v-else class="flex flex-1 items-center justify-center px-4">
        <div class="w-full max-w-[640px]">
          <Composer centered />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown, Pencil, X as XIcon, ArrowUp, FileText } from 'lucide-vue-next'
import { onKeyStroke } from '@vueuse/core'
import type { ChatMessage } from '@/types/chat'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { formatBytes } from '@/lib/utils'
import MarkdownRenderer from './MarkdownRenderer.vue'
import TypingIndicator from './TypingIndicator.vue'
import LogoMark from '@/components/common/LogoMark.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'

const props = defineProps<{ message: ChatMessage }>()
const chat = useChatStore()
const settings = useSettingsStore()
const userStore = useUserStore()

const copied = ref(false)
const reaction = ref<'up' | 'down' | null>(null)
const editing = ref(false)
const draft = ref('')
const editEl = ref<HTMLTextAreaElement | null>(null)
const lightboxSrc = ref<string | null>(null)
const lightboxLoaded = ref(false)
// Tracks which attachment thumbnails have actually finished loading, so
// each one gets its own shimmer placeholder until its <img> fires `load`
// instead of popping in abruptly (or showing nothing) mid-fetch.
const loadedThumbs = ref<Set<string>>(new Set())
function markThumbLoaded(id: string) {
  loadedThumbs.value.add(id)
}

function openLightbox(src?: string) {
  if (!src) return
  lightboxLoaded.value = false
  lightboxSrc.value = src
}
function closeLightbox() {
  lightboxSrc.value = null
}
onKeyStroke('Escape', () => closeLightbox())

function copy() {
  navigator.clipboard.writeText(props.message.content)
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}

function react(kind: 'up' | 'down') {
  reaction.value = reaction.value === kind ? null : kind
}

async function startEdit() {
  draft.value = props.message.content
  editing.value = true
  await nextTick()
  editEl.value?.focus()
  editEl.value?.setSelectionRange(draft.value.length, draft.value.length)
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  if (!draft.value.trim()) return
  editing.value = false
  await chat.editMessage(props.message.id, draft.value)
}

function timestamp(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div
    v-motion
    :initial="{ opacity: 0, y: 10 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 260, ease: 'easeOut' } }"
    :class="['group flex gap-2.5 px-1', message.role === 'user' ? 'flex-row-reverse' : '']"
  >
    <div
      v-if="message.role === 'user'"
      class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-black shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform"
      style="background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent))"
    >
      {{ userStore.initial }}
    </div>
    <div
      v-else
      class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-[var(--sp-border)] transition-transform"
    >
      <LogoMark :size="16" :animated="!!message.streaming" />
    </div>

    <div :class="['flex min-w-0 max-w-[70%] flex-col', message.role === 'user' ? 'items-end' : 'w-full max-w-[72ch] items-start']">
      <div
        v-if="message.attachments?.length"
        :class="['mb-1.5 flex flex-wrap gap-1.5', message.role === 'user' ? 'justify-end' : 'justify-start']"
      >
        <template v-for="a in message.attachments" :key="a.id">
          <button
            v-if="a.type === 'image' && a.previewUrl"
            v-tooltip="a.name"
            @click="openLightbox(a.previewUrl)"
            class="group/att relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--sp-border)]"
          >
            <div v-if="!loadedThumbs.has(a.id)" class="absolute inset-0">
              <SkeletonBlock width="100%" height="100%" rounded="0px" />
            </div>
            <img
              :src="a.previewUrl"
              @load="markThumbLoaded(a.id)"
              :class="[
                'h-full w-full object-cover transition-all duration-200 group-hover/att:scale-105',
                loadedThumbs.has(a.id) ? 'opacity-100' : 'opacity-0',
              ]"
              alt=""
            />
          </button>
          <div
            v-else
            class="flex items-center gap-2 rounded-xl border border-[var(--sp-border)] bg-white/[0.04] px-2.5 py-2 text-[12px] text-[var(--sp-text-dim)]"
          >
            <FileText :size="14" class="shrink-0" />
            <span class="max-w-[140px] truncate">{{ a.name }}</span>
            <span class="text-[var(--sp-text-faint)]">{{ formatBytes(a.size) }}</span>
          </div>
        </template>
      </div>

      <!-- Edit mode: replaces the bubble with an inline textarea -->
      <div v-if="editing" class="w-full min-w-[260px]">
        <textarea
          ref="editEl"
          v-model="draft"
          rows="3"
          class="w-full resize-none rounded-[var(--sp-bubble-radius)] border border-[var(--sp-primary)]/50 bg-white/[0.04] px-4 py-2.5 text-[calc(14.5px*var(--sp-font-scale))] leading-relaxed text-[var(--sp-text)] focus:outline-none"
          @keydown.enter.exact.prevent="saveEdit"
          @keydown.esc="cancelEdit"
        />
        <div class="mt-1.5 flex justify-end gap-1.5">
          <button @click="cancelEdit" class="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] text-[var(--sp-text-faint)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]">
            <XIcon :size="12" /> Cancel
          </button>
          <button
            @click="saveEdit"
            class="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium text-black"
            style="background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent))"
          >
            <ArrowUp :size="12" /> Save &amp; resend
          </button>
        </div>
      </div>

      <div
        v-else
        :style="{
          padding: `var(--sp-msg-pad-y) 16px`,
          borderRadius: message.role === 'user' ? 'var(--sp-bubble-radius) var(--sp-bubble-radius) 6px var(--sp-bubble-radius)' : 'var(--sp-bubble-radius)',
          fontSize: 'calc(1px * var(--sp-font-scale))',
        }"
        :class="[
          message.role === 'user'
            ? 'bg-white/[0.07] text-[var(--sp-text)] shadow-[0_1px_2px_rgba(0,0,0,0.2)]'
            : 'bg-transparent text-[var(--sp-text)]',
        ]"
      >
        <TypingIndicator v-if="message.streaming && !message.content" />
        <MarkdownRenderer v-else :content="message.content" />
        <span v-if="message.streaming && message.content" class="sp-caret ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-[var(--sp-primary)]" />
        <p v-if="message.error" class="mt-1 text-[12.5px] text-red-400">{{ message.error }}</p>
      </div>

      <div
        v-if="!message.streaming && !editing"
        class="mt-1 flex items-center gap-1 px-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <span v-if="settings.showTimestamps" class="mr-0.5 select-none text-[10.5px] text-[var(--sp-text-faint)]">{{ timestamp(message.createdAt) }}</span>
        <button @click="copy" v-tooltip="'Copy'" class="rounded-md p-1.5 text-[var(--sp-text-faint)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]">
          <Check v-if="copied" :size="13" class="text-emerald-400" />
          <Copy v-else :size="13" />
        </button>
        <button
          v-if="message.role === 'user'"
          @click="startEdit"
          v-tooltip="'Edit & resend'"
          class="rounded-md p-1.5 text-[var(--sp-text-faint)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <Pencil :size="13" />
        </button>
        <template v-if="message.role === 'assistant'">
          <button @click="chat.regenerate()" v-tooltip="'Regenerate'" class="rounded-md p-1.5 text-[var(--sp-text-faint)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]">
            <RotateCcw :size="13" />
          </button>
          <button
            @click="react('up')"
            v-tooltip="'Good response'"
            :class="['rounded-md p-1.5 transition-colors hover:bg-white/[0.06]', reaction === 'up' ? 'text-emerald-400' : 'text-[var(--sp-text-faint)] hover:text-[var(--sp-text)]']"
          >
            <ThumbsUp :size="13" :fill="reaction === 'up' ? 'currentColor' : 'none'" />
          </button>
          <button
            @click="react('down')"
            v-tooltip="'Poor response'"
            :class="['rounded-md p-1.5 transition-colors hover:bg-white/[0.06]', reaction === 'down' ? 'text-red-400' : 'text-[var(--sp-text-faint)] hover:text-[var(--sp-text)]']"
          >
            <ThumbsDown :size="13" :fill="reaction === 'down' ? 'currentColor' : 'none'" />
          </button>
        </template>
      </div>
    </div>
  </div>

  <!-- Full-size image preview for attached photos. -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="lightboxSrc"
        class="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
        @click.self="closeLightbox"
      >
        <SkeletonBlock v-if="!lightboxLoaded" width="min(70vw, 480px)" height="min(70vh, 480px)" rounded="12px" />
        <img
          v-show="lightboxLoaded"
          :src="lightboxSrc"
          @load="lightboxLoaded = true"
          class="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          alt=""
        />
        <button
          @click="closeLightbox"
          aria-label="Close preview"
          class="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <XIcon :size="16" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

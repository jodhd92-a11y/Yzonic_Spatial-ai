<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { MessageSquare, MoreHorizontal, Pin, PenLine, MailOpen, Mail, Trash2 } from 'lucide-vue-next'
import type { Conversation } from '@/types/chat'
import { relativeTime } from '@/lib/utils'

const props = defineProps<{ conv: Conversation; active: boolean }>()
const emit = defineEmits<{
  select: []
  pin: []
  remove: []
  rename: [title: string]
  toggleRead: []
}>()

const MENU_WIDTH = 190
const menuOpen = ref(false)
const menuBtn = ref<HTMLElement | null>(null)
const anchor = ref({ top: 0, left: 0 })

function openMenu(e: MouseEvent | KeyboardEvent) {
  const margin = 8
  // Clamp so the floating menu always sits fully on-screen with real air
  // around it, anchored to the cursor that opened it rather than a fixed
  // offset from the button. Keyboard activation has no cursor coordinate,
  // so fall back to the trigger element's own position in that case.
  let x: number, y: number
  if ('clientX' in e && (e.clientX || e.clientY)) {
    x = e.clientX
    y = e.clientY
  } else {
    const rect = (menuBtn.value ?? (e.currentTarget as HTMLElement)).getBoundingClientRect()
    x = rect.right
    y = rect.bottom
  }
  const left = Math.min(Math.max(x - MENU_WIDTH + 16, margin), window.innerWidth - MENU_WIDTH - margin)
  const top = Math.min(y + 6, window.innerHeight - margin)
  anchor.value = { top, left }
  menuOpen.value = true
}

const isEditing = ref(false)
const editValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

async function startRename() {
  menuOpen.value = false
  editValue.value = props.conv.title
  isEditing.value = true
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

function commitRename() {
  if (!isEditing.value) return
  isEditing.value = false
  const value = editValue.value.trim()
  if (value && value !== props.conv.title) emit('rename', value)
}

function cancelRename() {
  isEditing.value = false
}

function handleAction(fn: () => void) {
  menuOpen.value = false
  fn()
}
</script>

<template>
  <div class="relative">
    <div
      v-if="isEditing"
      class="flex w-full items-center gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2"
    >
      <MessageSquare :size="14" class="shrink-0 text-[var(--sp-text-faint)]" />
      <input
        ref="renameInput"
        v-model="editValue"
        class="w-full min-w-0 bg-transparent text-[13px] font-medium text-[var(--sp-text)] focus:outline-none"
        @keydown.enter="commitRename"
        @keydown.esc="cancelRename"
        @blur="commitRename"
        @click.stop
      />
    </div>

    <button
      v-else
      @click="emit('select')"
      :class="[
        'group relative flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
        active ? 'bg-[var(--sp-primary)]/[0.1] text-[var(--sp-text)]' : 'text-[var(--sp-text-dim)] hover:bg-white/[0.05] hover:text-[var(--sp-text)]',
      ]"
    >
      <MessageSquare :size="14" :class="['mt-[3px] shrink-0', active ? 'text-[var(--sp-primary)]' : 'text-[var(--sp-text-faint)]']" />
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-1.5">
          <span v-if="conv.unread" class="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sp-primary)]" />
          <span class="truncate text-[13px] font-medium leading-tight">{{ conv.title }}</span>
        </span>
        <span class="mt-0.5 block text-[10.5px] text-[var(--sp-text-faint)]">{{ relativeTime(conv.updatedAt) }}</span>
      </span>

      <span
        ref="menuBtn"
        role="button"
        tabindex="0"
        @click.stop="openMenu($event)"
        @keydown.enter.stop="openMenu($event)"
        :class="[
          'shrink-0 rounded-md p-1 transition-opacity hover:bg-white/10',
          menuOpen ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100',
        ]"
      >
        <MoreHorizontal :size="14" />
      </span>
    </button>

    <!-- Floating action menu — fixed-positioned so it always floats clear
         of the sidebar's own overflow-hidden scroll area, with real
         margin from the viewport edges instead of touching the rail. -->
    <Teleport to="body">
      <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" @contextmenu.prevent="menuOpen = false" />
      <div
        v-if="menuOpen"
        :style="{ top: `${anchor.top}px`, left: `${anchor.left}px`, width: `${MENU_WIDTH}px` }"
        class="fixed z-50 overflow-hidden rounded-xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 p-1 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      >
        <button
          @click="handleAction(() => emit('pin'))"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <Pin :size="14" :fill="conv.pinned ? 'currentColor' : 'none'" :class="conv.pinned && 'text-[var(--sp-primary)]'" />
          {{ conv.pinned ? 'Unstar' : 'Star' }}
        </button>
        <button
          @click="startRename"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <PenLine :size="14" />
          Rename
        </button>
        <button
          @click="handleAction(() => emit('toggleRead'))"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <component :is="conv.unread ? MailOpen : Mail" :size="14" />
          {{ conv.unread ? 'Mark as read' : 'Mark as unread' }}
        </button>
        <div class="my-1 h-px bg-[var(--sp-border)]" />
        <button
          @click="handleAction(() => emit('remove'))"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
        >
          <Trash2 :size="14" />
          Delete
        </button>
      </div>
    </Teleport>
  </div>
</template>

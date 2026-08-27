<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { PanelLeft, SquarePen, Share2, Check, ChevronDown, Pin, PenLine, MailOpen, Mail, Trash2 } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useChatStore } from '@/stores/chat'
import IconButton from '@/components/common/IconButton.vue'

const { t } = useI18n()
const ui = useUiStore()
const chat = useChatStore()
const shared = ref(false)

function share() {
  shared.value = true
  setTimeout(() => (shared.value = false), 1400)
}

// Title options menu — Teleported and positioned with real margin so it
// floats clear of the header/sidebar instead of hugging the edge, the
// same spacing Claude gives its own chat menu.
const MENU_WIDTH = 200
const menuOpen = ref(false)
const menuBtn = ref<HTMLElement | null>(null)
const anchor = ref({ top: 0, left: 0 })

function openMenu(e: MouseEvent) {
  const margin = 12
  // Anchor near the cursor that triggered the click rather than a fixed
  // offset from the button, so the menu opens where the user is looking.
  const left = Math.min(Math.max(e.clientX - 16, margin), window.innerWidth - MENU_WIDTH - margin)
  const top = Math.min(e.clientY + 10, window.innerHeight - margin)
  anchor.value = { top, left }
  menuOpen.value = true
}

const isEditing = ref(false)
const editValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

// Clicking the title itself renames it directly — no menu detour — while
// the chevron still opens the full set of options.
async function startRename() {
  if (!chat.active) return
  menuOpen.value = false
  editValue.value = chat.active.title
  isEditing.value = true
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

function commitRename() {
  if (!isEditing.value || !chat.active) return
  isEditing.value = false
  const value = editValue.value.trim()
  if (value && value !== chat.active.title) chat.renameConversation(chat.active.id, value)
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
  <header class="flex h-14 shrink-0 items-center gap-1 border-b border-[var(--sp-border)]/60 px-3">
    <IconButton :label="t('topbar.toggleSidebar')" @click="ui.toggleSidebar()" class="lg:hidden">
      <PanelLeft :size="18" />
    </IconButton>

    <div v-if="chat.active" class="flex min-w-0 items-center gap-0.5 pl-1">
      <div v-if="isEditing" class="flex items-center rounded-lg bg-white/[0.05] px-2.5 py-1.5">
        <input
          ref="renameInput"
          v-model="editValue"
          class="min-w-0 max-w-[280px] bg-transparent text-[14px] font-semibold text-[var(--sp-text)] focus:outline-none"
          @keydown.enter="commitRename"
          @keydown.esc="cancelRename"
          @blur="commitRename"
        />
      </div>
      <button
        v-else
        @click="startRename"
        v-tooltip="{ text: t('topbar.clickToRename'), placement: 'right' }"
        class="max-w-[320px] truncate rounded-lg px-2 py-1.5 text-left text-[14px] font-semibold text-[var(--sp-text)] transition-colors hover:bg-white/[0.06]"
      >
        {{ chat.active.title }}
      </button>
      <button
        ref="menuBtn"
        @click="openMenu($event)"
        v-tooltip="{ text: t('topbar.chatOptions'), placement: 'bottom' }"
        :class="[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
          menuOpen ? 'bg-white/[0.1] text-[var(--sp-text)]' : 'text-[var(--sp-text-faint)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
        ]"
      >
        <ChevronDown :size="14" />
      </button>
    </div>

    <div class="ml-auto flex items-center gap-1">
      <IconButton :label="shared ? t('topbar.linkCopied') : t('topbar.shareChat')" @click="share" v-if="chat.active">
        <Transition
          mode="out-in"
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-75"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="opacity-0 scale-75"
        >
          <Check v-if="shared" :size="16" key="check" class="text-emerald-400" />
          <Share2 v-else :size="16" key="share" />
        </Transition>
      </IconButton>
      <IconButton :label="t('topbar.newChat')" @click="chat.newConversation()">
        <SquarePen :size="17" />
      </IconButton>
    </div>

    <!-- Floating action menu — deliberately floats clear of the header
         rather than hugging its edge. -->
    <Teleport to="body">
      <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" @contextmenu.prevent="menuOpen = false" />
      <div
        v-if="menuOpen && chat.active"
        :style="{ top: `${anchor.top}px`, left: `${anchor.left}px`, width: `${MENU_WIDTH}px` }"
        class="fixed z-50 overflow-hidden rounded-xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 p-1 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      >
        <button
          @click="handleAction(() => chat.togglePin(chat.active!.id))"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <Pin :size="14" :fill="chat.active.pinned ? 'currentColor' : 'none'" :class="chat.active.pinned && 'text-[var(--sp-primary)]'" />
          {{ chat.active.pinned ? t('topbar.unstar') : t('topbar.star') }}
        </button>
        <button
          @click="startRename"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <PenLine :size="14" />
          {{ t('topbar.rename') }}
        </button>
        <button
          @click="handleAction(() => chat.toggleRead(chat.active!.id))"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <component :is="chat.active.unread ? MailOpen : Mail" :size="14" />
          {{ chat.active.unread ? t('topbar.markRead') : t('topbar.markUnread') }}
        </button>
        <div class="my-1 h-px bg-[var(--sp-border)]" />
        <button
          @click="handleAction(() => chat.deleteConversation(chat.active!.id))"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
        >
          <Trash2 :size="14" />
          {{ t('topbar.delete') }}
        </button>
      </div>
    </Teleport>
  </header>
</template>

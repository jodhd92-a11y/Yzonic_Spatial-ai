<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { SquarePen, Search, PanelLeft, Camera, Compass, PanelLeftClose, ListFilter, Check } from 'lucide-vue-next'
import { useChatStore } from '@/stores/chat'
import { useUiStore } from '@/stores/ui'
import { navigateHost, isEmbedded } from '@/composables/useBridge'
import { groupByDate } from '@/lib/utils'
import ConversationItem from './ConversationItem.vue'
import ProfileMenu from './ProfileMenu.vue'
import { onClickOutside } from '@vueuse/core'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{ showCloseButton?: boolean; collapsed?: boolean }>(),
  { collapsed: false },
)
const emit = defineEmits<{ navigate: [] }>()

const chat = useChatStore()
const ui = useUiStore()
const query = defineModel<string>('query', { default: '' })
const embedded = isEmbedded()

// Search is a click-to-reveal affordance in the expanded rail: hidden by
// default, opened via the header's search button (or the collapsed rail's
// icon, which expands the sidebar and opens search in one action).
const searchOpen = ref(false)
const searchInputEl = ref<HTMLInputElement | null>(null)

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInputEl.value?.focus()
  } else {
    query.value = ''
  }
}

async function expandAndSearch() {
  ui.toggleCollapsed()
  searchOpen.value = true
  await nextTick()
  searchInputEl.value?.focus()
}

const crossAppNav = computed(() => [
  { id: 'camera', label: t('sidebar.camera'), icon: Camera },
  { id: 'explore', label: t('sidebar.explore'), icon: Compass },
])

function goTo(page: string) {
  navigateHost(page)
  emit('navigate')
}

const filtered = computed(() =>
  chat.sortedConversations.filter((c) => c.title.toLowerCase().includes(query.value.toLowerCase())),
)
const pinned = computed(() => filtered.value.filter((c) => c.pinned))

// Group-by filter — same "Date" vs "None" choice Claude offers in its own
// sidebar, persisted in the ui store so it sticks across sessions.
const groupOptions = computed<{ id: 'date' | 'none'; label: string }[]>(() => [
  { id: 'date', label: t('sidebar.date') },
  { id: 'none', label: t('sidebar.none') },
])
const groupMenuOpen = ref(false)
const groupMenuRoot = ref<HTMLElement | null>(null)
onClickOutside(groupMenuRoot, () => (groupMenuOpen.value = false))

const unpinnedGroups = computed(() => {
  const items = filtered.value.filter((c) => !c.pinned)
  if (ui.chatGroupMode === 'none') return items.length ? [{ label: '', items }] : []
  return groupByDate(items)
})

function select(id: string) {
  chat.selectConversation(id)
  emit('navigate')
}

function startNew() {
  chat.newConversation()
  emit('navigate')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div :class="['flex h-[60px] shrink-0 items-center', props.collapsed ? 'justify-center px-2' : 'px-4']">
      <span
        v-if="!props.collapsed"
        class="text-[21px] font-bold tracking-tight text-[var(--sp-text)]"
        style="font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em"
      >Ravo Chat</span>

      <!-- Desktop rail: collapse/expand lives in the header now, top-right
           when expanded; when collapsed it takes over the wordmark's spot
           instead of stacking below it. Search and the group-by filter sit
           immediately to its left once expanded. -->
      <div v-if="!props.showCloseButton" :class="['flex items-center gap-1', !props.collapsed && 'ml-auto']">
        <button
          v-if="!props.collapsed"
          @click="toggleSearch"
          v-tooltip="{ text: t('sidebar.searchChats'), placement: 'bottom' }"
          :class="[
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
            searchOpen ? 'bg-white/[0.1] text-[var(--sp-text)]' : 'text-[var(--sp-text-dim)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
          ]"
        >
          <Search :size="15" />
        </button>
        <button
          @click="ui.toggleCollapsed()"
          v-tooltip="{ text: props.collapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar'), placement: props.collapsed ? 'right' : 'bottom' }"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]"
        >
          <PanelLeftClose :size="16" :class="['transition-transform duration-300', props.collapsed && 'rotate-180']" />
        </button>
      </div>

      <!-- Mobile drawer close button -->
      <button
        v-if="props.showCloseButton"
        @click="ui.closeSidebar()"
        class="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sp-text-dim)] hover:bg-white/[0.06] lg:hidden"
      >
        <PanelLeft :size="16" />
      </button>
    </div>

    <!-- Search — sits above New chat so the revealed input/field doesn't
         push the primary action or the Products/Chats sections around. -->
    <div v-if="!props.collapsed && searchOpen" class="shrink-0 px-3 pt-2 pb-2">
      <div class="flex items-center gap-2 rounded-lg border border-[var(--sp-border)] bg-white/[0.02] px-2.5 py-1.5 focus-within:border-[var(--sp-border-hover)]">
        <Search :size="13" class="shrink-0 text-[var(--sp-text-faint)]" />
        <input
          ref="searchInputEl"
          v-model="query"
          :placeholder="t('sidebar.searchChats')"
          class="w-full bg-transparent text-[12.5px] text-[var(--sp-text)] placeholder:text-[var(--sp-text-faint)] focus:outline-none"
          @keydown.escape="toggleSearch"
        />
      </div>
    </div>
    <div v-else-if="props.collapsed" class="shrink-0 px-2 pt-2 pb-2">
      <button
        v-tooltip="{ text: t('sidebar.searchChats'), placement: 'right' }"
        class="flex w-full items-center justify-center rounded-lg py-2 text-[var(--sp-text-faint)] transition-colors hover:bg-white/[0.05] hover:text-[var(--sp-text)]"
        @click="expandAndSearch"
      >
        <Search :size="15" />
      </button>
    </div>

    <!-- New chat — the primary action. Cross-app shortcuts (Camera /
         Explore) follow underneath their own "Products" separator instead
         of crowding the top of the rail. -->
    <div :class="['shrink-0 pb-3', props.collapsed || searchOpen ? '' : 'pt-2', props.collapsed ? 'px-2' : 'px-3']">
      <button
        @click="startNew"
        v-tooltip="props.collapsed ? { text: t('sidebar.newChat'), placement: 'right' } : ''"
        :class="[
          'flex w-full items-center rounded-xl border border-[var(--sp-border)] bg-white/[0.03] text-[13.5px] font-medium text-[var(--sp-text)] transition-colors hover:border-[var(--sp-primary)]/40 hover:bg-white/[0.05]',
          props.collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
        ]"
      >
        <SquarePen :size="15" />
        <span v-if="!props.collapsed">{{ t('sidebar.newChat') }}</span>
      </button>
    </div>

    <div v-if="embedded" :class="['shrink-0', props.collapsed ? 'px-2' : 'px-3']">
      <div v-if="!props.collapsed" class="my-2.5 flex items-center gap-2">
        <span class="h-px flex-1 bg-[var(--sp-border)]" />
        <span class="text-[10px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">{{ t('sidebar.products') }}</span>
        <span class="h-px flex-1 bg-[var(--sp-border)]" />
      </div>
      <div v-else class="my-2.5 h-px bg-[var(--sp-border)]" />
    </div>

    <div v-if="embedded" :class="['shrink-0 pb-2.5', props.collapsed ? 'px-2' : 'px-3']">
      <button
        v-for="item in crossAppNav"
        :key="item.id"
        @click="goTo(item.id)"
        v-tooltip="{ text: `${item.label} (⌘${item.id === 'camera' ? '1' : '2'})`, placement: props.collapsed ? 'right' : 'bottom' }"
        :class="[
          'mb-1 flex w-full items-center rounded-lg text-[13px] font-medium text-[var(--sp-text-dim)] transition-colors hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
          props.collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
        ]"
      >
        <component :is="item.icon" :size="16" />
        <span v-if="!props.collapsed">{{ item.label }}</span>
      </button>
    </div>

    <!-- Divider between Products and the Chats list below. -->
    <div v-if="embedded" :class="['shrink-0 pb-2', props.collapsed ? 'px-2' : 'px-3']">
      <div class="h-px bg-[var(--sp-border)]" />
    </div>

    <div v-if="props.collapsed" class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      <button
        v-for="c in filtered.slice(0, 12)"
        :key="c.id"
        v-tooltip="{ text: c.title, placement: 'right' }"
        @click="select(c.id)"
        :class="[
          'mb-1 flex w-full items-center justify-center rounded-lg py-2 transition-colors',
          chat.activeId === c.id ? 'bg-[var(--sp-primary)]/[0.14] text-[var(--sp-primary)]' : 'text-[var(--sp-text-faint)] hover:bg-white/[0.05] hover:text-[var(--sp-text)]',
        ]"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-current" />
      </button>
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      <div class="mb-1 flex items-center justify-between px-3 pb-1 pt-2">
        <p class="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">{{ t('sidebar.chats') }}</p>
        <div ref="groupMenuRoot" class="relative">
          <button
            @click="groupMenuOpen = !groupMenuOpen"
            v-tooltip="t('sidebar.groupBy')"
            :class="[
              'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
              groupMenuOpen ? 'bg-white/[0.1] text-[var(--sp-text)]' : 'text-[var(--sp-text-faint)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
            ]"
          >
            <ListFilter :size="13" />
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="groupMenuOpen"
              class="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)]/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            >
              <p class="px-3 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">{{ t('sidebar.groupBy') }}</p>
              <button
                v-for="opt in groupOptions"
                :key="opt.id"
                @click="ui.setChatGroupMode(opt.id); groupMenuOpen = false"
                class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span class="flex-1 text-[13px] font-medium text-[var(--sp-text)]">{{ opt.label }}</span>
                <Check v-if="ui.chatGroupMode === opt.id" :size="14" class="shrink-0 text-[var(--sp-primary)]" />
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <p v-if="!filtered.length && query" class="px-3 py-6 text-center text-[12px] text-[var(--sp-text-faint)]">{{ t('sidebar.noChatsFound') }}</p>
      <p v-else-if="!filtered.length" class="px-3 py-6 text-center text-[12px] text-[var(--sp-text-faint)]">{{ t('sidebar.noChatsYet') }}</p>

      <div v-if="pinned.length" class="mb-1">
        <p class="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">{{ t('sidebar.pinned') }}</p>
        <ConversationItem
          v-for="c in pinned"
          :key="c.id"
          :conv="c"
          :active="chat.activeId === c.id"
          @select="select(c.id)"
          @pin="chat.togglePin(c.id)"
          @remove="chat.deleteConversation(c.id)"
          @rename="(title) => chat.renameConversation(c.id, title)"
          @toggle-read="chat.toggleRead(c.id)"
        />
      </div>

      <div v-for="group in unpinnedGroups" :key="group.label || 'flat'" class="mb-1">
        <p v-if="group.label" class="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">{{ group.label }}</p>
        <ConversationItem
          v-for="c in group.items"
          :key="c.id"
          :conv="c"
          :active="chat.activeId === c.id"
          @select="select(c.id)"
          @pin="chat.togglePin(c.id)"
          @remove="chat.deleteConversation(c.id)"
          @rename="(title) => chat.renameConversation(c.id, title)"
          @toggle-read="chat.toggleRead(c.id)"
        />
      </div>
    </div>

    <ProfileMenu :collapsed="props.collapsed" />
  </div>
</template>

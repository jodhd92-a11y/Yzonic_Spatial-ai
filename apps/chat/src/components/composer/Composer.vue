<script setup lang="ts">
import { ref, computed, nextTick, provide, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowUp, Plus, Square, X, Globe, Telescope, FileText,
  Image as ImageIcon, Check, ChevronRight, AudioLines, Pill, Stethoscope,
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useChatStore, EFFORT_LEVELS } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useAutoResizeTextarea } from '@/composables/useAutoResizeTextarea'
import { isMobileViewport, anchorMobileSheet } from '@/composables/useComposerMobileSheet'
import { formatBytes, uid } from '@/lib/utils'
import DoodleLogo from '@/components/common/DoodleLogo.vue'
import ModelPicker from '@/components/composer/ModelPicker.vue'
import MicRecorder from '@/components/composer/MicRecorder.vue'

const props = withDefaults(defineProps<{ centered?: boolean }>(), { centered: false })

const { t, tm } = useI18n()
const chat = useChatStore()
const userStore = useUserStore()
const settings = useSettingsStore()

const heading = computed(() =>
  userStore.firstName ? `${userStore.greeting}, ${userStore.firstName}` : t('composer.heading'),
)

// Random placeholder rotation is only for the empty/centered composer
// (no conversation yet) — one is picked per mount of that screen, the
// way Claude/Kimi vary their opening-state placeholder. The moment a
// conversation exists, this component is mounted without `centered`
// (see ChatView.vue), and always shows the plain, constant "Write a
// message…" text instead — never the rotating lines.
const placeholderLines = computed(() => tm('composer.placeholders') as string[])
const placeholderIndex = ref(0)
function rollPlaceholder() {
  const lines = placeholderLines.value
  placeholderIndex.value = lines.length ? Math.floor(Math.random() * lines.length) : 0
}
if (props.centered) rollPlaceholder()
// Re-roll if the language changes mid-session so the line shown is
// always one that actually exists in the newly selected locale.
watch(() => settings.language, () => { if (props.centered) rollPlaceholder() })

const placeholder = computed(() => {
  const base = props.centered
    ? (placeholderLines.value[placeholderIndex.value] ?? t('composer.writeMessage'))
    : t('composer.writeMessage')
  return settings.sendKey === 'mod-enter' ? `${base}${t('composer.sendHint')}` : base
})

const text = ref('')
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)
useAutoResizeTextarea(textareaEl, text)

interface Attachment { id: string; name: string; size: number; kind: 'image' | 'file'; previewUrl?: string; status: 'uploading' | 'done' }
const attachments = ref<Attachment[]>([])
const isDraggingOver = ref(false)

const attachmentsUploading = computed(() => attachments.value.some((a) => a.status === 'uploading'))
const canSend = computed(() => text.value.trim().length > 0 && !chat.isStreaming && !attachmentsUploading.value)
const charCount = computed(() => text.value.length)
const nearLimit = computed(() => charCount.value > 6000)
const currentEffortLabel = computed(() => EFFORT_LEVELS.find((e) => e.id === chat.reasoningEffort)?.label ?? '')

// "+" menu — attach files and toggle capabilities, consolidated into one
// entry point the way Claude's composer does, instead of a permanent row
// of pills competing for space.
type Capability = 'web' | 'research' | 'docs'
// Single-select: only one tool can be active at a time, the way Claude's
// own composer restricts Web Search / Research / etc. to one active mode
// rather than letting them all be toggled on simultaneously.
const activeCapability = ref<Capability | null>(null)
const capabilityOptions: { id: Capability; label: string; hint: string; icon: typeof Globe }[] = [
  { id: 'web', label: 'Medical Literature', hint: 'Search PubMed, guidelines & the live web for evidence', icon: Globe },
  { id: 'research', label: 'Deep Research', hint: 'Slower, multi-step literature review', icon: Telescope },
  { id: 'docs', label: 'Case Files', hint: 'Pull in your connected patient/case documents', icon: FileText },
]
function toggleCapability(id: Capability) {
  activeCapability.value = activeCapability.value === id ? null : id
  menuOpen.value = false
}
function activeCapabilityMeta(id: Capability) {
  return capabilityOptions.find((c) => c.id === id)!
}

const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const menuPanel = ref<HTMLElement | null>(null)
const composerBox = ref<HTMLElement | null>(null)
provide('composerBoxEl', composerBox)
const menuMobile = ref(false)
const menuMobileStyle = ref<{ side: 'above' | 'below'; top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({ side: 'below', top: 0, left: 0, width: 0, maxHeight: 320 })
// Desktop: which side of the *whole composer box* the panel opens on —
// 'left' opens just past the composer's left edge (the default, since
// the "+" button itself sits at the composer's bottom-left), flipping to
// 'right' only if there isn't room on the left.
const menuSide = ref<'left' | 'right'>('left')
const MENU_WIDTH = 256

// The panel is a normal `absolute` child anchored to the composer box
// itself (not the small "+" button), exactly like ModelPicker's flyouts,
// instead of a `fixed` element whose coordinates were snapshotted once in
// JS. Anchoring it in the DOM against the composer box means it tracks
// the box through any layout it's already in — nothing to recompute, and
// nothing that can drift out of sync and "flicker" when the composer's
// own layout shifts (e.g. an active-tool chip appearing above it).
// Mobile still gets the shared bottom sheet, which genuinely does need a
// one-off measurement since it's teleported clear of the composer.
function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) return
  menuMobile.value = isMobileViewport()
  if (menuMobile.value) {
    menuMobileStyle.value = anchorMobileSheet(composerBox.value)
    return
  }
  const boxRect = composerBox.value?.getBoundingClientRect()
  if (!boxRect) return
  const margin = 12
  menuSide.value = boxRect.left - MENU_WIDTH - margin >= 0 ? 'left' : 'right'
}

// Clicking outside closes it — same mechanism ModelPicker/MicRecorder use,
// with the panel itself excluded so taps inside it (which live outside
// menuRoot once teleported on mobile) don't self-close the menu.
onClickOutside(menuRoot, () => { menuOpen.value = false }, { ignore: [menuPanel] })

// Voice entry points, shown in place of the send button while the
// composer is empty — same swap Claude's own composer does. MicRecorder
// owns tap-to-dictate vs hold-to-record itself; it hands a (simulated)
// transcript back here to drop into the textarea for review.
async function onVoiceTranscript(value: string) {
  text.value = text.value ? `${text.value} ${value}` : value
  await nextTick()
  textareaEl.value?.focus()
  const len = text.value.length
  textareaEl.value?.setSelectionRange(len, len)
}

function openFilePicker() {
  menuOpen.value = false
  fileInputEl.value?.click()
}

const suggestions = [
  { label: 'Interpret lab results', prompt: 'Help me interpret these lab results: ', icon: FileText },
  { label: 'Check drug interactions', prompt: 'Check for interactions between these medications: ', icon: Pill },
  { label: 'Review a differential', prompt: 'Help me think through the differential diagnosis for ', icon: Stethoscope },
  { label: 'Summarize the literature', prompt: 'Summarize the current clinical literature on ', icon: Telescope },
]

async function useSuggestion(prompt: string) {
  text.value = prompt
  await nextTick()
  textareaEl.value?.focus()
  const len = text.value.length
  textareaEl.value?.setSelectionRange(len, len)
}

async function submit() {
  if (!canSend.value) return
  const value = text.value
  const outgoing = attachments.value.map((a) => ({
    id: a.id,
    name: a.name,
    size: a.size,
    type: a.kind,
    previewUrl: a.previewUrl,
  }))
  text.value = ''
  attachments.value = []
  await chat.sendMessage(value, outgoing.length ? outgoing : undefined)
}

function onKeydown(e: KeyboardEvent) {
  const wantsModEnter = settings.sendKey === 'mod-enter'
  const modPressed = e.metaKey || e.ctrlKey
  if (e.key === 'Enter' && !e.shiftKey) {
    if (wantsModEnter && !modPressed) return // let it insert a newline
    e.preventDefault()
    submit()
  }
}

function addFiles(files: FileList | File[]) {
  for (const f of Array.from(files)) {
    const isImage = f.type.startsWith('image/')
    const id = uid('a')
    attachments.value.push({
      id,
      name: f.name,
      size: f.size,
      kind: isImage ? 'image' : 'file',
      previewUrl: isImage ? URL.createObjectURL(f) : undefined,
      status: 'uploading',
    })
    // Simulated upload — a beat proportional to file size, same idea as
    // Claude's own composer showing a brief loading spinner on a newly
    // attached file/photo before it settles into its normal chip.
    const delay = 450 + Math.min(f.size / 4000, 700) + Math.random() * 250
    setTimeout(() => {
      const att = attachments.value.find((x) => x.id === id)
      if (att) att.status = 'done'
    }, delay)
  }
}

function onFilePick(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) addFiles(files)
  ;(e.target as HTMLInputElement).value = ''
}

function onDrop(e: DragEvent) {
  isDraggingOver.value = false
  const files = e.dataTransfer?.files
  if (files?.length) addFiles(files)
}

function removeAttachment(id: string) {
  const a = attachments.value.find((x) => x.id === id)
  if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl)
  attachments.value = attachments.value.filter((x) => x.id !== id)
}
</script>

<template>
  <div
    v-motion
    :initial="{ opacity: 0, y: 16 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 320, ease: 'easeOut' } }"
    class="w-full"
    @dragover.prevent="isDraggingOver = true"
    @dragleave.self="isDraggingOver = false"
    @drop.prevent="onDrop"
  >
    <div v-if="props.centered" class="mb-5 flex flex-col items-center text-center">
      <DoodleLogo :size="52" :interactive="false" class="mb-3" />
      <h1 class="text-[26px] font-semibold tracking-tight text-[var(--sp-text)]">{{ heading }}</h1>
    </div>

    <input ref="fileInputEl" type="file" multiple class="hidden" @change="onFilePick" />

    <!-- Active capability chip — only one tool can be active at once, so
         this is a single chip rather than a row of independently-toggled
         pills. Clicking it (or picking a different tool from the + menu)
         clears it. -->
    <div v-if="activeCapability" class="mb-2 flex flex-wrap gap-1.5">
      <!-- mode="out-in" so switching from one tool to another fully removes
           the old chip before the new one mounts — with TransitionGroup
           (no mode) both chips briefly overlapped mid-swap, which read as
           a flicker. -->
      <Transition
        mode="out-in"
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-90"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-90"
      >
        <button
          :key="activeCapability"
          @click="toggleCapability(activeCapability)"
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-black transition-transform hover:scale-[1.03]"
          style="background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent))"
        >
          <component :is="activeCapabilityMeta(activeCapability).icon" :size="12" />
          {{ activeCapabilityMeta(activeCapability).label }}
          <X :size="11" />
        </button>
      </Transition>
    </div>

    <div
      ref="composerBox"
      class="group relative rounded-[26px] border bg-[var(--sp-bg-1)]/80 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors focus-within:border-[var(--sp-primary)]/50"
      :class="isDraggingOver ? 'border-[var(--sp-primary)] bg-[var(--sp-primary)]/[0.06]' : 'border-[var(--sp-border)]'"
    >
      <div
        v-if="isDraggingOver"
        class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[26px] border-2 border-dashed border-[var(--sp-primary)]/60 bg-[var(--sp-bg-1)]/90 text-[13px] font-medium text-[var(--sp-primary)]"
      >
        <ImageIcon :size="15" class="mr-2" /> Drop files to attach
      </div>

      <TransitionGroup
        v-if="attachments.length"
        tag="div"
        class="flex flex-wrap gap-2 px-4 pt-3.5"
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-90"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-90"
      >
        <div
          v-for="a in attachments"
          :key="a.id"
          class="group/att relative flex items-center gap-2 overflow-hidden rounded-xl border border-[var(--sp-border)] bg-white/[0.04] py-1.5 pl-2 pr-2 text-[12px] text-[var(--sp-text-dim)]"
        >
          <span class="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg">
            <img
              v-if="a.kind === 'image'"
              :src="a.previewUrl"
              class="h-7 w-7 rounded-lg object-cover"
              alt=""
            />
            <span
              v-else
              class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05]"
            ><FileText :size="13" /></span>
            <!-- Shimmering sweep over the whole thumbnail while uploading —
                 same skeleton-style loading affordance Claude's own composer
                 uses on a freshly attached file, instead of a spinner. -->
            <span v-if="a.status === 'uploading'" class="sp-shimmer absolute inset-0" />
          </span>
          <span class="max-w-[130px] truncate">{{ a.name }}</span>
          <span class="text-[var(--sp-text-faint)]">{{ formatBytes(a.size) }}</span>
          <button @click="removeAttachment(a.id)" class="rounded-full p-0.5 hover:bg-white/10">
            <X :size="11" />
          </button>
          <!-- Shimmering sweep across the whole chip while uploading. -->
          <span v-if="a.status === 'uploading'" class="sp-shimmer pointer-events-none absolute inset-0" />
        </div>
      </TransitionGroup>

      <textarea
        ref="textareaEl"
        v-model="text"
        rows="1"
        :placeholder="placeholder"
        class="max-h-[200px] w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[calc(14.5px*var(--sp-font-scale))] leading-relaxed text-[var(--sp-text)] placeholder:text-[var(--sp-text-faint)] focus:outline-none"
        @keydown="onKeydown"
      />

      <div class="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
        <div class="flex items-center gap-1.5">
          <!-- "+" menu: attach files + capability toggles. Desktop: a
               proper dropdown anchored directly above its own trigger
               (flips left/right only to stay on-screen). Mobile: shared
               bottom sheet below the whole composer. -->
          <div ref="menuRoot" class="relative">
            <button
              @click="toggleMenu"
              v-tooltip="'Add files or tools'"
              :class="[
                'relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150',
                menuOpen ? 'bg-white/[0.1] text-[var(--sp-text)]' : 'text-[var(--sp-text-dim)] hover:bg-white/[0.06] hover:text-[var(--sp-text)]',
              ]"
            >
              <Plus :size="18" :class="['transition-transform duration-200', menuOpen && 'rotate-45']" />
              <span
                v-if="activeCapability"
                class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--sp-bg-1)]"
                style="background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent))"
              />
            </button>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <span v-if="nearLimit" class="mr-1 text-[10.5px] tabular-nums text-amber-400">{{ charCount }}</span>

          <!-- Model + reasoning-effort selector, same spot Claude anchors
               it in its own composer footer. The effort level itself is
               chosen from inside the model picker's flyout — this is just
               a read-only indicator of what's currently selected. -->
          <ModelPicker />
          <span
            v-if="currentEffortLabel"
            class="pointer-events-none select-none rounded-md px-1.5 py-1 text-[11.5px] font-medium text-[var(--sp-text-faint)]"
          >{{ currentEffortLabel }}</span>

          <span class="mx-1 h-4 w-px shrink-0 bg-[var(--sp-border)]" />

          <button
            v-if="chat.isStreaming"
            @click="chat.stopGenerating()"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-[var(--sp-text)] transition-colors hover:bg-white/[0.14]"
            aria-label="Stop generating"
          >
            <Square :size="13" fill="currentColor" />
          </button>

          <!-- There's text (or attachments) ready to go, but an upload is
               still finishing — a disabled, spinning send button, same
               idea as Claude's composer holding the send action until
               attachments settle rather than letting it fire early. -->
          <button
            v-if="attachmentsUploading && (text.trim().length > 0 || attachments.length)"
            v-tooltip="'Waiting for upload to finish'"
            disabled
            aria-label="Waiting for upload to finish"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-[var(--sp-text-faint)]"
          >
            <span
              v-motion
              :initial="{ rotate: 0 }"
              :enter="{ rotate: 360, transition: { duration: 700, repeat: Infinity, ease: 'linear' } }"
              class="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-[var(--sp-text-dim)]"
            />
          </button>

          <!-- Empty composer: offer voice entry points instead of a dead
               send button, swapping to the send arrow the moment there's
               text to send. MicRecorder owns tap-to-dictate vs
               hold-to-record + its own submenu/animations. -->
          <template v-else-if="!canSend">
            <MicRecorder @insert-text="onVoiceTranscript" />
            <button
              v-tooltip="'Voice mode'"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] text-black shadow-[0_0_16px_rgba(var(--sp-primary-rgb),0.4)]"
            >
              <AudioLines :size="17" />
            </button>
          </template>

          <button
            v-else
            :disabled="!canSend"
            @click="submit"
            aria-label="Send message"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sp-primary)] to-[var(--sp-accent)] text-black shadow-[0_0_16px_rgba(var(--sp-primary-rgb),0.4)] transition-shadow duration-150"
          >
            <ArrowUp :size="17" stroke-width="2.5" />
          </button>
        </div>
      </div>

      <!-- + menu panel: on mobile it's the shared bottom sheet (teleported
           to <body>); on desktop it's anchored directly to this composer
           box (not the small "+" button) so it opens beside the *whole*
           compositor rather than dropping down under one control. Anchored
           from `bottom-0` (its own bottom edge pinned to the trigger's),
           not `top-0` — the composer docks at the bottom of the screen
           once inside a chat, so a panel growing downward from a button
           that's already near the viewport's bottom edge has nowhere to
           go. Growing upward instead always has the rest of the screen
           to work with. Same anchor the effort flyout below already uses. -->
      <Teleport to="body" :disabled="!menuMobile">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          :enter-from-class="menuMobile && menuMobileStyle.side === 'above' ? 'opacity-0 scale-95 -translate-y-1' : 'opacity-0 scale-95 translate-y-1'"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="menuOpen"
            ref="menuPanel"
            :style="menuMobile
              ? {
                  ...(menuMobileStyle.side === 'above' ? { bottom: `${menuMobileStyle.bottom}px` } : { top: `${menuMobileStyle.top}px` }),
                  left: `${menuMobileStyle.left}px`,
                  width: `${menuMobileStyle.width}px`,
                  maxHeight: `${menuMobileStyle.maxHeight}px`,
                }
              : {}"
            :class="[
              'sp-composer-menu overflow-hidden rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-2)] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.45)]',
              menuMobile
                ? 'fixed z-50 overflow-y-auto'
                : ['absolute z-30 bottom-0 w-64', menuSide === 'right' ? 'left-full ml-3' : 'right-full mr-3'],
            ]"
          >
            <button
              @click="openFilePicker"
              class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <ImageIcon :size="14" class="text-[var(--sp-text-dim)]" />
              </span>
              <span class="text-[13px] font-medium text-[var(--sp-text)]">Add photos &amp; files</span>
              <ChevronRight :size="13" class="ml-auto text-[var(--sp-text-faint)]" />
            </button>

            <div class="my-1 h-px bg-[var(--sp-border)]" />
            <p class="px-3 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sp-text-faint)]">Tools</p>

            <div role="radiogroup" aria-label="Tools (choose one)">
            <button
              v-for="cap in capabilityOptions"
              :key="cap.id"
              role="radio"
              :aria-checked="activeCapability === cap.id"
              @click="toggleCapability(cap.id)"
              class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <component :is="cap.icon" :size="14" class="text-[var(--sp-text-dim)]" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[13px] font-medium text-[var(--sp-text)]">{{ cap.label }}</span>
                <span class="block truncate text-[11px] text-[var(--sp-text-faint)]">{{ cap.hint }}</span>
              </span>
              <span
                :class="[
                  'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
                  activeCapability === cap.id ? 'border-transparent' : 'border-[var(--sp-border-hover)]',
                ]"
                :style="activeCapability === cap.id ? { background: 'linear-gradient(135deg, var(--sp-primary), var(--sp-accent))' } : undefined"
              >
                <Check v-if="activeCapability === cap.id" :size="11" class="text-black" stroke-width="3" />
              </span>
            </button>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>

    <p v-if="!props.centered" class="mt-2 text-center text-[10.5px] text-[var(--sp-text-faint)]">
      AI can make mistakes. Verify important information.
    </p>

    <!-- Suggestion cards, greeting screen only -->
    <div v-if="props.centered" class="mt-4 flex flex-wrap justify-center gap-2">
      <button
        v-for="(s, i) in suggestions"
        :key="s.label"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 260, delay: 80 + i * 60, ease: 'easeOut' } }"
        @click="useSuggestion(s.prompt)"
        class="flex items-center gap-2 rounded-full border border-[var(--sp-border)] bg-white/[0.02] px-3.5 py-2 text-[12.5px] font-medium text-[var(--sp-text-dim)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--sp-primary)]/40 hover:bg-white/[0.05] hover:text-[var(--sp-text)]"
      >
        <component :is="s.icon" :size="14" class="text-[var(--sp-primary)]" />
        {{ s.label }}
      </button>
    </div>
  </div>
</template>

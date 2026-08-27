import { defineStore } from 'pinia'
import type { Attachment, ChatMessage, ChatModel, Conversation } from '@/types/chat'
import { uid, titleFromPrompt } from '@/lib/utils'
import { streamCompletion } from '@/composables/useSSEChat'

export const MODELS: ChatModel[] = [
  { id: 'nexus-1', name: 'Nexus 1.0', vendor: 'Nexus', description: 'Balanced — fast & capable', contextWindow: '128K' },
  { id: 'nexus-1-mini', name: 'Nexus 1.0 Mini', vendor: 'Nexus', description: 'Fastest, lightweight tasks', contextWindow: '32K' },
  { id: 'nexus-1-reasoning', name: 'Nexus 1.0 Reasoning', vendor: 'Nexus', description: 'Deeper multi-step thinking', contextWindow: '128K' },
]

/** How hard the model should think before answering — surfaced next to the
 * model picker in the composer, the same spot Claude puts its own effort
 * control. */
export const EFFORT_LEVELS = [
  { id: 'fast', label: 'Fast', description: 'Quick, lighter-weight replies' },
  { id: 'medium', label: 'Medium', description: 'Balanced speed and depth' },
  { id: 'thorough', label: 'Thorough', description: 'Slower, more deliberate reasoning' },
] as const
export type EffortId = (typeof EFFORT_LEVELS)[number]['id']

interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  selectedModelId: string
  reasoningEffort: EffortId
  pendingAbort: AbortController | null
  /** Flips true once conversations have been hydrated from storage. Starts
   * false so the sidebar/chat area can show a skeleton for that first
   * frame instead of an empty flash — and so swapping `readStored()` for a
   * real async fetch later doesn't require touching any component. */
  hydrated: boolean
}

const STORAGE_KEY = 'sp-chat-conversations'

interface StoredChatState {
  conversations: Conversation[]
  activeId: string | null
}

function readStored(): StoredChatState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { conversations: [], activeId: null }
    const parsed = JSON.parse(raw)
    const conversations: Conversation[] = Array.isArray(parsed.conversations) ? parsed.conversations : []
    // One-time cleanup for anyone with old data from before "New chat"
    // stopped persisting a placeholder immediately — drops any leftover
    // blank, never-used conversations so they don't linger in the sidebar.
    const cleaned = conversations.filter((c) => c.messages.length > 0)
    const activeId = parsed.activeId ?? null
    return {
      conversations: cleaned,
      activeId: cleaned.some((c) => c.id === activeId) ? activeId : null,
    }
  } catch {
    return { conversations: [], activeId: null }
  }
}

function persist(state: Pick<ChatState, 'conversations' | 'activeId'>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversations: state.conversations, activeId: state.activeId }),
    )
  } catch {
    /* private-browsing / disabled storage — chats just won't persist */
  }
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    ...readStored(),
    selectedModelId: MODELS[0].id,
    reasoningEffort: 'medium',
    pendingAbort: null,
    hydrated: false,
  }),

  getters: {
    active(state): Conversation | null {
      return state.conversations.find((c) => c.id === state.activeId) ?? null
    },
    isStreaming(state): boolean {
      const conv = state.conversations.find((c) => c.id === state.activeId)
      return !!conv?.messages.at(-1)?.streaming
    },
    sortedConversations(state): Conversation[] {
      return [...state.conversations].sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
        return b.updatedAt - a.updatedAt
      })
    },
  },

  actions: {
    /** Called once at startup: persists conversations/activeId to
     * localStorage on every change (new messages, streaming tokens,
     * renames, deletes, etc.) so chat history is real and durable instead
     * of resetting to mock data on every reload. */
    init() {
      this.$subscribe((_mutation, state) => persist(state), { deep: true })
      // Boot skeleton runs for a fixed, deliberate 2.7s before the real
      // shell swaps in — see AppSkeleton.vue, which mirrors the real
      // sidebar/topbar/composer layout exactly so this reveal never
      // causes a layout jump.
      setTimeout(() => { this.hydrated = true }, 2700)
    },

    /** "New chat" (topbar button, sidebar button, ⌘/Ctrl+Shift+O, or
     * navigating to bare /chat): just clears the active conversation so
     * the empty/centered composer shows — exactly what Claude and Kimi do.
     * It deliberately does NOT create or persist a conversation yet. A
     * conversation only becomes real (and appears in the sidebar) once
     * the first message is actually sent, via createConversation() below.
     * That's what stops repeated "New chat" clicks from littering the
     * sidebar with blank, never-used placeholder entries — the previous
     * version created one immediately, and since it only ever reused *the
     * currently active* blank chat, navigating away and clicking "New
     * chat" again left the old blank one behind and created another. */
    newConversation() {
      this.activeId = null
    },

    /** Actually creates and persists a new conversation, and makes it
     * active. Called from sendMessage() the moment there's no active
     * conversation to send into — i.e. the first message of a fresh
     * chat — not from the "New chat" button itself. */
    createConversation() {
      const conv: Conversation = {
        id: uid('c'),
        title: 'New chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      }
      this.conversations.unshift(conv)
      this.activeId = conv.id
      return conv.id
    },

    selectConversation(id: string) {
      this.activeId = id
      const conv = this.conversations.find((c) => c.id === id)
      if (conv) conv.unread = false
    },

    deleteConversation(id: string) {
      this.conversations = this.conversations.filter((c) => c.id !== id)
      if (this.activeId === id) this.activeId = null
    },

    togglePin(id: string) {
      const conv = this.conversations.find((c) => c.id === id)
      if (conv) conv.pinned = !conv.pinned
    },

    renameConversation(id: string, title: string) {
      const conv = this.conversations.find((c) => c.id === id)
      const trimmed = title.trim()
      if (conv && trimmed) conv.title = trimmed
    },

    toggleRead(id: string) {
      const conv = this.conversations.find((c) => c.id === id)
      if (conv) conv.unread = !conv.unread
    },

    async sendMessage(text: string, attachments?: Attachment[]) {
      if (!text.trim()) return
      if (!this.activeId) this.createConversation()
      const conv = this.active!

      const userMsg: ChatMessage = {
        id: uid('m'),
        role: 'user',
        content: text,
        createdAt: Date.now(),
        attachments: attachments?.length ? attachments : undefined,
      }
      conv.messages.push(userMsg)
      if (conv.messages.filter((m) => m.role === 'user').length === 1) {
        conv.title = titleFromPrompt(text)
      }
      conv.updatedAt = Date.now()

      await this.runAssistantTurn(conv)
    },

    /** Shared by sendMessage / editMessage / regenerate: appends a fresh
     * streaming assistant reply for whatever the conversation's messages
     * currently look like. */
    async runAssistantTurn(conv: Conversation) {
      conv.messages.push({
        id: uid('m'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        streaming: true,
      })
      // Re-read the message back out of the (reactive) messages array instead
      // of holding on to the plain object literal we just pushed. Pinia/Vue
      // only tracks and re-renders on writes that go through its reactive
      // proxy — mutating the raw object we created above (assistantMsg.content
      // += token, assistantMsg.streaming = false) would silently bypass that
      // proxy, so the UI never re-rendered on each streamed token. It only
      // *looked* fixed by navigating away and back because that remounts the
      // view, which reads the store fresh — by then the (invisible) stream
      // had already finished. Grabbing the reactive reference here is what
      // makes every token show up live.
      const assistantMsg = conv.messages.at(-1)!

      const controller = new AbortController()
      this.pendingAbort = controller

      try {
        await streamCompletion({
          model: this.selectedModelId,
          messages: conv.messages.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content })),
          signal: controller.signal,
          onToken: (token) => {
            assistantMsg.content += token
          },
        })
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          assistantMsg.error = 'Generation failed. Please try again.'
        }
      } finally {
        assistantMsg.streaming = false
        conv.updatedAt = Date.now()
        this.pendingAbort = null
      }
    },

    /** Edits a user message in place, drops everything after it, and
     * regenerates the assistant's reply from that point — the standard
     * "edit and resend" pattern in every major chat product. */
    async editMessage(messageId: string, newContent: string) {
      const conv = this.active
      if (!conv) return
      const idx = conv.messages.findIndex((m) => m.id === messageId)
      if (idx === -1) return
      conv.messages[idx].content = newContent
      conv.messages = conv.messages.slice(0, idx + 1)
      conv.updatedAt = Date.now()
      await this.runAssistantTurn(conv)
    },

    /** Regenerates the most recent assistant reply, discarding it first. */
    async regenerate() {
      const conv = this.active
      if (!conv || this.isStreaming) return
      const lastAssistantIdx = [...conv.messages].reverse().findIndex((m) => m.role === 'assistant')
      if (lastAssistantIdx === -1) return
      const cutAt = conv.messages.length - 1 - lastAssistantIdx
      conv.messages = conv.messages.slice(0, cutAt)
      await this.runAssistantTurn(conv)
    },

    stopGenerating() {
      this.pendingAbort?.abort()
    },

    selectModel(id: string) {
      this.selectedModelId = id
    },

    setEffort(id: EffortId) {
      this.reasoningEffort = id
    },
  },
})

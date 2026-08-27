# Chat — Vue 3 immersive chat micro-frontend

Standalone Vue 3 + Vite app, embedded full-bleed via `<iframe>` into the
`explorer` (Next.js/React) shell's "Chat" tab. Kept as its own app —
matching the existing `apps/explorer` / `apps/shell` / `apps/marketing`
split in this monorepo — so it gets Vue's full ecosystem (Composition API,
Pinia, Vue Router, `@vueuse/motion`) instead of being shoehorned into React.

## Stack

- Vue 3 (`<script setup>`, Composition API)
- Vite
- Pinia — conversation + UI state
- Vue Router — `/chat` and `/chat/:id`
- `@vueuse/core` + `@vueuse/motion` — composables & declarative motion
- `marked` + `dompurify` + `highlight.js` — sanitized, syntax-highlighted markdown
- Tailwind CSS v4 — same design tokens as `apps/explorer` (`src/styles/tokens.css`)

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3001
```

## Wiring to a real model

By default all responses are generated locally by `src/lib/mockResponder.ts`
so the UI is fully interactive with zero backend. Set `VITE_CHAT_API_URL` in
`.env.local` to a POST endpoint that streams Server-Sent Events shaped like
`data: {"token":"..."}\n\n`, terminated by `data: [DONE]`, and
`useSSEChat.ts` will use it automatically — no component changes needed.

## Structure

```
src/
  components/
    layout/      ImmersiveBackground, TopBar
    sidebar/      ConversationSidebar, SidebarBody, ConversationItem
    chat/         MessageList, MessageBubble, MarkdownRenderer, TypingIndicator
    composer/     Composer, ModelPicker
    common/       IconButton
  composables/     useAutoResizeTextarea, useSSEChat, useBridge
  stores/          chat.ts (Pinia), ui.ts
  lib/             markdown.ts, mockResponder.ts, utils.ts
  views/           ChatView.vue
```

## Host bridge

`useBridge()` posts `{ source: 'spatial-chat', type: 'ready' }` to
`window.parent` on mount and listens for `{ source: 'spatial-shell', ... }`
messages back — the seam for the explorer shell to pass down theme, auth,
or safe-area info later without tightly coupling the two apps.

## Roadmap (not yet built)

- Real auth token hand-off from the shell over the postMessage bridge
- Virtualized message list for very long conversations
- Voice input (mirroring `apps/explorer`'s `useVoiceInput`)
- Command palette (`Cmd+K`)
- Persisted conversations (currently in-memory / per-session)

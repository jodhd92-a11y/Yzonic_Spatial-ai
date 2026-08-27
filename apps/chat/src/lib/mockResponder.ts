// Stand-in "model" so the UI is fully interactive with zero backend.
// Swap this out by setting VITE_CHAT_API_URL — see useSSEChat.ts, which
// will use a real SSE endpoint instead of this generator when it's set.
//
// No backend model is wired up yet, so instead of faking a real answer
// we stream a plain "no model available" notice — same token-by-token
// cadence as a real streaming response, just honest about there being
// nothing behind it yet.

const NOTICE = 'No model available yet!'

/** Yields the notice token-by-token, mimicking real-time SSE cadence. */
export async function* mockStream(_prompt: string): AsyncGenerator<string> {
  const tokens = NOTICE.split(/(\s+)/)
  for (const t of tokens) {
    await new Promise((r) => setTimeout(r, 12 + Math.random() * 22))
    yield t
  }
}

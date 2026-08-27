import { mockStream } from '@/lib/mockResponder'

interface StreamOpts {
  model: string
  messages: { role: string; content: string }[]
  signal: AbortSignal
  onToken: (token: string) => void
}

const API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined

/**
 * Streams a completion token-by-token. Uses the real backend (expected to
 * speak Server-Sent Events with `{"token": "..."}` data frames, terminated
 * by `[DONE]`) when VITE_CHAT_API_URL is set; otherwise falls back to the
 * local mock generator so the whole UI works out of the box.
 */
export async function streamCompletion({ model, messages, signal, onToken }: StreamOpts): Promise<void> {
  if (!API_URL) {
    const prompt = messages.at(-1)?.content ?? ''
    for await (const token of mockStream(prompt)) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      onToken(token)
    }
    return
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  })
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload)
        if (parsed.token) onToken(parsed.token)
      } catch {
        // ignore malformed frames
      }
    }
  }
}

import { type Ref, watch, nextTick } from 'vue'

/** Grows a textarea to fit its content, up to `maxPx`, then scrolls. */
export function useAutoResizeTextarea(el: Ref<HTMLTextAreaElement | null | undefined>, value: Ref<string>, maxPx = 200) {
  async function resize() {
    await nextTick()
    const node = el.value
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, maxPx)}px`
  }

  watch(value, resize, { immediate: true })
  return { resize }
}

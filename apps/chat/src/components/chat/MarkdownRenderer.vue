<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderMarkdown } from '@/lib/markdown'

const props = defineProps<{ content: string }>()
const html = computed(() => renderMarkdown(props.content))
const root = ref<HTMLElement | null>(null)

// Event delegation: every <pre><code> block rendered by marked gets a copy
// button injected after mount, without needing per-block Vue component
// instances (would be wasteful for long streamed responses).
function decorateCodeBlocks() {
  const blocks = root.value?.querySelectorAll('.sp-codeblock') ?? []
  blocks.forEach((block) => {
    if (block.querySelector('.sp-copy-btn')) return
    const btn = document.createElement('button')
    btn.className =
      'sp-copy-btn absolute top-2 right-2 flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10.5px] text-[var(--sp-text-dim)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-white/[0.12]'
    btn.textContent = 'Copy'
    btn.addEventListener('click', () => {
      const code = block.querySelector('code')?.textContent ?? ''
      navigator.clipboard.writeText(code)
      btn.textContent = 'Copied'
      setTimeout(() => (btn.textContent = 'Copy'), 1200)
    })
    block.classList.add('group', 'relative')
    block.appendChild(btn)
  })
}

const vUpdated = {
  mounted: decorateCodeBlocks,
  updated: decorateCodeBlocks,
}
</script>

<template>
  <div ref="root" v-updated class="sp-prose" v-html="html" />
</template>

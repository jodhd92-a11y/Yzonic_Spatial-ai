import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)

const renderer = new marked.Renderer()

renderer.code = ({ text, lang }) => {
  const language = hljs.getLanguage(lang ?? '') ? lang! : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  const escapedLang = (lang ?? 'text').replace(/[^a-z0-9+#-]/gi, '') || 'text'
  return `<div class="sp-codeblock" data-lang="${escapedLang}"><pre><code class="hljs language-${escapedLang}">${highlighted}</code></pre></div>`
}

marked.use({ renderer, breaks: true, gfm: true })

/** Renders trusted-enough markdown (model output) to sanitized HTML. */
export function renderMarkdown(src: string): string {
  const raw = marked.parse(src, { async: false }) as string
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] })
}

import type { Directive } from 'vue'
import { requestTooltip, dismissTooltip, type TooltipPlacement } from '@/stores/tooltip'

type TooltipBinding = string | { text: string; placement?: TooltipPlacement; delay?: number }

interface TooltipEl extends HTMLElement {
  __spTooltip?: {
    enter: () => void
    leave: () => void
    current: TooltipBinding
  }
}

function resolve(value: TooltipBinding) {
  if (typeof value === 'string') return { text: value, placement: 'top' as TooltipPlacement, delay: 350 }
  return { text: value.text, placement: value.placement ?? 'top', delay: value.delay ?? 350 }
}

// Custom tooltip directive — replaces the browser's native `title` popup
// (plain, unstyled, OS-themed) with the app's own floating panel so it
// always matches the current theme/accent instead of looking bolted on.
export const vTooltip: Directive<TooltipEl, TooltipBinding> = {
  mounted(el, binding) {
    const handleEnter = () => {
      const state = el.__spTooltip
      if (!state) return
      const { text, placement, delay } = resolve(state.current)
      if (!text) return
      requestTooltip(el, text, placement, delay)
    }
    const handleLeave = () => dismissTooltip()
    el.__spTooltip = { enter: handleEnter, leave: handleLeave, current: binding.value }
    el.addEventListener('mouseenter', handleEnter)
    el.addEventListener('mouseleave', handleLeave)
    el.addEventListener('focus', handleEnter)
    el.addEventListener('blur', handleLeave)
    el.addEventListener('click', handleLeave)
  },
  updated(el, binding) {
    // Keep the closure's copy of the binding fresh (e.g. reactive i18n
    // labels) without tearing down and re-adding listeners every render.
    if (el.__spTooltip) el.__spTooltip.current = binding.value
  },
  beforeUnmount(el) {
    const handlers = el.__spTooltip
    if (!handlers) return
    el.removeEventListener('mouseenter', handlers.enter)
    el.removeEventListener('mouseleave', handlers.leave)
    el.removeEventListener('focus', handlers.enter)
    el.removeEventListener('blur', handlers.leave)
    el.removeEventListener('click', handlers.leave)
    dismissTooltip(true)
  },
}

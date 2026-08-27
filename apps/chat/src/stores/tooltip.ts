import { reactive } from 'vue'

// Single shared tooltip state — one floating element mounted once in
// App.vue (TooltipHost) and driven by the v-tooltip directive on any
// element. Keeps the DOM to a single node instead of one per button.
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export const tooltipState = reactive({
  visible: false,
  text: '',
  x: 0,
  y: 0,
  placement: 'top' as TooltipPlacement,
})

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function requestTooltip(
  target: HTMLElement,
  text: string,
  placement: TooltipPlacement = 'top',
  delay = 350,
) {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (showTimer) clearTimeout(showTimer)
  showTimer = setTimeout(() => {
    const rect = target.getBoundingClientRect()
    let x = rect.left + rect.width / 2
    let y = rect.top
    if (placement === 'top') {
      y = rect.top - 8
    } else if (placement === 'bottom') {
      y = rect.bottom + 8
    } else if (placement === 'left') {
      x = rect.left - 8
      y = rect.top + rect.height / 2
    } else if (placement === 'right') {
      x = rect.right + 8
      y = rect.top + rect.height / 2
    }
    tooltipState.text = text
    tooltipState.placement = placement
    tooltipState.x = x
    tooltipState.y = y
    tooltipState.visible = true
  }, delay)
}

export function dismissTooltip(immediate = false) {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (immediate) {
    tooltipState.visible = false
    return
  }
  hideTimer = setTimeout(() => {
    tooltipState.visible = false
  }, 60)
}

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { findDoodleEvent, type DoodleEvent } from '@/lib/doodleEvents'

// Module-level so every DoodleLogo instance on screen shares one clock and
// one override — there's only ever one "occasion" active at a time.
const now = ref(new Date())
let timer: ReturnType<typeof setTimeout> | null = null

function scheduleMidnightRefresh() {
  if (timer) clearTimeout(timer)
  const next = new Date(now.value)
  next.setHours(24, 0, 5, 0) // just after midnight, so the date rolls over
  const delay = Math.max(next.getTime() - Date.now(), 1000)
  timer = setTimeout(() => {
    now.value = new Date()
    scheduleMidnightRefresh()
  }, delay)
}

// Manual override point for anything that isn't calendar-predictable —
// e.g. a national-tragedy tribute ribbon. Nothing in this codebase flips
// this automatically (that would require a live news/incident feed this
// frontend doesn't have); it's here so one can be wired up later without
// touching the rendering component.
const tributeOverride = ref(false)
export function setDoodleTributeMode(active: boolean) {
  tributeOverride.value = active
}

export function useDoodle() {
  onMounted(() => {
    if (!timer) scheduleMidnightRefresh()
  })
  onUnmounted(() => {
    // Intentionally leave the module-level timer running — other mounted
    // DoodleLogo instances may still depend on it.
  })

  const event = computed<DoodleEvent | null>(() => {
    if (tributeOverride.value) {
      return {
        id: 'tribute',
        label: 'In remembrance',
        month: now.value.getMonth() + 1,
        day: now.value.getDate(),
        motif: 'tribute',
        colors: { primary: '#9aa3b2', accent: '#c7cdd8' },
      }
    }
    return findDoodleEvent(now.value)
  })

  return { event }
}

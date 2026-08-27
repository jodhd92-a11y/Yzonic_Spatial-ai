import { useEffect, type RefObject } from 'react'

/**
 * Toggles the `anim-paused` class (see global.css) on the given element
 * whenever it's off-screen, and whenever the tab itself is backgrounded.
 * global.css already pauses every CSS `animation` under `.anim-paused`,
 * so this is a drop-in way to stop paying for infinite keyframe
 * animations (glows, spins, drifts) in sections nobody is looking at —
 * without touching each section's own CSS.
 *
 * Safe to call alongside useReveal() on the same ref: this only ever
 * adds/removes one class and never touches `.reveal`/`.visible`.
 */
export function useOffscreenPause(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let isVisible = false

    const apply = () => {
      const shouldRun = isVisible && !document.hidden
      el.classList.toggle('anim-paused', !shouldRun)
    }

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting
        apply()
      },
      { threshold: 0, rootMargin: '200px 0px 200px 0px' }
    )
    io.observe(el)

    const onVisibility = () => apply()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [ref])
}

import { useEffect, useRef } from 'react'

/**
 * Attaches a scroll-triggered reveal animation to elements. Give each
 * element `className="reveal"` — index controls the stagger
 * delay (matches the original's `(i % 4) * 90ms` pattern).
 */
export function useReveal() {
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const elements = root.querySelectorAll<HTMLElement>('.reveal')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            const delay = Number(target.dataset.delay || 0)
            setTimeout(() => target.classList.add('visible'), delay)
            obs.unobserve(target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )

    elements.forEach((el, i) => {
      el.dataset.delay = String((i % 4) * 90)
      obs.observe(el)
    })

    return () => obs.disconnect()
  }, [])

  return containerRef
}

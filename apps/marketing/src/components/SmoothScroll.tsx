import { useEffect } from 'react'
import Lenis from 'lenis'

// Astro islands are independent React roots, so this can no longer wrap
// `children` the way the Next.js version did (a single provider around the
// whole tree). It's now a standalone, render-nothing island: mount it once
// in Layout.astro and it drives smooth scrolling / hash-link scrolling for
// the whole document, exactly like the original provider did.
export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    // Exposed so other independently-hydrated islands (FabStack's
    // autoscroll, SectionDots' click-to-scroll) can drive the same
    // Lenis instance instead of fighting it with a second scroll
    // system. See FabStack.tsx for why that matters.
    ;(window as any).__lenis = lenis

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    // Backgrounded tab: stop driving the scroll loop entirely.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
      } else {
        rafId = requestAnimationFrame(raf)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // `is-scrolling` is what StarField (and any future scroll-linked
    // effect) checks to skip its own expensive per-frame work — Lenis
    // is the single source of truth for "is the page actually moving
    // right now", so it's the right place to set it. Cleared 120ms
    // after the last scroll event, which is comfortably longer than a
    // single wheel tick but short enough that a stopped page reads as
    // stopped almost immediately.
    let scrollTimeout: ReturnType<typeof setTimeout> | undefined
    const root = document.documentElement
    lenis.on('scroll', () => {
      root.classList.add('is-scrolling')
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => root.classList.remove('is-scrolling'), 120)
    })

    // Native `scroll-behavior: smooth` used to handle this, but running
    // it alongside Lenis meant every wheel tick had two systems fighting
    // over scroll position. It must stay OFF in global.css, or in-page
    // hash links get animated twice.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a[href^="#"]')
      if (!anchor) return
      const id = anchor.getAttribute('href')?.slice(1)
      if (!id) return
      const target = document.getElementById(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target)
    }
    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(scrollTimeout)
      root.classList.remove('is-scrolling')
      cancelAnimationFrame(rafId)
      lenis.destroy()
      if ((window as any).__lenis === lenis) (window as any).__lenis = undefined
    }
  }, [])

  return null
}

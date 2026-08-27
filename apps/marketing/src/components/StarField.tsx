import { useEffect, useRef } from 'react'

interface Node {
  baseX: number
  baseY: number
  ampX: number
  ampY: number
  speed: number
  phase: number
  r: number
  useAccent: boolean
  x: number
  y: number
  idx: number
}

export function StarField({ targetId }: { targetId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    const start = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return

      const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
      const isMobile = window.innerWidth <= 768 || matchMedia('(hover: none)').matches
      const isLowEnd =
        isMobile &&
        ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
          // @ts-expect-error deviceMemory is non-standard but widely supported
          (navigator.deviceMemory && navigator.deviceMemory <= 4))

      // Reduced from 90/40/26 — cuts worst-case pairwise link checks
      // (which scale O(n^2)) roughly in half, since this is the single
      // most expensive part of every frame.
      const NODE_COUNT = isLowEnd ? 10 : isMobile ? 16 : 30
      const LINK_DIST = isMobile ? 110 : 150
      const LINK_DIST_SQ = LINK_DIST * LINK_DIST

      let W = 0
      let H = 0
      const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)

      function themeRGB(varName: string) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
        return v || '79,195,247'
      }
      const primaryRGB = themeRGB('--primary-rgb')
      const accentRGB = themeRGB('--accent-rgb')

      function resize() {
        if (!canvas) return
        W = canvas.offsetWidth
        H = canvas.offsetHeight
        canvas.width = Math.round(W * DPR)
        canvas.height = Math.round(H * DPR)
        ctx!.setTransform(DPR, 0, 0, DPR, 0, 0)
      }
      window.addEventListener('resize', resize, { passive: true })
      resize()

      // Keep-out band for the badge + headline: without this, nodes
      // land there by pure chance roughly as often as anywhere else,
      // and a connecting line crossing right through that text reads
      // as a stray/broken element rather than ambient decoration.
      // Nodes are just re-rolled (not clamped) so the overall density
      // elsewhere stays uniform.
      const keepOut = { xMin: 0.18, xMax: 0.82, yMin: 0, yMax: 0.34 }
      function rollPosition() {
        let x = Math.random() * W
        let y = Math.random() * H
        for (let tries = 0; tries < 6; tries++) {
          const fx = x / W
          const fy = y / H
          const inside = fx > keepOut.xMin && fx < keepOut.xMax && fy > keepOut.yMin && fy < keepOut.yMax
          if (!inside) break
          x = Math.random() * W
          y = Math.random() * H
        }
        return { x, y }
      }

      const nodes: Node[] = []
      for (let i = 0; i < NODE_COUNT; i++) {
        const { x: baseX, y: baseY } = rollPosition()
        nodes.push({
          baseX,
          baseY,
          ampX: 18 + Math.random() * 34,
          ampY: 14 + Math.random() * 28,
          speed: 0.15 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          r: 1.1 + Math.random() * 1.8,
          useAccent: Math.random() < 0.32,
          x: 0,
          y: 0,
          idx: i,
        })
      }

      let px = -9999,
        py = -9999,
        tpx = -9999,
        tpy = -9999

      const onPointerMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        tpx = e.clientX - rect.left
        tpy = e.clientY - rect.top
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true })

      let visible = true
      let io: IntersectionObserver | null = null
      const target = document.getElementById(targetId)
      if (target && 'IntersectionObserver' in window) {
        io = new IntersectionObserver(
          (entries) => {
            visible = entries[0].isIntersecting && !document.hidden
          },
          { threshold: 0 }
        )
        io.observe(target)
      }

      const onVisibility = () => {
        visible = (target ? target.getBoundingClientRect().top < window.innerHeight : true) && !document.hidden
      }
      document.addEventListener('visibilitychange', onVisibility)

      // Two pre-rendered glow sprites (one per color), built once. The
      // old approach called ctx.createRadialGradient() for every node on
      // every frame — up to ~3,900 gradient object allocations/sec at 65
      // nodes @ 60fps, which is exactly the kind of GC churn that shows
      // up as "Other"/script-evaluation time in a profiler. Blitting a
      // cached bitmap with drawImage is dramatically cheaper and looks
      // identical since the glow's color never changes at runtime.
      const SPRITE_SIZE = 128
      function makeGlowSprite(rgb: string) {
        const c = document.createElement('canvas')
        c.width = SPRITE_SIZE
        c.height = SPRITE_SIZE
        const sctx = c.getContext('2d')!
        const grad = sctx.createRadialGradient(
          SPRITE_SIZE / 2, SPRITE_SIZE / 2, 0,
          SPRITE_SIZE / 2, SPRITE_SIZE / 2, SPRITE_SIZE / 2
        )
        grad.addColorStop(0, `rgba(${rgb},1)`)
        grad.addColorStop(1, `rgba(${rgb},0)`)
        sctx.fillStyle = grad
        sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
        return c
      }
      const primarySprite = makeGlowSprite(primaryRGB)
      const accentSprite = makeGlowSprite(accentRGB)

      // Spatial grid for the link-distance check, cell size == LINK_DIST
      // so any two nodes within linking range are guaranteed to be in
      // the same cell or one of its 8 neighbors — that's what makes a
      // 3x3-cell lookup sufficient. This is what turns the link scan
      // from O(n^2) pairwise distance checks into roughly O(n): instead
      // of testing all 2,080 pairs for 65 nodes every frame, each node
      // only tests the handful of nodes sharing its neighborhood.
      // Buckets are Node[] arrays reused across frames (reset via
      // .length = 0) rather than reallocated, so the grid rebuild each
      // frame is index math + array pushes, not GC pressure.
      const gridBuckets = new Map<string, Node[]>()
      const bucketPool: Node[][] = []
      function getBucket(key: string): Node[] {
        let bucket = gridBuckets.get(key)
        if (!bucket) {
          bucket = bucketPool.pop() ?? []
          gridBuckets.set(key, bucket)
        }
        return bucket
      }
      function rebuildGrid() {
        for (const bucket of gridBuckets.values()) {
          bucket.length = 0
          bucketPool.push(bucket)
        }
        gridBuckets.clear()
        for (const n of nodes) {
          const cx = Math.floor(n.x / LINK_DIST)
          const cy = Math.floor(n.y / LINK_DIST)
          getBucket(`${cx},${cy}`).push(n)
        }
      }

      function drawFrame(t: number) {
        ctx!.clearRect(0, 0, W, H)

        for (const n of nodes) {
          n.x = n.baseX + Math.sin(t * n.speed + n.phase) * n.ampX
          n.y = n.baseY + Math.cos(t * n.speed * 0.8 + n.phase) * n.ampY
        }

        const isScrolling = document.documentElement.classList.contains('is-scrolling')

        if (!prefersReducedMotion && !isScrolling) {
          ctx!.lineWidth = 1
          rebuildGrid()
          for (const a of nodes) {
            const cx = Math.floor(a.x / LINK_DIST)
            const cy = Math.floor(a.y / LINK_DIST)
            for (let ox = -1; ox <= 1; ox++) {
              for (let oy = -1; oy <= 1; oy++) {
                const bucket = gridBuckets.get(`${cx + ox},${cy + oy}`)
                if (!bucket) continue
                for (const b of bucket) {
                  // idx check both dedupes (a,b)/(b,a) and skips self —
                  // only process each pair once, in one direction.
                  if (b.idx <= a.idx) continue
                  const dx = a.x - b.x,
                    dy = a.y - b.y
                  const dSq = dx * dx + dy * dy
                  if (dSq > LINK_DIST_SQ) continue
                  const near = 1 - dSq / LINK_DIST_SQ
                  const midx = (a.x + b.x) / 2,
                    midy = (a.y + b.y) / 2
                  const pdx = midx - px,
                    pdy = midy - py
                  const pointerBoost = Math.max(0, 1 - (pdx * pdx + pdy * pdy) / 40000) * 0.5
                  ctx!.strokeStyle = `rgba(${primaryRGB},${(0.05 + near * 0.16 + pointerBoost).toFixed(3)})`
                  ctx!.beginPath()
                  ctx!.moveTo(a.x, a.y)
                  ctx!.lineTo(b.x, b.y)
                  ctx!.stroke()
                }
              }
            }
          }
        }

        for (const n of nodes) {
          const dx = n.x - tpx,
            dy = n.y - tpy
          const near = Math.max(0, 1 - (dx * dx + dy * dy) / 22500)
          const sprite = n.useAccent ? accentSprite : primarySprite
          const glowR = n.r * (1 + near * 1.8)
          const alpha = 0.55 + near * 0.4 + Math.sin(t * 1.2 + n.phase) * 0.08
          const d = glowR * 8
          ctx!.globalAlpha = Math.min(1, alpha)
          ctx!.drawImage(sprite, n.x - d / 2, n.y - d / 2, d, d)
        }
        ctx!.globalAlpha = 1
      }

      let rafId: number

      if (prefersReducedMotion) {
        drawFrame(0)
      } else {
        const frameInterval = isLowEnd ? 1000 / 30 : 0
        let lastFrameTime = 0
        const frameStart = performance.now()

        const animate = (now: number) => {
          rafId = requestAnimationFrame(animate)
          if (!visible) return
          if (frameInterval && now - lastFrameTime < frameInterval) return
          lastFrameTime = now

          px += (tpx - px) * 0.08
          py += (tpy - py) * 0.08
          if (isMobile && tpx === -9999) {
            const t = (now - frameStart) / 1000
            px = W * 0.5 + Math.sin(t * 0.2) * W * 0.28
            py = H * 0.5 + Math.cos(t * 0.17) * H * 0.22
          }
          if (tpx === -9999) {
            tpx = px
            tpy = py
          }

          drawFrame((now - frameStart) / 1000)
        }
        rafId = requestAnimationFrame(animate)
      }

      cleanup = () => {
        window.removeEventListener('resize', resize)
        window.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('visibilitychange', onVisibility)
        if (io) io.disconnect()
        if (rafId) cancelAnimationFrame(rafId)
      }
    }

    // Defer the whole particle system until the browser is genuinely
    // idle — i.e. after React has finished hydrating and the page is
    // already interactive. This is what keeps StarField from competing
    // with page load for the main thread, which is what was driving up
    // Total Blocking Time / INP.
    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(start, { timeout: 1000 })
    } else {
      timeoutId = setTimeout(start, 200)
    }

    return () => {
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      cleanup?.()
    }
  }, [targetId])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
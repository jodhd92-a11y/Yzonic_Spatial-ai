'use client'

import { useEffect, useRef } from 'react'
import type { WorkerDetection } from '../../workers/vision.worker'

interface DetectionOverlayProps {
  liveDetectionsRef: React.RefObject<WorkerDetection[]>
}

// Draws directly to canvas every animation frame, reading from a ref that
// the vision pipeline updates ~8x/sec. This runs completely outside React's
// render cycle — React never re-renders because a box moved.
export function DetectionOverlay({ liveDetectionsRef }: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      for (const det of liveDetectionsRef.current) {
        const x = det.box.x * width
        const y = det.box.y * height
        const w = det.box.width * width
        const h = det.box.height * height

        ctx.strokeStyle = 'rgba(79,195,247,0.9)'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, w, h)

        const label = `${det.label} ${Math.round(det.confidence * 100)}%`
        ctx.font = '600 11px monospace'
        const textWidth = ctx.measureText(label).width
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.fillRect(x, Math.max(0, y - 18), textWidth + 10, 18)
        ctx.fillStyle = '#4FC3F7'
        ctx.fillText(label, x + 5, Math.max(12, y - 5))
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [liveDetectionsRef])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  )
}

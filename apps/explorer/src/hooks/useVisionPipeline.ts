'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { FramePipeline } from '../lib/vision/frame-pipeline'
import type { WorkerDetection } from '../workers/vision.worker'

export type VisionStatus = 'idle' | 'loading' | 'ready' | 'error'

// This hook is the ONLY bridge between the real-time vision pipeline and
// React. It intentionally exposes two different update rates:
//
//  - `liveDetectionsRef` — updates every stream frame (~8/sec). Read this
//    imperatively from the overlay canvas's own draw loop. Do NOT useState
//    this; that would push per-frame data through React's render cycle,
//    which is exactly what we're trying to avoid.
//
//  - `topDetection` — a useState value, but only committed on a throttle
//    (default 600ms) and only when the label actually changes. This is
//    what the DetectionCard UI reads. Cheap enough for React to handle.
export function useVisionPipeline(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<VisionStatus>('idle')
  const [backend, setBackend] = useState<'gpu' | 'cpu' | null>(null)
  const [topDetection, setTopDetection] = useState<WorkerDetection | null>(null)
  const [detailedResult, setDetailedResult] = useState<WorkerDetection | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const pipelineRef = useRef<FramePipeline | null>(null)
  const liveDetectionsRef = useRef<WorkerDetection[]>([])
  const lastUiCommitRef = useRef(0)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/vision.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    setStatus('loading')

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.type === 'ready') {
        setStatus('ready')
        setBackend(msg.backend)
      } else if (msg.type === 'error') {
        setStatus('error')
        console.error('[vision.worker]', msg.message)
      } else if (msg.type === 'detections') {
        if (msg.mode === 'detailed') {
          setDetailedResult(msg.detections[0] ?? null)
          return
        }
        // Stream mode: update the imperative ref every time (cheap),
        // only touch React state on a throttle.
        liveDetectionsRef.current = msg.detections
        const now = performance.now()
        const best = msg.detections[0] ?? null
        if (now - lastUiCommitRef.current > 600) {
          lastUiCommitRef.current = now
          setTopDetection((prev) => (prev?.label === best?.label ? prev : best))
        }
      }
    }

    worker.postMessage({ type: 'init' })

    return () => {
      pipelineRef.current?.stop()
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // Start/stop the capture loop once the video is actually playing and the
  // worker has finished loading the model.
  useEffect(() => {
    const video = videoRef.current
    const worker = workerRef.current
    if (!video || !worker || status !== 'ready') return

    const pipeline = new FramePipeline({ video, worker })
    pipelineRef.current = pipeline
    pipeline.start()

    return () => {
      pipeline.stop()
      pipelineRef.current = null
    }
  }, [videoRef, status])

  const runDetailedScan = useCallback(async () => {
    setDetailedResult(null)
    await pipelineRef.current?.captureDetailed()
  }, [])

  return {
    status,
    backend,
    topDetection,
    detailedResult,
    liveDetectionsRef,
    runDetailedScan,
  }
}

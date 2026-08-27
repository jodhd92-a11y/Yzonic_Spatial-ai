/// <reference lib="webworker" />

// Runs entirely off the main thread. Owns the MediaPipe ObjectDetector
// instance and does inference on frames handed to it as ImageBitmaps.
// Never touches React, never touches the DOM outside its own scope.

import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision'

export interface WorkerDetection {
  label: string
  confidence: number
  // Normalized 0-1 box, origin top-left, so the main thread can scale
  // it to whatever the overlay canvas's actual pixel size is.
  box: { x: number; y: number; width: number; height: number }
}

type InboundMessage =
  | { type: 'init' }
  | { type: 'frame'; bitmap: ImageBitmap; timestampMs: number; mode: 'stream' | 'detailed' }

type OutboundMessage =
  | { type: 'ready'; backend: 'gpu' | 'cpu' }
  | { type: 'error'; message: string }
  | { type: 'detections'; detections: WorkerDetection[]; mode: 'stream' | 'detailed'; timestampMs: number }

let detector: ObjectDetector | null = null
let initializing = false

async function init() {
  if (detector || initializing) return
  initializing = true
  try {
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    // Try GPU delegate first; MediaPipe falls back internally to CPU/WASM
    // on unsupported browsers, but we catch and retry explicitly so we
    // can report which backend actually ended up running.
    let backend: 'gpu' | 'cpu' = 'gpu'
    try {
      detector = await ObjectDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite',
          delegate: 'GPU',
        },
        scoreThreshold: 0.5,
        runningMode: 'VIDEO',
      })
    } catch {
      backend = 'cpu'
      detector = await ObjectDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite',
          delegate: 'CPU',
        },
        scoreThreshold: 0.5,
        runningMode: 'VIDEO',
      })
    }

    postMessage({ type: 'ready', backend } satisfies OutboundMessage)
  } catch (err) {
    postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Vision model failed to initialize',
    } satisfies OutboundMessage)
  } finally {
    initializing = false
  }
}

self.onmessage = async (e: MessageEvent<InboundMessage>) => {
  const msg = e.data

  if (msg.type === 'init') {
    void init()
    return
  }

  if (msg.type === 'frame') {
    const { bitmap, timestampMs, mode } = msg
    if (!detector) {
      bitmap.close()
      return
    }
    try {
      const result = detector.detectForVideo(bitmap, timestampMs)
      const detections: WorkerDetection[] = (result.detections ?? []).map((d) => {
        const cat = d.categories[0]
        const bb = d.boundingBox
        return {
          label: cat?.categoryName ?? 'Object',
          confidence: cat?.score ?? 0,
          box: bb
            ? {
                x: bb.originX / bitmap.width,
                y: bb.originY / bitmap.height,
                width: bb.width / bitmap.width,
                height: bb.height / bitmap.height,
              }
            : { x: 0, y: 0, width: 0, height: 0 },
        }
      })
      postMessage({ type: 'detections', detections, mode, timestampMs } satisfies OutboundMessage)
    } finally {
      bitmap.close()
    }
  }
}

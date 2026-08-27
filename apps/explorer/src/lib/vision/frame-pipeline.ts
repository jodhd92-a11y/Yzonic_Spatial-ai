// Owns the capture loop. Pulls frames off the <video> element using
// requestVideoFrameCallback (frame-accurate, and it stops firing when the
// tab is backgrounded — unlike a naive requestAnimationFrame poll), converts
// each one to an ImageBitmap, and hands it to the worker via a transferable
// postMessage. Nothing here ever touches React state.

export interface FramePipelineOptions {
  video: HTMLVideoElement
  worker: Worker
  // Stream mode runs continuously for the live overlay; throttled so we
  // don't flood the worker faster than it can keep up.
  streamIntervalMs?: number
}

export class FramePipeline {
  private video: HTMLVideoElement
  private worker: Worker
  private streamIntervalMs: number
  private lastStreamTs = 0
  private handle: number | null = null
  private running = false

  constructor(opts: FramePipelineOptions) {
    this.video = opts.video
    this.worker = opts.worker
    this.streamIntervalMs = opts.streamIntervalMs ?? 120 // ~8 inferences/sec
  }

  start() {
    if (this.running) return
    this.running = true
    this.scheduleNext()
  }

  stop() {
    this.running = false
    if (this.handle !== null && 'cancelVideoFrameCallback' in this.video) {
      this.video.cancelVideoFrameCallback(this.handle)
    }
    this.handle = null
  }

  // One-off higher-effort capture for the "Lens" tap-to-scan action,
  // independent of the streaming loop's throttle.
  async captureDetailed() {
    const bitmap = await createImageBitmap(this.video)
    this.worker.postMessage(
      { type: 'frame', bitmap, timestampMs: performance.now(), mode: 'detailed' },
      [bitmap]
    )
  }

  private scheduleNext() {
    if (!this.running) return
    const supportsRVFC = 'requestVideoFrameCallback' in this.video

    if (supportsRVFC) {
      this.handle = this.video.requestVideoFrameCallback((now: number) => this.onFrame(now))
    } else {
      // Fallback for browsers without rVFC (older Safari): rAF-driven poll.
      this.handle = requestAnimationFrame(() => this.onFrame(performance.now()))
    }
  }

  private async onFrame(nowMs: number) {
    if (!this.running) return

    if (nowMs - this.lastStreamTs >= this.streamIntervalMs) {
      this.lastStreamTs = nowMs
      try {
        const bitmap = await createImageBitmap(this.video)
        this.worker.postMessage(
          { type: 'frame', bitmap, timestampMs: nowMs, mode: 'stream' },
          [bitmap]
        )
      } catch {
        // Video not ready for a frame grab yet (e.g. mid-flip) — skip silently.
      }
    }

    this.scheduleNext()
  }
}

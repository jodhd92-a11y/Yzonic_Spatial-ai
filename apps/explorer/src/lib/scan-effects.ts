// Small, dependency-free helpers that give the Settings modal's toggles a
// real, observable effect instead of just persisting a boolean nobody
// reads. Each one is a no-op (not a throw) when the browser/device
// doesn't support the underlying API, so a toggle being on never breaks
// the scan flow on an unsupported device.

/** Haptic feedback — "Haptic feedback" toggle, General tab. */
export function triggerHaptic(pattern: number | number[] = 20) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Vibration API can throw on some locked-down browsers — safe to ignore.
  }
}

let audioCtx: AudioContext | null = null

/** Short UI chime on scan completion — "Sound effects" toggle, Notifications tab. */
export function playScanSound() {
  if (typeof window === 'undefined') return
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return
  try {
    audioCtx ??= new Ctx()
    const ctx = audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.09)
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // Autoplay policies can reject this before a user gesture unlocks
    // audio — safe to ignore, it's a nice-to-have chime, not core UX.
  }
}

/**
 * Requests Notification permission if needed, then shows a scan-complete
 * alert. Wired to the "Push notifications" + "Scan-complete alerts"
 * toggles together — both have to be on. Silently does nothing if the
 * user has denied notifications at the browser level.
 */
export async function notifyScanComplete(label: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  try {
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') return
    new Notification('Scan complete', { body: label, silent: true })
  } catch {
    // Some browsers (and most iframed/embedded contexts) block the
    // Notification constructor outright — safe to ignore.
  }
}

/**
 * Captures the current video frame as a downscaled JPEG data URL — used
 * for the sidebar's scan thumbnail, the scan viewer, the "Chat about
 * this" handoff, and the photo customization panel. Downscaled (vs. the
 * full-res PNG that `downloadVideoFrame` writes to disk) since this one
 * lives in memory/localStorage via the chat-history store.
 */
export function captureVideoFrame(video: HTMLVideoElement | null, maxWidth = 480): string | null {
  if (!video || video.readyState < 2 || !video.videoWidth) return null
  const scale = Math.min(1, maxWidth / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  try {
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  }
}

/**
 * Captures the current video frame and downloads it as a PNG —
 * "Save scans to device" toggle, Camera & Lens tab.
 */
export function downloadVideoFrame(video: HTMLVideoElement | null, filename: string) {
  if (!video || video.readyState < 2) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

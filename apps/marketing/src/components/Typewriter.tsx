import { useEffect, useRef } from 'react'
import styles from './Typewriter.module.css'

interface TypewriterProps {
  text: string
  startDelay?: number
  speed?: number
  className?: string
  onDone?: () => void
  /** Skip straight to the finished state — no clip-path animation, no
   *  cursor. Used so the headline only ever "types" once per browser
   *  session; re-mounts after that (e.g. navigating back to the page)
   *  render the plain finished text immediately instead of replaying. */
  skipAnimation?: boolean
  /** Gate the reveal without ever unmounting the text. Defaults to
   *  true (starts immediately on mount, the original behavior). Pass
   *  false to hold the animation paused at its very first frame —
   *  identical in appearance to "hasn't started yet" — until some
   *  external event (e.g. a full-screen loader elsewhere on the page
   *  finishing) flips it to true. The real text stays in the DOM the
   *  whole time either way, so this never re-introduces the empty-H1
   *  LCP problem described above. */
  start?: boolean
}

/**
 * Visually types text out character by character, but — unlike a
 * character-by-character setState loop — the real text is present in
 * the DOM from the very first paint. That matters because this text
 * is the actual LCP element on this page: an empty-then-filling H1
 * delays and distorts the browser's Largest Contentful Paint reading,
 * and a real user with JS disabled or slow would otherwise see nothing
 * at all until the animation "finished" in code they never ran.
 *
 * The typing look itself is a single clip-path animation, quantized
 * into as many steps as the string has characters, running entirely
 * on the compositor — no JS executes while it plays.
 */
export function Typewriter({
  text,
  startDelay = 0,
  speed = 38,
  className,
  onDone,
  skipAnimation = false,
  start = true,
}: TypewriterProps) {
  const textRef = useRef<HTMLSpanElement>(null)
  const duration = Math.max(1, text.length) * speed

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!start) return // paused at frame zero — nothing has run yet, nothing to listen for

    if (skipAnimation || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone?.()
      return
    }

    const el = textRef.current
    if (!el) return
    const onEnd = (e: AnimationEvent) => {
      if (e.animationName === 'reveal') onDone?.()
    }
    el.addEventListener('animationend', onEnd)
    return () => el.removeEventListener('animationend', onEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, skipAnimation, start])

  if (skipAnimation) {
    // Finished state, no animation machinery at all — same DOM shape
    // minus the clip-path/cursor so layout doesn't shift between the
    // animated and skipped paths.
    return <span className={`${styles.wrap} ${className ?? ''}`}>{text}</span>
  }

  const playState = start ? 'running' : 'paused'
  const revealVars = {
    '--tw-duration': `${duration}ms`,
    '--tw-delay': `${startDelay}ms`,
    '--tw-steps': text.length,
    animationPlayState: playState,
  } as React.CSSProperties

  return (
    <span className={`${styles.wrap} ${className ?? ''}`}>
      {/* Blurred, colored duplicate of the same text, revealed on the
          identical clip-path/steps timing one layer behind the crisp
          copy — reads as a soft glow "igniting" just behind the
          writing edge rather than a flat mechanical wipe. Duplicate
          content is aria-hidden and never the largest painted text
          (the crisp span in front always is), so this doesn't touch
          the LCP element described above. */}
      <span aria-hidden="true" className={styles.textGlow} style={revealVars}>
        {text}
      </span>
      <span ref={textRef} className={styles.text} style={revealVars}>
        {text}
      </span>
      <span
        aria-hidden="true"
        className={styles.cursor}
        style={
          {
            '--tw-delay': `${startDelay}ms`,
            '--tw-hide': `${startDelay + duration}ms`,
            animationPlayState: playState,
          } as React.CSSProperties
        }
      />
    </span>
  )
}

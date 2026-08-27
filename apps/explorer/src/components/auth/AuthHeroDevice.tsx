'use client'

import { useRef } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * Phone-mockup device frame from the prototype's hero section
 * (index.html), sized down for the signup flow's mobile header and
 * reused (scaled up) inside AuthBrandPanel for desktop. The frame,
 * notch, glow, and 3D tilt-on-hover are the original hero visual;
 * the screen content is a small static/looping mock of the real app
 * UI — static viewfinder corners plus a periodically-appearing
 * detection card, echoing ScanReticle.tsx and DetectionCard.tsx —
 * rather than the prototype's spinning scan-ring + "Scanning
 * environment…" placeholder, which has been intentionally left out.
 */
export function AuthHeroDevice() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const deviceRef = useRef<HTMLDivElement>(null)

  // Same 3D tilt as the original — harmless on touch devices since the
  // gate below skips it there, but free to keep for anyone opening this
  // on a small hover-capable window (e.g. a resized desktop browser).
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (matchMedia('(hover: none)').matches) return
    const wrap = wrapRef.current
    const device = deviceRef.current
    if (!wrap || !device) return
    const rect = wrap.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    device.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translateZ(0)`
  }

  function handleMouseLeave() {
    if (deviceRef.current) deviceRef.current.style.transform = ''
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="ahd-wrap relative mx-auto"
    >
      <div ref={deviceRef} className="ahd-device relative">
        <div className="ahd-screen absolute inset-[9px] flex flex-col items-center overflow-hidden">
          <div className="ahd-notch" />
          <div className="ahd-glow" />

          {/* Static viewfinder corners — echoes ScanReticle.tsx's
              always-on frame (no spin, no pulse, no sweep). */}
          <div className="ahd-corner ahd-tl" />
          <div className="ahd-corner ahd-tr" />
          <div className="ahd-corner ahd-bl" />
          <div className="ahd-corner ahd-br" />

          {/* Mini detection card — echoes DetectionCard.tsx, fading
              in and out on a slow loop to suggest a live result. */}
          <div className="ahd-card">
            <div className="ahd-card-icon">
              <Sparkles size={9} strokeWidth={2.5} />
            </div>
            <div className="ahd-card-text">
              <span className="ahd-card-label">Post-op incision</span>
              <span className="ahd-card-meta">Wound / tissue</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ahd-wrap { width: 132px; height: 264px; perspective: 1200px; }
        .ahd-device {
          width: 132px; height: 264px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--auth-glass-border-hi);
          border-radius: 22px;
          overflow: hidden;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow:
            0 26px 60px rgba(0,0,0,0.55),
            0 0 0 1px rgba(255,255,255,0.06),
            inset 0 1px 0 rgba(255,255,255,0.12);
          transform-style: preserve-3d;
          transition: transform 0.2s var(--auth-ease);
        }
        .ahd-screen {
          border-radius: 15px;
          background: linear-gradient(180deg, #060c1a 0%, #0a0f1c 100%);
        }
        .ahd-notch {
          width: 50px; height: 13px;
          background: var(--auth-bg-0);
          border-radius: 0 0 9px 9px;
          margin: 0 auto;
          flex-shrink: 0;
        }
        .ahd-glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 50% 40%, rgba(79,195,247,0.14) 0%, transparent 70%);
        }
        .ahd-corner {
          position: absolute;
          width: 14px; height: 14px;
          border-color: rgba(79,195,247,0.55);
          border-style: solid;
          border-width: 0;
        }
        .ahd-tl { top: 26px; left: 10px; border-top-width: 1.5px; border-left-width: 1.5px; border-radius: 4px 0 0 0; }
        .ahd-tr { top: 26px; right: 10px; border-top-width: 1.5px; border-right-width: 1.5px; border-radius: 0 4px 0 0; }
        .ahd-bl { bottom: 44px; left: 10px; border-bottom-width: 1.5px; border-left-width: 1.5px; border-radius: 0 0 0 4px; }
        .ahd-br { bottom: 44px; right: 10px; border-bottom-width: 1.5px; border-right-width: 1.5px; border-radius: 0 0 4px 0; }

        .ahd-card {
          position: absolute;
          left: 8px; right: 8px; bottom: 12px;
          display: flex; align-items: center; gap: 6px;
          padding: 5px 7px;
          border-radius: 9px;
          background: rgba(0,0,0,0.55);
          border: 1px solid var(--auth-glass-border-hi);
          backdrop-filter: blur(6px);
          animation: ahd-card-in 3.6s var(--auth-ease) infinite;
        }
        .ahd-card-icon {
          width: 16px; height: 16px; flex-shrink: 0;
          border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--auth-primary), var(--auth-accent));
          color: #05070d;
        }
        .ahd-card-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .ahd-card-label {
          font-size: 7.5px; font-weight: 600; color: var(--auth-text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ahd-card-meta {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 6.5px; color: var(--auth-primary);
          letter-spacing: 0.02em;
        }
        @keyframes ahd-card-in {
          0%, 12%  { opacity: 0; transform: translateY(6px) scale(0.97); }
          22%, 82% { opacity: 1; transform: translateY(0) scale(1); }
          92%,100% { opacity: 0; transform: translateY(6px) scale(0.97); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ahd-card { animation: none !important; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

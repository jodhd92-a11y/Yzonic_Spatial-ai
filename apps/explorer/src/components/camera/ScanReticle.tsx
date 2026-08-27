'use client'

interface ScanReticleProps {
  scanning: boolean
  /** 0–1 elapsed fraction of the current scan, used to drive the live confidence readout. */
  progress?: number
}

export function ScanReticle({ scanning, progress = 0 }: ScanReticleProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className="relative w-[68vw] max-w-[380px] aspect-square"
        style={{ '--sp-scan-h': '100%' } as React.CSSProperties}
      >
        {/* Targeting grid — a faint 4×4 mesh that only appears while
            scanning, so the reticle reads as an active sensor locking
            onto the frame rather than an empty box with a line in it. */}
        {scanning && (
          <div
            className="absolute inset-3 rounded-md"
            style={{
              backgroundImage:
                'linear-gradient(rgba(var(--sp-primary-rgb),0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--sp-primary-rgb),0.4) 1px, transparent 1px)',
              backgroundSize: '25% 25%',
              animation: 'sp-grid-fade 2.2s ease-in-out infinite',
            }}
          />
        )}

        {/* Slow-rotating dashed ring — a "locking on" affordance around
            the whole reticle. Pure transform + CSS keyframe, so it costs
            nothing on the JS thread. */}
        {scanning && (
          <div
            className="absolute -inset-3 rounded-full border border-dashed"
            style={{
              borderColor: 'rgba(var(--sp-primary-rgb), 0.3)',
              animation: 'sp-rotate-ring 6s linear infinite',
            }}
          />
        )}

        {/* Scan line — a soft glow band with a bright core line running
            through it, instead of a single bare hairline, so the sweep
            reads as a beam rather than a wireframe edge. */}
        {scanning && (
          <>
            <div
              className="absolute left-0 right-0 h-10 -mt-5"
              style={{
                background:
                  'linear-gradient(180deg, transparent, rgba(var(--sp-primary-rgb),0.16), transparent)',
                animation: 'sp-scanline 1.6s linear infinite',
              }}
            />
            <div
              className="absolute left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--sp-primary), transparent)',
                boxShadow:
                  '0 0 10px rgba(var(--sp-primary-rgb), 0.85), 0 0 26px rgba(var(--sp-primary-rgb), 0.35)',
                animation: 'sp-scanline 1.6s linear infinite',
              }}
            />
          </>
        )}

        {/* Sonar ping — two staggered rings expanding out from the
            crosshair, reinforcing "actively sensing" beyond just the
            sweep line, like a radar pulse. */}
        {scanning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
            <span
              className="absolute inset-0 rounded-full border border-[var(--sp-primary)]"
              style={{ animation: 'sp-ping-ring 2s ease-out infinite' }}
            />
            <span
              className="absolute inset-0 rounded-full border border-[var(--sp-primary)]"
              style={{ animation: 'sp-ping-ring 2s ease-out infinite 1s' }}
            />
          </div>
        )}

        {/* Four corner brackets — thin, precise, status-driven color,
            with a soft glow pulse and a slight outward "snap" the
            instant a scan starts, instead of a flat color swap. */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <div
            key={corner}
            className={[
              'absolute w-7 h-7 transition-all duration-200',
              scanning ? 'border-[var(--sp-primary)] scale-110' : 'border-white/25 scale-100',
              corner === 'tl' && 'top-0 left-0 border-t border-l rounded-tl-md origin-top-left',
              corner === 'tr' && 'top-0 right-0 border-t border-r rounded-tr-md origin-top-right',
              corner === 'bl' && 'bottom-0 left-0 border-b border-l rounded-bl-md origin-bottom-left',
              corner === 'br' && 'bottom-0 right-0 border-b border-r rounded-br-md origin-bottom-right',
            ]
              .filter(Boolean)
              .join(' ')}
            style={scanning ? { animation: 'sp-bracket-pulse 1.4s ease-in-out infinite' } : undefined}
          />
        ))}

        {/* Center crosshair, always present, subtle — gains a bright
            core dot while actively scanning. */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
          {scanning && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--sp-primary)] shadow-[0_0_6px_rgba(var(--sp-primary-rgb),0.9)]" />
          )}
        </div>

        {/* Scan-state label + live confidence ramp — small, monospace,
            enterprise HUD tone. The percentage climbs toward ~99% over
            the scan's actual duration, so it reads as real progress
            rather than a static "Analyzing" caption. */}
        <div
          className={[
            'absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity duration-200',
            scanning ? 'text-[var(--sp-primary)] opacity-100' : 'opacity-0',
          ].join(' ')}
          style={scanning ? { animation: 'sp-live-pulse 1.4s ease-in-out infinite' } : undefined}
        >
          Analyzing
          {scanning && <span className="tabular-nums">{Math.min(99, Math.round(progress * 100))}%</span>}
        </div>
      </div>
    </div>
  )
}

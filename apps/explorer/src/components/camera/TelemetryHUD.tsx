'use client'

interface TelemetryHUDProps {
  scanning: boolean
  modelName?: string
}

/**
 * Compact monospace status strip. Only shows states that are actually
 * true right now (live/idle, which model is active) — no fabricated
 * fps/latency numbers. Once the real-time inference engine lands, its
 * worker can report genuine timing here on the same cadence it posts
 * detections, without this component re-rendering the rest of the tree.
 */
export function TelemetryHUD({ scanning, modelName = 'nexus-lite' }: TelemetryHUDProps) {
  return (
    <div className="absolute top-4 left-4 flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-black/50 backdrop-blur-md border border-[var(--sp-border)] text-[10.5px] font-mono tabular-nums text-[var(--sp-text-dim)]">
      <span className="flex items-center gap-1.5">
        <span
          className={[
            'w-1.5 h-1.5 rounded-full',
            scanning ? 'bg-[var(--sp-primary)]' : 'bg-[var(--sp-success)]',
          ].join(' ')}
          style={scanning ? { animation: 'sp-live-pulse 1.4s ease-in-out infinite' } : undefined}
        />
        {scanning ? 'SCANNING' : 'IDLE'}
      </span>
      <span className="w-px h-3 bg-[var(--sp-border-hover)]" />
      <span className="text-[var(--sp-text-faint)] uppercase tracking-wide">{modelName}</span>
    </div>
  )
}

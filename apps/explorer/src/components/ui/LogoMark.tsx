/**
 * The same brand mark used in the marketing app's navbar
 * (apps/marketing NavWithLoader.tsx `LogoMark` — a ring + 4-point
 * sparkle/star, not a generic icon). Kept as one shared component so
 * every surface in the explorer app (sidebar, announcement, tour) uses
 * the identical glyph instead of drifting copies.
 */
export function LogoMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="12" strokeWidth="2" stroke="var(--sp-primary)" />
      <polygon
        points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5"
        fill="var(--sp-primary)"
        opacity={0.55}
        className="blur-[2.5px]"
      />
      <polygon
        points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5"
        fill="var(--sp-primary)"
      />
    </svg>
  )
}

/** The gradient glass badge the mark sits in, matching the marketing navbar. */
export function LogoBadge({
  size = 34,
  markSize,
  className = '',
}: {
  size?: number
  markSize?: number
  className?: string
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(150deg, rgba(79,195,247,0.6), rgba(124,77,255,0.44))',
      }}
      className={[
        'rounded-[10px] border-[1.5px] border-[var(--sp-primary)]/85 flex items-center justify-center shrink-0',
        'shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_2px_10px_rgba(0,0,0,0.35),0_0_20px_rgba(79,195,247,0.45)]',
        className,
      ].join(' ')}
    >
      <LogoMark size={markSize ?? Math.round(size * 0.63)} />
    </div>
  )
}

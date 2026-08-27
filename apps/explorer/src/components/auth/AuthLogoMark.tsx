'use client'

/**
 * Matches the marketing site's nav logo (index.html `.logo-badge` /
 * `.logo-ring` / `.logo-star` / `.logo-star-glow`): a rounded glass
 * tile holding a ring + glowing four-point star, with the same
 * rotate-on-hover and pulsing-glow behavior. Replaces the previous
 * auth-only "viewfinder corners" mark so the brand is consistent
 * across the marketing site and the app. Scales off `size` (the
 * marketing site uses a fixed 38px badge; here it's used at 28-30px).
 */
export function AuthLogoMark({ size = 34 }: { size?: number }) {
  const radius = Math.round(size * (12 / 38))
  const hoverRadius = Math.round(size * (18 / 38))
  const iconSize = Math.round(size * (24 / 38))

  return (
    <div
      className="alm-badge relative shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        ['--alm-radius' as string]: `${radius}px`,
        ['--alm-hover-radius' as string]: `${hoverRadius}px`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 28 28" width={iconSize} height={iconSize} fill="none" className="alm-svg">
        <circle className="alm-ring" cx="14" cy="14" r="12" strokeWidth="1.5" />
        <polygon className="alm-star-glow" points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5" />
        <polygon className="alm-star" points="14,7 16,12.5 22,14 16,15.5 14,21 12,15.5 6,14 12,12.5" />
      </svg>

      <style>{`
        .alm-badge {
          background: linear-gradient(150deg, rgba(79,195,247,0.38), rgba(124,77,255,0.26));
          border: 1.5px solid rgba(79,195,247,0.6);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.28) inset,
            0 2px 10px rgba(0,0,0,0.3),
            0 0 18px rgba(79,195,247,0.3);
          transition: border-radius 0.5s var(--auth-ease), box-shadow 0.4s var(--auth-ease),
                      background 0.5s var(--auth-ease), transform 0.5s var(--auth-ease);
        }
        .alm-badge:hover {
          border-radius: var(--alm-hover-radius) !important;
          transform: scale(1.06);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.24) inset,
            0 4px 16px rgba(0,0,0,0.3),
            0 0 26px rgba(79,195,247,0.32);
        }
        .alm-svg {
          transform-origin: 50% 50%;
          transition: transform 0.6s var(--auth-ease);
        }
        .alm-badge:hover .alm-svg { transform: rotate(180deg) scale(1.1); }
        .alm-ring { stroke: var(--auth-primary); vector-effect: non-scaling-stroke; }
        .alm-star { fill: var(--auth-primary); transform-origin: 14px 14px; }
        .alm-star-glow {
          fill: var(--auth-primary);
          opacity: 0.7;
          filter: blur(3px);
          animation: alm-star-glow 2.4s ease-in-out infinite;
          transform-origin: 14px 14px;
          pointer-events: none;
        }
        @keyframes alm-star-glow {
          0%, 100% { opacity: 0.45; filter: blur(2.5px); }
          50%      { opacity: 0.75; filter: blur(4px); }
        }
        @media (hover: none) {
          .alm-svg { animation: alm-idle-pulse 3.6s var(--auth-ease) infinite; }
          @keyframes alm-idle-pulse {
            0%, 100% { transform: rotate(0deg) scale(1); }
            50%      { transform: rotate(8deg) scale(1.06); }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .alm-star-glow, .alm-svg { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

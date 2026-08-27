'use client'

const LEVELS = [
  { label: '', color: 'transparent' },
  { label: 'Weak', color: '#ff6b6b' },
  { label: 'Okay', color: '#ffb74d' },
  { label: 'Good', color: '#4fc3f7' },
  { label: 'Strong', color: '#4fd18b' },
]

function scorePassword(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = scorePassword(password)
  const level = LEVELS[score]

  if (!password) return null

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex h-1 flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-full flex-1 rounded-full bg-white/10 transition-colors duration-300"
            style={{ backgroundColor: i < score ? level.color : undefined }}
          />
        ))}
      </div>
      <span className="w-11 shrink-0 text-right text-[11px] text-[var(--auth-text-faint)]">{level.label}</span>
    </div>
  )
}

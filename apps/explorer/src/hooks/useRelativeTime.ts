'use client'

import { useEffect, useState } from 'react'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatRelativeTime(fromMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - fromMs)
  if (diff < 45_000) return 'Just now'
  if (diff < HOUR) {
    const mins = Math.round(diff / MINUTE)
    return `${mins}m ago`
  }
  if (diff < DAY) {
    const hours = Math.round(diff / HOUR)
    return `${hours}h ago`
  }
  const days = Math.round(diff / DAY)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(fromMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Re-renders every tick so anything displaying formatRelativeTime() stays
// live (e.g. "Just now" rolling over to "1m ago") without polling any data —
// this only ever recomputes a label from a timestamp already in memory.
export function useNowTick(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = 60_000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < min) return 'Just now'
  if (diff < hr) return `${Math.floor(diff / min)}m ago`
  if (diff < day) return `${Math.floor(diff / hr)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(ts).toLocaleDateString()
}

export interface Dated {
  updatedAt: number
}

/** Buckets items into Today / Yesterday / Previous 7 Days / Previous 30 Days / Older, in that order. */
export function groupByDate<T extends Dated>(items: T[]): { label: string; items: T[] }[] {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = startOfDay(now)
  const yesterday = today - 86_400_000
  const week = today - 7 * 86_400_000
  const month = today - 30 * 86_400_000

  const buckets: Record<string, T[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
    Older: [],
  }

  for (const item of items) {
    if (item.updatedAt >= today) buckets.Today.push(item)
    else if (item.updatedAt >= yesterday) buckets.Yesterday.push(item)
    else if (item.updatedAt >= week) buckets['Previous 7 Days'].push(item)
    else if (item.updatedAt >= month) buckets['Previous 30 Days'].push(item)
    else buckets.Older.push(item)
  }

  return Object.entries(buckets)
    .filter(([, v]) => v.length)
    .map(([label, items]) => ({ label, items }))
}

export function titleFromPrompt(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || 'New chat'
}

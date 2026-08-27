// Calendar data for the "Doodle" logo — the same idea as Google's Doodle
// program: the wordmark/badge quietly re-themes itself around real-world
// occasions (festivals, holidays, major sporting events) instead of always
// rendering the plain default sparkle.
//
// Two important caveats, by design:
//  1. Movable/lunar festivals (Holi, Eid, Diwali, etc.) don't fall on a
//     fixed Gregorian date every year, so their `month`/`day` below are
//     pinned to their confirmed 2026 dates. Bump this file once a year for
//     festivals that shift — there's no way to compute those purely from
//     the Gregorian calendar client-side.
//  2. There is no live feed here for breaking news, disasters, or
//     in-progress sports scores — that needs a real backend/API. What's
//     provided instead is a small, explicit "tribute mode" hook
//     (see useDoodle.ts) that any such feed could flip on later, plus this
//     static calendar for everything that's predictable in advance.

export type DoodleMotif =
  | 'default'
  | 'fireworks'
  | 'hearts'
  | 'colors'
  | 'crescent'
  | 'flag'
  | 'diyas'
  | 'spooky'
  | 'snow'
  | 'rings'
  | 'ball'
  | 'rakhi'
  | 'tribute'

export interface DoodleEvent {
  id: string
  label: string
  /** 1-indexed month */
  month: number
  day: number
  /** inclusive end day in the same month, for multi-day events */
  endDay?: number
  endMonth?: number
  motif: DoodleMotif
  colors: { primary: string; accent: string }
  /** higher wins when two events overlap on the same day */
  priority?: number
}

export const DOODLE_EVENTS: DoodleEvent[] = [
  {
    id: 'new-year',
    label: "Happy New Year!",
    month: 1, day: 1,
    motif: 'fireworks',
    colors: { primary: '#ffd93d', accent: '#ff6b9d' },
  },
  {
    id: 'republic-day-in',
    label: 'Republic Day',
    month: 1, day: 26,
    motif: 'flag',
    colors: { primary: '#ff9933', accent: '#138808' },
  },
  {
    id: 'valentines',
    label: "Happy Valentine's Day",
    month: 2, day: 14,
    motif: 'hearts',
    colors: { primary: '#ff6b9d', accent: '#ff9bd2' },
  },
  {
    id: 'winter-olympics-2026',
    label: 'Milano Cortina 2026',
    month: 2, day: 6, endMonth: 2, endDay: 22,
    motif: 'rings',
    colors: { primary: '#4fc3f7', accent: '#ffd93d' },
  },
  {
    id: 'holi',
    label: 'Happy Holi!',
    month: 3, day: 4,
    motif: 'colors',
    colors: { primary: '#ff6b9d', accent: '#a3e635' },
    priority: 2,
  },
  {
    id: 'eid-fitr',
    label: 'Eid Mubarak',
    month: 3, day: 20, endDay: 21,
    motif: 'crescent',
    colors: { primary: '#66bb6a', accent: '#ffd93d' },
  },
  {
    id: 'world-cup-2026',
    label: 'FIFA World Cup 2026',
    month: 6, day: 11, endMonth: 7, endDay: 19,
    motif: 'ball',
    colors: { primary: '#66bb6a', accent: '#4fc3f7' },
  },
  {
    // NOTE: actual Raksha Bandhan in 2026 falls on Aug 28 (it's a lunar
    // date, see the file header) — this range was set deliberately per a
    // product request to run Aug 2–15 instead (a promotional window, not
    // the real festival date). Update/remove if that's no longer wanted.
    id: 'raksha-bandhan',
    label: 'Happy Raksha Bandhan',
    month: 8, day: 2, endDay: 15,
    motif: 'rakhi',
    colors: { primary: '#ff6b9d', accent: '#ffd93d' },
    priority: 2,
  },
  {
    id: 'independence-day-in',
    label: 'Happy Independence Day',
    month: 8, day: 15,
    motif: 'flag',
    colors: { primary: '#ff9933', accent: '#138808' },
  },
  {
    id: 'halloween',
    label: 'Happy Halloween',
    month: 10, day: 31,
    motif: 'spooky',
    colors: { primary: '#ff9142', accent: '#a78bfa' },
  },
  {
    id: 'diwali',
    label: 'Happy Diwali!',
    month: 11, day: 8,
    motif: 'diyas',
    colors: { primary: '#ffb74d', accent: '#d4a017' },
    priority: 2,
  },
  {
    id: 'christmas',
    label: 'Happy Holidays',
    month: 12, day: 24, endDay: 26,
    motif: 'snow',
    colors: { primary: '#4fc3f7', accent: '#ff6b9d' },
  },
]

function inRange(m: number, d: number, ev: DoodleEvent): boolean {
  const startM = ev.month
  const endM = ev.endMonth ?? ev.month
  const startD = ev.day
  const endD = ev.endDay ?? ev.day
  if (startM === endM) return m === startM && d >= startD && d <= endD
  // spans a month boundary (e.g. Jun 11 – Jul 19)
  if (m === startM) return d >= startD
  if (m === endM) return d <= endD
  return m > startM && m < endM
}

/** Returns the highest-priority matching event for a given date, or null. */
export function findDoodleEvent(date: Date): DoodleEvent | null {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const matches = DOODLE_EVENTS.filter((ev) => inRange(m, d, ev))
  if (!matches.length) return null
  return matches.reduce((best, ev) => ((ev.priority ?? 1) > (best.priority ?? 1) ? ev : best))
}

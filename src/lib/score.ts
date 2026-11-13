// Play-along accuracy, judged like rhythm games (osu!, DDR, Taiko): every note of the practice bell
// scores by how far the tap landed from its beat. Times are in ms on the audio clock.
export const WINDOWS = [
  { ms: 40, points: 1, label: 'Odlično' },
  { ms: 80, points: 0.7, label: 'Dobro' },
  { ms: 130, points: 0.4, label: 'Za las' },
]
export const MISS_MS = WINDOWS.at(-1)!.ms

// a beat the player should hit, at `ms`; off = how far their tap was from it, null until hit
export interface Note {
  ms: number
  off: number | null
}
export interface Result {
  score: number // 0–100
  counts: number[] // hits per window in WINDOWS
  miss: number
  stray: number
  mean: number // average offset in ms, negative = early
}

// Match a tap to the closest not-yet-hit note within the widest window. false = stray tap.
export function hit(notes: Note[], tapMs: number): boolean {
  let best: Note | undefined
  for (const n of notes)
    if (
      n.off == null &&
      Math.abs(tapMs - n.ms) <= MISS_MS &&
      (!best || Math.abs(tapMs - n.ms) < Math.abs(tapMs - best.ms))
    )
      best = n
  if (best) best.off = tapMs - best.ms
  return !!best
}

// notes: [{ ms, off }], off = null when missed. Stray taps count as misses so mashing doesn't pay.
// mean: average offset, negative = early (rushing), positive = late (dragging).
export function score(notes: Note[], stray: number): Result {
  const counts = WINDOWS.map(() => 0)
  const offs: number[] = []
  let points = 0
  for (const n of notes) {
    if (n.off == null) continue
    const off = n.off
    const k = WINDOWS.findIndex((w) => Math.abs(off) <= w.ms) // always found: hit() only accepts taps within MISS_MS
    counts[k]!++
    points += WINDOWS[k]!.points
    offs.push(off)
  }
  const total = notes.length + stray
  return {
    score: total ? Math.round((100 * points) / total) : 0,
    counts,
    miss: notes.length - offs.length,
    stray,
    mean: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : 0,
  }
}

// One play-along's bookkeeping: the beats the player should hit, their taps, and the result at the end.
export function createJudge() {
  let notes: Note[] = []
  let stray = 0
  return {
    expect(ms: number) {
      notes.push({ ms, off: null })
    },
    tap(ms: number) {
      if (!hit(notes, ms)) stray++
    },
    // on pause: forget beats that were queued ahead but never came
    dropAfter(ms: number) {
      notes = notes.filter((n) => n.ms <= ms)
    },
    // beats still inside their window at `nowMs` are left out; null when nothing was due yet
    result(nowMs: number): Result | null {
      const due = notes.filter((n) => n.off != null || n.ms + MISS_MS < nowMs)
      return due.length ? score(due, stray) : null
    },
    reset() {
      notes = []
      stray = 0
    },
  }
}

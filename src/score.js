// Play-along accuracy, judged like rhythm games (osu!, DDR, Taiko): every note of the practice bell
// scores by how far the tap landed from its beat. Times are in ms on the audio clock.
export const WINDOWS = [
  { ms: 40, points: 1, label: 'Odlično' },
  { ms: 80, points: 0.7, label: 'Dobro' },
  { ms: 130, points: 0.4, label: 'Za las' },
]
export const MISS_MS = WINDOWS.at(-1).ms

// Match a tap to the closest not-yet-hit note within the widest window. false = stray tap.
export function hit(notes, tapMs) {
  let best
  for (const n of notes)
    if (n.off == null && Math.abs(tapMs - n.ms) <= MISS_MS && (!best || Math.abs(tapMs - n.ms) < Math.abs(tapMs - best.ms))) best = n
  if (best) best.off = tapMs - best.ms
  return !!best
}

// notes: [{ ms, off }], off = null when missed. Stray taps count as misses so mashing doesn't pay.
// mean: average offset, negative = early (rushing), positive = late (dragging).
export function score(notes, stray) {
  const counts = WINDOWS.map(() => 0)
  const offs = []
  let points = 0
  for (const n of notes) {
    if (n.off == null) continue
    const k = WINDOWS.findIndex((w) => Math.abs(n.off) <= w.ms)
    counts[k]++
    points += WINDOWS[k].points
    offs.push(n.off)
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

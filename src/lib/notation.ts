// Score layout helpers shared by the notation views: pure functions of a piece's strikes.
import type { Strike } from './melodies.ts'

// a strike with its index in the piece
export type IndexedStrike = Strike & { i: number }
// a melody note and the hosting x after it (null when it has none)
export interface Pair {
  lead: IndexedStrike
  host: IndexedStrike | null
}

// a beat = one melody note + its x, a bar = one pass of the melody (Mercinova 3/4, Štirka 4/4)
export const beatsPerBar = (strikes: Strike[]) => Math.max(...strikes.map((s) => +s.label || 0))

// bells a piece uses: Renška 3, the rest 4 (bells are 0-based, so the highest + 1)
export const bellCount = (strikes: Strike[]) => Math.max(...strikes.map((s) => s.bell)) + 1

// strikes per bar = distance to the next melody note 1 (Mercinova 6 with the x strikes, Po pet 4); rows always start on a bar
export const barLen = (strikes: Strike[]) => strikes.findIndex((s, i) => i > 0 && s.label === '1')

// Po Malavašiču and the staff views: each melody note with its hosting x strike (if any).
// New line when the hosting bell changes (a new phase) or after two bars.
export function pairLines(strikes: Strike[], perBar: number): Pair[][] {
  const lines: Pair[][] = []
  for (let i = 0; i < strikes.length;) {
    const next = strikes[i + 1]
    const host = next?.label === 'x' ? { ...next, i: i + 1 } : null
    const pair: Pair = { lead: { ...strikes[i]!, i }, host }
    i += host ? 2 : 1
    const last = lines.at(-1)
    const sameLine = last && last.length < 2 * perBar && last[0]!.host?.bell === host?.bell
    if (sameLine) last.push(pair)
    else lines.push([pair])
  }
  return lines
}

// Po Malavašiču wraps only between these groups of pairs (a bar, or a piece's own `group` when its bar is long)
export const groups = <T>(line: T[], len: number): T[][] =>
  Array.from({ length: Math.ceil(line.length / len) }, (_, g) => line.slice(g * len, (g + 1) * len))

// Count-in before the melody: 3 for melodies in 3/4 (a bar of 3, 6, 9 … beats, e.g. Mercinova, Tri dva ena), else 4
export const countInBeats = (strikes: Strike[]) => (beatsPerBar(strikes) % 3 === 0 ? 3 : 4)

// Groups per row when a line of n groups is laid out where only `fit` fit side by side: the whole line if it
// fits, else equal rows (3 groups → 1 + 1 + 1 rather than 2 + 1; 4 → 2 + 2), allowing one row more than the
// minimum for that; when no equal split is near, rows as full as the minimum number of rows needs.
export function rowLength(n: number, fit: number): number {
  if (n <= fit) return n
  const rows = Math.ceil(n / Math.max(1, fit))
  for (const r of [rows, rows + 1]) if (n % r === 0) return n / r
  return Math.ceil(n / rows)
}

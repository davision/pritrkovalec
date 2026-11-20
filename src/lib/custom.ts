// Melodies made by users: a short definition (as a ringer would describe it) that turn() builds into strikes,
// and the check whether the same melody is already in the app under another name.
import { turn, type Piece, type Strike } from './melodies.ts'
import { bellCount } from './notation.ts'

export interface MelodyDef {
  name: string
  bells: number // 3 or 4
  melody: number[] // bells of the first round as written, 1-based: "1 1 2 2" → [1, 1, 2, 2]
  host: number // the bell that hosts (x) in the first round, 1-based
  reps: number // times the line plays before the next bell takes over
  turn: boolean // naokoli: rotates over all the bells; else only the first round
  perBar: number // notes per bar: metronome, count-in and line length
}
export const MAX_NOTES = 32
export const MAX_NAME = 60

// "1 1 2 2", "1122" or "1,1,2,2" → [1, 1, 2, 2]; an error message when a note isn't a bell
export function parseMelody(text: string, bells: number): number[] | string {
  const notes = text
    .replace(/[\s,.;-]+/g, '')
    .split('')
    .filter(Boolean)
  if (!notes.length) return 'Vpiši melodijo, npr. 1 1 2 2'
  if (notes.some((n) => !/^\d$/.test(n) || +n < 1 || +n > bells))
    return `Uporabi samo številke zvonov od 1 do ${bells}`
  if (notes.length > MAX_NOTES) return `Največ ${MAX_NOTES} not`
  return notes.map(Number)
}

// notes per bar that fit the melody: 4/4 if it divides into fours, else 3/4, else the whole line is one bar
export const defaultPerBar = (len: number) => (len % 4 === 0 ? 4 : len % 3 === 0 ? 3 : len)

export function build(def: MelodyDef): Strike[] {
  const strikes = turn(
    def.melody.map((b) => b - 1),
    { reps: def.reps, bells: def.bells, perBar: def.perBar, host: def.host - 1 },
  )
  // without turning only the first round: melody notes and their x, `reps` times
  return def.turn ? strikes : strikes.slice(0, def.melody.length * 2 * def.reps)
}

// Pieces that sound like this melody: same number of bells, a first round (up to where the hosting bell
// changes) that is exactly this line played one or more times, then the round on the next bell when this one
// turns, or no other round when it doesn't. How often the line repeats doesn't matter: Mercinova played
// once or twice per bell is the same melody. A longer line that merely starts the same (Renška's 1 2 1 2 …)
// is a different one.
export function findSame(def: MelodyDef, pieces: Piece[]): Piece[] {
  const len = def.melody.length * 2 // one pass of the line with its x strikes
  const pass = build({ ...def, reps: 1, turn: true }).map((s) => s.bell)
  const first = pass.slice(0, len)
  const next = pass.slice(len, 2 * len) // the line on the next bell
  return pieces.filter((p) => {
    if (bellCount(p.strikes) !== def.bells) return false
    const seq = p.strikes.map((s) => s.bell)
    const hostAt = p.strikes.findIndex((s) => s.label === 'x')
    const round = p.strikes.findIndex(
      (s, i) => s.label === 'x' && s.bell !== p.strikes[hostAt]!.bell && i > hostAt,
    )
    const end = round < 0 ? seq.length : round - 1 // the round's last strike before the new host's note
    if (end === 0 || end % len !== 0) return false
    for (let i = 0; i < end; i++) if (seq[i] !== first[i % len]) return false
    if (!def.turn) return round < 0
    return next.every((b, i) => seq[end + i] === b)
  })
}

// name comparison: case, spaces and diacritics don't count ("Renska" = "Renška")
export const sameName = (a: string, b: string) => norm(a) === norm(b)
export const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Run: npm test
import assert from 'node:assert/strict'
import { pieces, type Piece } from './melodies.ts'
import {
  beatsPerBar,
  barLen,
  bellCount,
  pairLines,
  groups,
  countInBeats,
  rowLength,
} from './notation.ts'

const [mercinova, stirka] = pieces as [Piece, Piece, ...Piece[]]
assert.equal(beatsPerBar(mercinova.strikes), 3)
assert.equal(barLen(mercinova.strikes), 6) // 3 notes + 3 x
assert.equal(beatsPerBar(stirka.strikes), 4)

// Mercinova: 4 phases, each 2 bars of 3 pairs on one line; bell 4 hosts the first
const lines = pairLines(mercinova.strikes, 3)
const first = lines[0]!
assert.equal(lines.length, 4)
assert.deepEqual(
  first.map((p) => [p.lead.bell + 1, p.host!.bell + 1]),
  [
    [1, 4],
    [2, 4],
    [3, 4],
    [1, 4],
    [2, 4],
    [3, 4],
  ],
)
assert.deepEqual(
  groups(first, 3).map((g) => g.length),
  [3, 3],
) // wraps between the two bars

// count-in: 3 for 3/4 melodies, 4 for the rest
const countIns = Object.fromEntries(pieces.map((p) => [p.name, countInBeats(p.strikes)]))
assert.deepEqual(countIns, {
  'Mercinova naokoli': 3,
  'Štirka naokoli': 4,
  'Mercinova naokoli; s poudarki (variacija)': 3,
  'Po pet (navadna)': 4,
  'Po pet naokoli': 4,
  'Tri dva ena na štiri': 3,
  Renška: 4,
  'Tri dva ena': 3,
  'Enkt dvakt': 4,
})

// bells a piece uses: only the 3-bell pieces leave out bell 4
assert.deepEqual(
  pieces.filter((p) => bellCount(p.strikes) !== 4).map((p) => [p.name, bellCount(p.strikes)]),
  [
    ['Renška', 3],
    ['Tri dva ena', 3],
    ['Enkt dvakt', 3],
  ],
)

// Malavašič rows: equal rows when a line doesn't fit
assert.equal(rowLength(3, 3), 3) // fits
assert.equal(rowLength(3, 2), 1) // 1 + 1 + 1, not 2 + 1
assert.equal(rowLength(4, 3), 2) // 2 + 2
assert.equal(rowLength(4, 2), 2)
assert.equal(rowLength(5, 4), 3) // no equal split near: 3 + 2
assert.equal(rowLength(2, 0), 1) // even one group is too wide: one per row
assert.equal(rowLength(3, Infinity), 3) // not measured yet

console.log('notation ok')

// Run: npm test
import assert from 'node:assert/strict'
import { pieces, type Piece } from './melodies.ts'
import { beatsPerBar, barLen, pairLines, groups, countInBeats } from './notation.ts'

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
  'Tri dva ena': 3,
})

console.log('notation ok')

// Checks the generated pieces against the PDF transcription. Run: npm test
import assert from 'node:assert/strict'
import { pieces, ROW } from './melodies.js'

const [mercinova, stirka, variacija, popet] = pieces
const bells = (s, from, n) => s.slice(from, from + n).map((x) => x.bell + 1)

// PDF row 1: 1 x 2 x 3 x (bell 4 hosting), then bell 2 starts with bell 1 hosting
assert.deepEqual(bells(mercinova.strikes, 0, 12), [1, 4, 2, 4, 3, 4, 1, 4, 2, 4, 3, 4])
assert.deepEqual(bells(mercinova.strikes, 12, 6), [2, 1, 3, 1, 4, 1])
assert.deepEqual(bells(mercinova.strikes, 36, 6), [4, 3, 1, 3, 2, 3])
assert.equal(mercinova.strikes.length, ROW)

// variation keeps the full PDF form: melody twice per bell
assert.deepEqual(bells(variacija.strikes, 0, 12), [1, 4, 2, 4, 3, 4, 1, 4, 2, 4, 3, 4])

// PDF row 4: melody 1 3 2 3 with bell 4 hosting; phase 2 starts on bell 2 → 2 4 3 4
assert.deepEqual(bells(stirka.strikes, 0, 8), [1, 4, 3, 4, 2, 4, 3, 4])
assert.deepEqual(bells(stirka.strikes, 16, 8), [2, 1, 4, 1, 3, 1, 4, 1])
assert.equal(stirka.strikes.length, 64) // one turn: 4 phases × 16 strikes

// PDF row 9: accents on the first note of each phase (the app plays just the accented turn)
assert.deepEqual(
  variacija.strikes.flatMap((s, i) => (s.accent ? [i] : [])),
  [0, 12, 24, 36],
)
// Po pet: melody + x; bell 4 hosts 4 bars, bell 3 the next 4, then mirrored (bell 1 hosts first, melody 4 2 2 2)
assert.equal(popet.strikes.length, 128)
assert.deepEqual(bells(popet.strikes, 0, 8), [1, 4, 3, 4, 3, 4, 3, 4])
assert.deepEqual(bells(popet.strikes, 32, 4), [2, 3, 4, 3])
assert.deepEqual(bells(popet.strikes, 64, 8), [4, 1, 2, 1, 2, 1, 2, 1])
assert.deepEqual(bells(popet.strikes, 96, 4), [3, 2, 1, 2])
assert.deepEqual(popet.strikes.slice(0, 10).map((s) => s.label), ['1', 'x', '2', 'x', '3', 'x', '4', 'x', '1', 'x'])

console.log('melodies ok')

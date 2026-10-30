// Checks the generated pieces against the PDF transcription. Run: npm test
import assert from 'node:assert/strict'
import { pieces, ROW } from './melodies.js'

const [mercinova, stirka, variacija] = pieces
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
assert.equal(stirka.strikes.length, 4 * ROW)

// PDF row 9: accents on the first note of each phase, second row only
assert.deepEqual(
  variacija.strikes.flatMap((s, i) => (s.accent ? [i] : [])),
  [48, 60, 72, 84],
)
console.log('melodies ok')

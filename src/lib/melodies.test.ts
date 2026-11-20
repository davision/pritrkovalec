// Checks the generated pieces against the PDF transcription. Run: npm test
import assert from 'node:assert/strict'
import { pieces, ROW, type Piece, type Strike } from './melodies.ts'

const [mercinova, stirka, variacija, popet] = pieces as [Piece, Piece, Piece, Piece, ...Piece[]]
const bells = (s: Strike[], from: number, n: number) =>
  s.slice(from, from + n).map((x) => x.bell + 1)

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
// Po pet: melody + x; bell 4 hosts the first 4 bars, bell 3 the next 4
assert.equal(popet.strikes.length, 64)
assert.deepEqual(bells(popet.strikes, 0, 8), [1, 4, 3, 4, 3, 4, 3, 4])
assert.deepEqual(bells(popet.strikes, 32, 4), [2, 3, 4, 3])
assert.deepEqual(
  popet.strikes.slice(0, 10).map((s) => s.label),
  ['1', 'x', '2', 'x', '3', 'x', '4', 'x', '1', 'x'],
)

// Renška: 3 bells only; 1 2 1 2 1 1 1 2 with bell 3 hosting, twice, then bell 2 starts with bell 1 hosting
const renska = pieces.find((p) => p.name === 'Renška')!
assert.deepEqual(bells(renska.strikes, 0, 16), [1, 3, 2, 3, 1, 3, 2, 3, 1, 3, 1, 3, 1, 3, 2, 3])
assert.deepEqual(bells(renska.strikes, 16, 2), [1, 3]) // second repetition
assert.deepEqual(bells(renska.strikes, 32, 4), [2, 1, 3, 1])
assert.deepEqual(bells(renska.strikes, 64, 4), [3, 2, 1, 2])
assert.equal(renska.strikes.length, 96) // 3 phases × 2 reps × 16 strikes
assert.ok(renska.strikes.every((s) => s.bell < 3))
// two 4/4 bars: notes numbered 1–4, 1–4
assert.deepEqual(
  renska.strikes
    .slice(0, 16)
    .filter((s) => s.label !== 'x')
    .map((s) => s.label),
  ['1', '2', '3', '4', '1', '2', '3', '4'],
)

// Tri dva ena on 3 bells: 1 1 1 2 1 1 2 1 2 with bell 3 hosting, once, then bell 2 starts with bell 1 hosting
const tde = pieces.find((p) => p.name === 'Tri dva ena')!
assert.deepEqual(bells(tde.strikes, 0, 18), [1, 3, 1, 3, 1, 3, 2, 3, 1, 3, 1, 3, 2, 3, 1, 3, 2, 3])
assert.deepEqual(bells(tde.strikes, 18, 8), [2, 1, 2, 1, 2, 1, 3, 1])
assert.deepEqual(bells(tde.strikes, 36, 8), [3, 2, 3, 2, 3, 2, 1, 2])
assert.equal(tde.strikes.length, 54) // 3 phases × 9 notes × 2

// Tri dva ena na štiri: the same line on 4 bells; bell 3 hosts and bell 4 waits, then it turns over all 4
const tde4 = pieces.find((p) => p.name === 'Tri dva ena na štiri')!
assert.deepEqual(bells(tde4.strikes, 0, 8), [1, 3, 1, 3, 1, 3, 2, 3])
assert.deepEqual(bells(tde4.strikes, 18, 8), [2, 4, 2, 4, 2, 4, 3, 4])
assert.deepEqual(bells(tde4.strikes, 54, 8), [4, 2, 4, 2, 4, 2, 1, 2])
assert.equal(tde4.strikes.length, 72) // 4 phases × 9 notes × 2

// 1 1 2 2 on 3 bells, bell 3 hosting, twice per bell, then it turns
const dd = pieces.find((p) => p.name === 'Enkt dvakt')!
assert.deepEqual(bells(dd.strikes, 0, 16), [1, 3, 1, 3, 2, 3, 2, 3, 1, 3, 1, 3, 2, 3, 2, 3])
assert.deepEqual(bells(dd.strikes, 16, 8), [2, 1, 2, 1, 3, 1, 3, 1])
assert.deepEqual(bells(dd.strikes, 32, 8), [3, 2, 3, 2, 1, 2, 1, 2])
assert.equal(dd.strikes.length, 48) // 3 phases × 2 reps × 8 strikes

console.log('melodies ok')

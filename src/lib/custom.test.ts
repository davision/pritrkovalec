// Run: npm test
import assert from 'node:assert/strict'
import { pieces } from './melodies.ts'
import { build, findSame, parseMelody, defaultPerBar, sameName, type MelodyDef } from './custom.ts'

assert.deepEqual(parseMelody('1 1 2 2', 3), [1, 1, 2, 2])
assert.deepEqual(parseMelody('1122', 3), [1, 1, 2, 2])
assert.deepEqual(parseMelody(' 1, 2,3 ', 4), [1, 2, 3])
assert.equal(typeof parseMelody('1 2 4', 3), 'string') // no bell 4 on 3 bells
assert.equal(typeof parseMelody('1 a', 4), 'string')
assert.equal(typeof parseMelody('', 4), 'string')
assert.equal(typeof parseMelody('1'.repeat(33), 4), 'string')

assert.equal(defaultPerBar(8), 4)
assert.equal(defaultPerBar(9), 3)
assert.equal(defaultPerBar(5), 5)

const def = (d: Partial<MelodyDef>): MelodyDef => ({
  name: 'Nova',
  bells: 3,
  melody: [1, 1, 2, 2],
  host: 3,
  reps: 2,
  turn: true,
  perBar: 4,
  ...d,
})
const names = (d: MelodyDef) => findSame(d, pieces).map((p) => p.name)

// Enkt dvakt written the way a ringer would: found, also with a different number of repeats
const enkt = pieces.find((p) => p.name === 'Enkt dvakt')!
assert.deepEqual(build(def({})), enkt.strikes)
assert.deepEqual(names(def({})), ['Enkt dvakt'])
assert.deepEqual(names(def({ reps: 1 })), ['Enkt dvakt'])
// not turning, other host or other bells: a different melody
assert.deepEqual(names(def({ turn: false })), [])
assert.deepEqual(names(def({ host: 1, melody: [2, 2, 3, 3] })), [])
assert.deepEqual(names(def({ melody: [1, 2, 1, 2] })), []) // only the start of Renška
assert.deepEqual(names(def({ melody: [1, 2, 1, 2, 1, 1, 1, 2] })), ['Renška'])

// Mercinova: 1 2 3, bell 4 hosting; the accented variation sounds the same bells
assert.deepEqual(names(def({ bells: 4, melody: [1, 2, 3], host: 4 })), [
  'Mercinova naokoli',
  'Mercinova naokoli; s poudarki (variacija)',
])
// Tri dva ena na štiri: bell 3 hosts, bell 4 waits
assert.deepEqual(names(def({ bells: 4, melody: [1, 1, 1, 2, 1, 1, 2, 1, 2], host: 3, reps: 1 })), [
  'Tri dva ena na štiri',
])

// without turning only the first round
assert.equal(build(def({ turn: false })).length, 4 * 2 * 2)
assert.deepEqual(
  [...new Set(build(def({ turn: false })).map((s) => s.bell + 1))].sort(),
  [1, 2, 3], // bells 1 and 2 ring the melody, bell 3 hosts: the line never moves on
)

assert.ok(sameName('Renska', 'Renška '))
assert.ok(sameName('ENKT  dvakt', 'Enkt dvakt'))
assert.ok(!sameName('Enkt', 'Enkt dvakt'))

console.log('custom ok')

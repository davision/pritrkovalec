// Run: npm test
import assert from 'node:assert/strict'
import { hit, score, createJudge, type Note } from './score.ts'

const notes = [0, 500, 1000, 1500].map((ms) => ({ ms, off: null }))
assert.equal(hit(notes, 10), true) // odlično
assert.equal(hit(notes, 560), true) // dobro, late
assert.equal(hit(notes, 880), true) // za las, early
assert.equal(hit(notes, 1250), false) // between notes: stray
// note 1500 never tapped: miss

const r = score(notes, 1)
assert.deepEqual(r.counts, [1, 1, 1])
assert.equal(r.miss, 1)
assert.equal(r.score, Math.round((100 * (1 + 0.7 + 0.4)) / 5))
assert.equal(r.mean, Math.round((10 + 60 - 120) / 3))

// a tap matches the closest note, and a note can be hit only once
const two: [Note, Note] = [
  { ms: 0, off: null },
  { ms: 100, off: null },
]
hit(two, 70)
assert.equal(two[1].off, -30)
assert.equal(hit(two, 95), true) // falls back to the other note still in range
assert.equal(two[0].off, 95)
assert.equal(score([], 0).score, 0)

// judge: beats due by the end are scored, later ones are left out, a far tap is stray
const j = createJudge()
j.expect(0)
j.expect(500)
j.expect(10000) // still in the future at the end
assert.equal(j.result(-1000), null) // nothing due yet
j.tap(5) // odlično on beat 0
j.tap(300) // stray
const jr = j.result(2000)!
assert.deepEqual([jr.counts[0], jr.miss, jr.stray], [1, 1, 1]) // beat 500 missed
j.dropAfter(400) // pause at 400 ms: beats queued after it never came
assert.equal(j.result(2000)!.miss, 0)
j.reset()
assert.equal(j.result(99999), null)

console.log('score ok')

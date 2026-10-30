<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { pieces, ROW } from './melodies.js'
import { tunings, Bells } from './bell.js'

const pieceIdx = ref(0)
const rpm = ref(250)
const tuning = ref(Object.keys(tunings)[0])
const practice = ref(-1) // muted bell the user plays with space, -1 = none
const hostVolume = ref(100) // % volume of the x strikes, 0 = only the lead melody plays
const playing = ref(false)
const current = ref(-1)
const waitForMe = ref(false) // pause before each practice-bell note until space is pressed
const waiting = ref(-1) // strike index the melody is paused on
const metronome = ref(false)
const view = ref('seq') // score style: 'drum' = Bobnarske note (as in the PDF), 'seq' = Sekvenca
const clickOnly = ref(false) // metronome-only playback, bells silent
const flash = ref(-1)

const piece = computed(() => pieces[pieceIdx.value])
const cols = computed(() => Math.min(ROW, piece.value.strikes.length))
const freqs = computed(() => tunings[tuning.value])
// a beat = one melody note + its x, a bar = one pass of the melody (Mercinova 3/4, Štirka 4/4)
const beatsPerBar = computed(() => Math.max(...piece.value.strikes.map((s) => +s.label || 0)))
const barLen = computed(() => 2 * beatsPerBar.value) // strikes per bar; rows always start on a bar
const rows = computed(() => {
  const out = []
  piece.value.strikes.forEach((s, i) => (out[Math.floor(i / cols.value)] ??= []).push({ ...s, i, col: i % cols.value }))
  return out
})
const currentRow = computed(() => (current.value < 0 ? -1 : Math.floor(current.value / cols.value)))
const currentBell = computed(() => piece.value.strikes[current.value]?.bell ?? -1)

// Web Audio lookahead scheduler: audio is timed by the AudioContext, visuals follow via rAF.
let bells, timer, raf, next, nextTime, queue
let waitAt = -1 // scheduler stopped before this strike, waiting for the player
const LOOKAHEAD = 0.1
const GRACE = 0.3 // wait mode: seconds after a note is due before the melody counts as stopped

function audio() {
  bells ??= new Bells()
  bells.resume()
  return bells
}

function schedule() {
  const strikes = piece.value.strikes
  while (waitAt < 0 && nextTime < bells.ctx.currentTime + LOOKAHEAD) {
    const s = strikes[next]
    if (waitForMe.value && s.bell === practice.value) {
      waitAt = next
      queue.push({ i: next, t: nextTime + GRACE, wait: true }) // show the pause once the grace period is over
      return
    }
    const volume = s.label === 'x' ? hostVolume.value / 100 : 1
    if (!clickOnly.value && s.bell !== practice.value && volume > 0) bells.ring(freqs.value[s.bell], nextTime, s.accent, volume)
    if ((metronome.value || clickOnly.value) && s.label !== 'x') bells.click(nextTime, s.label === '1')
    queue.push({ i: next, t: nextTime })
    nextTime += 60 / rpm.value
    next = (next + 1) % strikes.length
  }
}

function draw() {
  while (queue.length && queue[0].t <= bells.ctx.currentTime) {
    const q = queue.shift()
    q.wait ? (waiting.value = q.i) : (current.value = q.i)
  }
  raf = requestAnimationFrame(draw)
}

function play(from = 0) {
  audio()
  next = from
  // starting after a strike the user just rang by hand: the next one is one beat away
  nextTime = bells.ctx.currentTime + (from ? 60 / rpm.value : LOOKAHEAD)
  queue = []
  waitAt = waiting.value = -1
  current.value = from - 1
  timer = setInterval(schedule, 25)
  raf = requestAnimationFrame(draw)
  playing.value = true
}

function stop() {
  clearInterval(timer)
  cancelAnimationFrame(raf)
  playing.value = false
  clickOnly.value = false
  current.value = waitAt = waiting.value = -1
}

function continueFrom(i, t) {
  next = i % piece.value.strikes.length
  nextTime = t
  waitAt = waiting.value = -1
  queue = queue.filter((q) => !q.wait)
}

function ring(bell) {
  audio().ring(freqs.value[bell])
  flash.value = bell
  setTimeout(() => flash.value === bell && (flash.value = -1), 150)
}

function onKey(e) {
  if (e.code === 'Escape' && e.type === 'keydown') return stop()
  // 1–4 picks the bell to play along, 0 = all bells play
  if (/^Digit[0-4]$/.test(e.code) && e.type === 'keydown' && !e.metaKey && !e.ctrlKey) {
    e.preventDefault()
    return (practice.value = +e.code.at(-1) - 1)
  }
  if ((e.code === 'KeyP' || e.code === 'KeyM') && e.type === 'keydown' && !e.repeat && !e.metaKey && !e.ctrlKey) {
    e.preventDefault()
    const toggle = e.code === 'KeyP' ? waitForMe : metronome
    return (toggle.value = !toggle.value)
  }
  if (e.code === 'KeyS' && e.type === 'keydown' && !e.repeat && !e.metaKey && !e.ctrlKey) {
    e.preventDefault() // don't jump to an option in a focused dropdown
    return playing.value ? stop() : play()
  }
  if (e.code !== 'Space') return
  e.preventDefault() // keep space from scrolling / activating focused controls
  if (e.type !== 'keydown' || e.repeat || practice.value < 0) return
  ring(practice.value)
  // the first press on the opening bell counts as strike 1, the melody continues in tempo from it
  if (!playing.value && practice.value === piece.value.strikes[0].bell) play(1)
  else if (waitAt >= 0) {
    // the player rang the awaited note: it counts as that strike. Within the grace period the melody
    // keeps its original beat (nextTime still holds the due time), otherwise it resumes one beat after the press.
    const now = bells.ctx.currentTime
    current.value = waitAt
    continueFrom(waitAt + 1, (now <= nextTime + GRACE ? nextTime : now) + 60 / rpm.value)
  }
}

// turning waiting off or switching bells mid-pause would leave the melody stuck: just carry on
watch([waitForMe, practice], () => waitAt >= 0 && continueFrom(waitAt, bells.ctx.currentTime + LOOKAHEAD))

watch(pieceIdx, stop)
watch(currentRow, (r) => r >= 0 && document.getElementById(`row-${r}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
})
</script>

<template>
  <main>
    <header>
      <h1>Pritrkavanje</h1>
      <p class="sub">Letna · Avtor: Jože Mehle</p>
    </header>

    <section class="controls">
      <label>
        Melodija
        <select v-model.number="pieceIdx">
          <option v-for="(p, i) in pieces" :key="p.name" :value="i">{{ p.name }}</option>
        </select>
      </label>
      <label>
        <span>Tempo <output>{{ rpm }}</output> udarcev/min</span>
        <input type="range" min="30" max="600" step="10" v-model.number="rpm" />
      </label>
      <label>
        Pogled
        <select v-model="view">
          <option value="drum">Bobnarske note</option>
          <option value="seq">Sekvenca</option>
        </select>
      </label>
      <label>
        Uglasitev
        <select v-model="tuning">
          <option v-for="name in Object.keys(tunings)" :key="name">{{ name }}</option>
        </select>
      </label>
      <fieldset>
        <legend>Igram zvon (preslednica)</legend>
        <label v-for="b in [-1, 0, 1, 2, 3]" :key="b" class="radio" :class="b >= 0 && `b${b}`">
          <input type="radio" :value="b" v-model="practice" />
          {{ b < 0 ? 'brez' : b + 1 }}
        </label>
      </fieldset>
      <label>
        <span>Glasnost spremljave (x) <output>{{ hostVolume }}</output> %</span>
        <input type="range" min="0" max="100" step="5" v-model.number="hostVolume" />
      </label>
      <label class="check">
        <input type="checkbox" v-model="waitForMe" />
        Počakaj name (P)
      </label>
      <label class="check">
        <input type="checkbox" v-model="metronome" />
        Metronom {{ beatsPerBar }}/4 (M)
      </label>
      <button class="play" @click="playing ? stop() : play()">{{ playing ? '■ Ustavi' : '▶ Predvajaj' }}</button>
      <button class="play secondary" :disabled="playing" @click="(clickOnly = true), play()">♩ Samo metronom</button>
    </section>

    <section class="score" :class="[view, { practising: practice >= 0 }]" :style="{ '--host-opacity': 0.25 + (0.75 * hostVolume) / 100 }">
      <h2>:{{ piece.name }}</h2>
      <div v-for="(row, r) in rows" :id="`row-${r}`" :key="r" class="row" :class="{ active: r === currentRow }">
        <div class="bell-nums">
          <button
            v-for="b in 4"
            :key="b"
            :class="[`b${b - 1}`, { hit: flash === b - 1 }]"
            :aria-label="`Udari zvon ${b}`"
            @click="ring(b - 1)"
          >
            {{ b }}
          </button>
        </div>
        <div class="grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
          <div
            v-for="b in 4"
            :key="b"
            class="line"
            :class="[`b${b - 1}`, { now: r === currentRow && currentBell === b - 1, mine: practice === b - 1, hit: flash === b - 1 }]"
            :style="{ gridRow: b }"
          />
          <div v-if="practice >= 0" class="lane" :style="{ gridRow: practice + 1 }" />
          <div v-if="r === currentRow" class="col-hl" :style="{ gridColumn: (current % cols) + 1 }" />
          <template v-for="s in row" :key="s.i">
            <span
              class="note"
              :class="[`b${s.bell}`, { x: s.label === 'x', now: s.i === current, waiting: s.i === waiting, past: s.i < current, mine: s.bell === practice }]"
              :style="{ gridColumn: s.col + 1, gridRow: s.bell + 1 }"
            >
              <i v-if="s.accent" class="accent">&gt;</i>{{ view === 'drum' ? s.label : '' }}
            </span>
            <template v-if="view === 'seq'">
              <template v-for="b in 4" :key="b">
                <span v-if="b - 1 !== s.bell" class="note pause" :class="`b${b - 1}`" :style="{ gridColumn: s.col + 1, gridRow: b }" />
              </template>
              <span v-if="s.col && s.col % barLen === 0" class="bar-line" :style="{ gridColumn: s.col + 1 }" />
            </template>
          </template>
        </div>
      </div>
    </section>

    <p class="hint" v-if="practice >= 0">Zvon {{ practice + 1 }} je utišan, igraš ga ti (obrobljene note).<strong v-if="waiting >= 0"> Čakam nate …</strong></p>
    <ul class="hint shortcuts">
      <li><kbd>preslednica</kbd> udari izbrani zvon (na zvonu 1 začne melodijo)</li>
      <li><kbd>S</kbd> začni / ustavi</li>
      <li><kbd>1</kbd>–<kbd>4</kbd> izberi zvon, <kbd>0</kbd> vsi zvonovi</li>
      <li><kbd>Esc</kbd> ustavi</li>
      <li><kbd>P</kbd> počakaj name</li>
      <li><kbd>M</kbd> metronom</li>
    </ul>
  </main>
</template>

<style>
:root {
  --paper: #fbfaf6;
  --ink: #1b1b1b;
  --line: #c9c6bc;
  --muted: #77736a;
  --b0: #e4572e;
  --b1: #2e86de;
  --b2: #17a673;
  --b3: #9b59b6;
  --row-hl: #fff3c4;
  --col-hl: #ffe08a;
  --lane: #fff0b0;
  color-scheme: light;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font: 15px/1.4 system-ui, sans-serif;
}
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
header {
  display: flex;
  align-items: baseline;
  gap: 24px;
  justify-content: center;
}
h1 {
  font-family: Georgia, 'Times New Roman', serif;
  margin: 8px 0;
}
.sub {
  color: var(--muted);
  font-family: Georgia, serif;
}
.b0 { --c: var(--b0); }
.b1 { --c: var(--b1); }
.b2 { --c: var(--b2); }
.b3 { --c: var(--b3); }

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: end;
  padding: 12px 0 20px;
  border-bottom: 1px solid var(--line);
}
.controls > label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--muted);
}
select,
input[type='range'] {
  font: inherit;
  min-width: 200px;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 6px;
  align-items: center;
}
legend {
  font-size: 13px;
  color: var(--muted);
  padding: 0 0 4px;
}
.radio {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--c, var(--line));
  cursor: pointer;
}
.radio:has(:checked) {
  background: var(--c, var(--ink));
  color: #fff;
}
.radio input {
  margin: 0;
}
.play {
  font: inherit;
  font-weight: 600;
  padding: 8px 20px;
  border: 0;
  border-radius: 6px;
  background: var(--ink);
  color: #fff;
  cursor: pointer;
}
.play.secondary {
  background: none;
  color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--ink);
}
.play:disabled {
  opacity: 0.35;
  cursor: default;
}

.score {
  overflow-x: auto;
  padding-bottom: 8px;
}
h2 {
  font: 15px ui-monospace, 'Courier New', monospace;
  margin: 20px 0 4px 28px;
}
.row {
  display: grid;
  grid-template-columns: 28px minmax(948px, 1fr);
  align-items: center;
  padding: 10px 0;
  border-radius: 6px;
  transition: background 0.2s;
}
.row.active {
  background: var(--row-hl);
}
.bell-nums {
  display: grid;
  grid-template-rows: repeat(4, 23px);
  align-self: start;
}
.bell-nums button {
  place-self: center;
  width: 18px;
  height: 18px;
  font: 700 11px/1 ui-monospace, monospace;
  border: 0;
  border-radius: 50%;
  background: var(--c);
  color: #fff;
  cursor: pointer;
  padding: 0;
  transition: transform 0.08s, box-shadow 0.08s;
}
.bell-nums button.hit {
  transform: scale(1.25);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent);
}
.grid {
  display: grid;
  grid-template-columns: repeat(48, 1fr);
  grid-template-rows: repeat(4, 23px);
  position: relative;
}
.line {
  grid-column: 1 / -1;
  align-self: center;
  height: 1px;
  background: var(--line);
  transition: background 0.1s, height 0.1s;
}
/* Sekvenca: each bell's line in its own colour */
:where(.seq) .line {
  background: var(--c);
  opacity: 0.45;
}
.line.mine {
  background: var(--c);
  opacity: 0.5;
}
.line.now,
.line.hit {
  height: 3px;
  background: var(--c);
  opacity: 1;
}
/* the practice bell's line; replaces the whole-row tint so only that line is yellow */
.lane {
  grid-column: 1 / -1;
  background: var(--lane);
  border-radius: 11px;
}
.practising .row.active {
  background: none;
}
.col-hl {
  grid-row: 1 / -1;
  background: var(--col-hl);
  border-radius: 3px;
  margin: -4px 0;
}
.note {
  position: relative;
  justify-self: center;
  align-self: center;
  width: 14px;
  height: 14px;
  background: var(--c);
  color: #fff;
  border-radius: 50%;
  z-index: 1;
  transition: transform 0.08s, background 0.08s;
}
.note.x {
  opacity: var(--host-opacity, 1);
}
/* Sekvenca: hosting strike as a diamond; `rotate` composes with the .now/.waiting `transform: scale` */
:where(.seq) .note.x {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  rotate: 45deg;
}
/* Bobnarske note: numbered squares and x like the PDF; :where keeps specificity low so .now/.waiting still win */
:where(.drum) .note {
  background: var(--ink);
  border-radius: 2px;
  width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  font: 700 11px ui-monospace, monospace;
}
:where(.drum) .note.x {
  background: none;
  color: var(--ink);
  font-weight: 400;
}
.note.pause {
  background: var(--paper);
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--c) 45%, transparent);
  z-index: 0;
}
.bar-line {
  grid-row: 1 / 5;
  justify-self: start;
  width: 0;
  border-left: 1px solid var(--muted);
  margin: -4px 0 -4px -0.5px;
}
.controls > label.check {
  flex-direction: row;
  align-items: center;
  color: var(--ink);
}
.note.waiting {
  background: var(--c);
  animation: pulse 0.8s ease-in-out infinite alternate;
}
@keyframes pulse {
  to {
    transform: scale(1.35);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--c) 30%, transparent);
  }
}
.note.past {
  opacity: 0.55;
}
.note.mine {
  outline: 2px solid var(--c);
  outline-offset: 1px;
}
.note.now {
  background: var(--c);
  color: #fff;
  opacity: 1;
  transform: scale(1.35);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent);
}
.accent {
  position: absolute;
  top: -16px;
  font-style: normal;
  color: var(--ink);
  font-weight: 400;
}
.hint {
  color: var(--muted);
}
.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  list-style: none;
  padding: 0;
}
kbd {
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 0 4px;
  background: #fff;
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
</style>

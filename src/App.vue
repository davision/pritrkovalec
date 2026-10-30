<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { pieces, ROW } from './melodies.js'
import { tunings, Bells } from './bell.js'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Slider from 'primevue/slider'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import '@fontsource/bravura' // SMuFL music font (SIL OFL) for the staff view

const pieceIdx = ref(0)
const TEMPOS = [150, 180, 200, 250] // udarcev na minuto, drsnik preklaplja med temi vrednostmi
const tempoIdx = ref(TEMPOS.indexOf(180))
const rpm = computed(() => TEMPOS[tempoIdx.value])
const pieceOptions = pieces.map((p, i) => ({ label: p.name, value: i }))
const tuningOptions = Object.keys(tunings)
const viewOptions = [
  { label: 'Bobnarske note', value: 'drum' },
  { label: 'Grafični zapis', value: 'seq' },
  { label: 'Po Malavašiču', value: 'mala' },
  { label: 'Notni in številčni zapis', value: 'staff' },
  { label: 'Poenostavljen notni zapis', value: 'simple' },
]
const bellOptions = [-1, 0, 1, 2, 3].map((b) => ({ label: b < 0 ? 'brez' : String(b + 1), value: b }))
const tuning = ref(Object.keys(tunings)[0])
const practice = ref(-1) // muted bell the user plays with space, -1 = none
const hostVolume = ref(100) // % volume of the x strikes, 0 = only the lead melody plays
const playing = ref(false)
const current = ref(-1)
const waitForMe = ref(false) // pause before each practice-bell note until space is pressed
const waiting = ref(-1) // strike index the melody is paused on
const metronome = ref(false)
const view = ref('mala') // score style, one of viewOptions; default Po Malavašiču
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
// Po Malavašiču: one line per phase, each melody note with its hosting bell as a superscript
const malaLines = computed(() => {
  const lines = []
  const s = piece.value.strikes
  for (let i = 0; i < s.length; i += 2) {
    const pair = { lead: { ...s[i], i }, host: { ...s[i + 1], i: i + 1 } }
    const last = lines.at(-1)
    last?.[0].host.bell === pair.host.bell ? last.push(pair) : lines.push([pair])
  }
  return lines
})
// Notni in številčni zapis: percussion staff, one line per bell (bell 1 at the bottom).
// Melody = quarter note, stem down; hosting bell = eighth on the off-beat, stem up. Numbers underneath.
// Drawn with SMuFL glyphs from the Bravura font (font-size = 4 staff spaces); offsets below are in staff spaces (sp) from Bravura's metadata.
const ST = { top: 64, gap: 12, x0: 72, beat: 72, pad: 24 }
const SP = ST.gap
const HEAD_W = 1.18 * SP // noteheadBlack width
const STEM_W = 0.12 * SP
const STEM_LEN = 3.5 * SP
const G = { head: '\uE0A4', headX: '\uE0A9', flag8Up: '\uE240', rest8: '\uE4E6', percClef: '\uE069', accent: '\uE4A0', digit: (n) => String.fromCharCode(0xe080 + n) }
const STAFF_H = 176
const simple = computed(() => view.value === 'simple') // poenostavljen: heads only, x for the hosting bell, bell 1 on top
const gap = computed(() => (simple.value ? 22 : SP)) // simplified staff has wider line spacing, same note size
const lineY = (bell) => ST.top + (simple.value ? bell : 3 - bell) * gap.value
const barX = (m) => ST.x0 + m * (beatsPerBar.value * ST.beat + ST.pad)
const beatX = (k) => barX(Math.floor(k / beatsPerBar.value)) + ST.pad + (k % beatsPerBar.value) * ST.beat
const staffWidth = (line) => barX(line.length / beatsPerBar.value) + 24 // room for the end repeat
const noteClass = (n) => [`b${n.bell}`, { now: n.i === current.value, waiting: n.i === waiting.value, past: n.i < current.value, mine: n.bell === practice.value }]
const currentLine = computed(() => malaLines.value.findIndex((l) => l.some((p) => p.lead.i === current.value || p.host.i === current.value)))
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

// pause keeps the position (current), stop rewinds to the start
function pause() {
  clearInterval(timer)
  cancelAnimationFrame(raf)
  playing.value = false
  waitAt = waiting.value = -1
}

function stop() {
  pause()
  clickOnly.value = false
  current.value = -1
}

// Predvajaj: from the start, or after a pause / step continue one beat after the shown note
function resume() {
  current.value < 0 ? play() : play((current.value + 1) % piece.value.strikes.length)
}

// one strike back or forward (wraps around), sounding it so the step can be heard
function step(d) {
  if (playing.value) pause()
  const n = piece.value.strikes.length
  current.value = (Math.max(current.value, d > 0 ? -1 : 0) + d + n) % n
  const s = piece.value.strikes[current.value]
  audio().ring(freqs.value[s.bell], undefined, s.accent)
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
    return playing.value ? pause() : resume()
  }
  if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && e.type === 'keydown' && !e.metaKey && !e.ctrlKey) {
    e.preventDefault() // don't move a focused slider
    return step(e.code === 'ArrowLeft' ? -1 : 1)
  }
  if (e.code !== 'Space') return
  e.preventDefault() // keep space from scrolling / activating focused controls
  if (e.type !== 'keydown' || e.repeat || practice.value < 0) return
  ring(practice.value)
  // the first press on the opening bell counts as strike 1, the melody continues in tempo from it
  if (!playing.value && current.value < 0 && practice.value === piece.value.strikes[0].bell) play(1)
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
watch(currentLine, (l) => l >= 0 && document.getElementById(`mala-${l}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
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
      <h1>Pritrkovalec v1.0</h1>
    </header>

    <section class="controls">
      <div class="field">
        <label>Melodija</label>
        <Select v-model="pieceIdx" :options="pieceOptions" option-label="label" option-value="value" />
      </div>
      <!-- <div class="field">
        <label>Uglasitev</label>
        <Select v-model="tuning" :options="tuningOptions" />
      </div> -->
      <div class="field">
        <label>Vrsta zapisa</label>
        <Select v-model="view" :options="viewOptions" option-label="label" option-value="value" />
      </div>
      <div class="field">
        <label>Igram zvon (preslednica)</label>
        <SelectButton v-model="practice" :options="bellOptions" option-label="label" option-value="value" :allow-empty="false">
          <template #option="{ option }">
            <span v-if="option.value >= 0" class="dot" :class="`b${option.value}`" />{{ option.label }}
          </template>
        </SelectButton>
      </div>

      <div class="field">
        <label>Tempo <strong>{{ rpm }}</strong> udarcev/min</label>
        <Slider v-model="tempoIdx" :min="0" :max="TEMPOS.length - 1" :step="1" />
        <div class="ticks">
          <button v-for="(value, i) in TEMPOS" :key="value" :class="{ on: i === tempoIdx }" @click="tempoIdx = i">{{ value }}</button>
        </div>
      </div>
      <div class="field">
        <label>Glasnost spremljave (x) <strong>{{ hostVolume }} %</strong></label>
        <Slider v-model="hostVolume" :min="0" :max="100" :step="5" />
      </div>

      <div class="toggles">
        <label class="toggle"><ToggleSwitch v-model="waitForMe" /> Počakaj name (P)</label>
        <label class="toggle"><ToggleSwitch v-model="metronome" /> Metronom {{ beatsPerBar }}/4 (M)</label>
      </div>
      <div class="actions">
        <Button label="❮ Nazaj" severity="secondary" outlined @click="step(-1)" />
        <Button class="play-btn" @click="playing ? pause() : resume()">
          <span v-if="playing" class="icon-pause" aria-hidden="true" /><span v-else aria-hidden="true">▶</span>
          {{ playing ? 'Pavza' : 'Predvajaj' }}
        </Button>
        <Button label="Naprej ❯" severity="secondary" outlined @click="step(1)" />
        <Button label="■ Ustavi" severity="secondary" outlined :disabled="!playing && current < 0" @click="stop()" />
        <Button label="♩ Samo metronom" severity="secondary" outlined :disabled="playing" @click="(clickOnly = true), play()" />
      </div>
    </section>

    <section class="score" :class="[view, { practising: practice >= 0 }]" :style="{ '--host-opacity': 0.25 + (0.75 * hostVolume) / 100 }">
      <h2>{{ piece.name }}</h2>
      <div v-if="view === 'mala'" class="mala">
        <p v-for="(line, l) in malaLines" :id="`mala-${l}`" :key="l">
          <span v-for="p in line" :key="p.lead.i" class="pair">
            <span
              v-for="n in [p.lead, p.host]"
              :key="n.i"
              :class="[n === p.lead ? 'lead' : 'host', `b${n.bell}`, { now: n.i === current, waiting: n.i === waiting, past: n.i < current, mine: n.bell === practice }]"
            ><i v-if="n.accent" class="accent">&gt;</i>{{ n.bell + 1 }}</span>
          </span>
        </p>
      </div>
      <div v-else-if="view === 'staff' || simple" class="staff">
        <svg
          v-for="(line, l) in malaLines"
          :id="`mala-${l}`"
          :key="l"
          :viewBox="simple ? `0 ${ST.top - 30} ${staffWidth(line) + 20} ${3 * gap + 54}` : `0 0 ${staffWidth(line)} ${STAFF_H}`"
          :width="staffWidth(line) + (simple ? 20 : 0)"
          :height="simple ? 3 * gap + 54 : STAFF_H"
        >
          <!-- poenostavljen: bell numbers left of the lines, practice bell's line in yellow -->
          <template v-if="simple">
            <text v-for="b in 4" :key="b" class="num" x="8" :y="lineY(b - 1) + 5">{{ b }}</text>
            <rect v-if="practice >= 0" class="mine-bg" x="20" :y="lineY(practice) - 7" :width="staffWidth(line) - 4" height="14" rx="7" />
          </template>
          <g :transform="simple ? 'translate(20 0)' : undefined">
            <rect v-for="k in 4" :key="k" x="4" :y="ST.top + (k - 1) * gap - 0.8" :width="staffWidth(line) - 8" height="1.6" />
            <text class="smufl" x="12" :y="ST.top + 1.5 * gap">{{ G.percClef }}</text>
            <template v-if="l === 0">
              <text class="smufl timesig" :style="simple && { fontSize: '54px' }" x="42" :y="ST.top + 0.75 * gap">{{ G.digit(beatsPerBar) }}</text>
              <text class="smufl timesig" :style="simple && { fontSize: '54px' }" x="42" :y="ST.top + 2.25 * gap">{{ G.digit(4) }}</text>
            </template>
            <template v-for="(p, k) in line" :key="p.lead.i">
              <!-- melody: quarter note, stem down on the left of the head -->
              <g :class="noteClass(p.lead)">
                <rect v-if="!simple && p.lead.bell === practice" class="mine-bg" :x="beatX(k) - 11" y="150" width="22" height="24" rx="4" />
                <text v-if="p.lead.accent" class="smufl" :x="beatX(k) - 8" :y="ST.top - 2.6 * SP">{{ G.accent }}</text>
                <text class="smufl" :x="beatX(k) - HEAD_W / 2" :y="lineY(p.lead.bell)">{{ G.head }}</text>
                <template v-if="!simple">
                  <rect :x="beatX(k) - HEAD_W / 2" :y="lineY(p.lead.bell) + 0.17 * SP" :width="STEM_W" :height="STEM_LEN - 0.17 * SP" />
                  <text class="num" :x="beatX(k)" y="168">{{ p.lead.bell + 1 }}</text>
                </template>
              </g>
              <!-- hosting bell: eighth rest on the beat, eighth note on the off-beat, stem up on the right -->
              <g v-if="simple" class="host" :class="noteClass(p.host)">
                <text class="smufl" :x="beatX(k) + ST.beat / 2 - HEAD_W / 2" :y="lineY(p.host.bell)">{{ G.headX }}</text>
              </g>
              <g v-else class="host" :class="noteClass(p.host)">
                <!-- eighth rest on the hosting bell's own line, aligned with the quarter note's beat; scaled down to read lighter -->
                <text class="smufl" :transform="`translate(${beatX(k) - 3.3} ${lineY(p.host.bell)}) scale(0.55 0.7)`">{{ G.rest8 }}</text>
                <rect v-if="p.host.bell === practice" class="mine-bg" :x="beatX(k) + ST.beat / 2 - 9" y="152" width="18" height="20" rx="4" />
                <text class="smufl" :x="beatX(k) + ST.beat / 2 - HEAD_W / 2" :y="lineY(p.host.bell)">{{ G.head }}</text>
                <rect
                  :x="beatX(k) + ST.beat / 2 + HEAD_W / 2 - STEM_W"
                  :y="lineY(p.host.bell) - STEM_LEN"
                  :width="STEM_W"
                  :height="STEM_LEN - 0.17 * SP"
                />
                <text class="smufl" :x="beatX(k) + ST.beat / 2 + HEAD_W / 2 - STEM_W" :y="lineY(p.host.bell) - STEM_LEN">{{ G.flag8Up }}</text>
                <text class="num small" :x="beatX(k) + ST.beat / 2" y="166">{{ p.host.bell + 1 }}</text>
                <rect :x="beatX(k) + ST.beat / 2 - 4" y="169" width="8" height="1.2" />
              </g>
            </template>
            <rect v-for="m in line.length / beatsPerBar - 1" :key="m" :x="barX(m) - 1" :y="ST.top" width="1.9" :height="3 * gap" />
            <template v-if="l === malaLines.length - 1">
              <!-- end repeat: dots, thin and thick barline -->
              <circle :cx="staffWidth(line) - 24" :cy="ST.top + 0.5 * gap" r="2.2" />
              <circle :cx="staffWidth(line) - 24" :cy="ST.top + 2.5 * gap" r="2.2" />
              <rect :x="staffWidth(line) - 18" :y="ST.top" width="1.9" :height="3 * gap" />
              <rect :x="staffWidth(line) - 13" :y="ST.top" width="6" :height="3 * gap" />
            </template>
            <rect v-else :x="staffWidth(line) - 9" :y="ST.top" width="1.9" :height="3 * gap" />
          </g>
        </svg>
      </div>
      <template v-else>
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
            <span v-if="s.col && s.col % barLen === 0" class="bar-line" :style="{ gridColumn: s.col + 1 }" />
            <template v-if="view === 'seq'">
              <template v-for="b in 4" :key="b">
                <span v-if="b - 1 !== s.bell" class="note pause" :class="`b${b - 1}`" :style="{ gridColumn: s.col + 1, gridRow: b }" />
              </template>
            </template>
          </template>
        </div>
      </div>
      </template>
    </section>

    <p class="hint" v-if="practice >= 0">Zvon {{ practice + 1 }} je utišan, igraš ga ti (obrobljene note).<strong v-if="waiting >= 0"> Čakam nate …</strong></p>
    <ul class="hint shortcuts">
      <li><kbd>preslednica</kbd> udari izbrani zvon (na zvonu 1 začne melodijo)</li>
      <li><kbd>S</kbd> predvajaj / pavza</li>
      <li><kbd>←</kbd> <kbd>→</kbd> nota nazaj / naprej</li>
      <li><kbd>1</kbd>–<kbd>4</kbd> izberi zvon, <kbd>0</kbd> vsi zvonovi</li>
      <li><kbd>Esc</kbd> ustavi (na začetek)</li>
      <li><kbd>P</kbd> počakaj name</li>
      <li><kbd>M</kbd> metronom</li>
    </ul>
    <footer class="footer">Copyright © 2026 David Ličen</footer>
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
  --col-hl: rgba(27, 27, 27, 0.07);
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
  max-width: 1240px;
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px 32px;
  align-items: start;
  padding: 20px;
  margin: 12px 0 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.field > label {
  font-size: 13px;
  color: var(--muted);
}
.field > label strong {
  color: var(--ink);
}
.field .p-slider {
  margin: 8px 6px 0;
}
.ticks {
  display: flex;
  justify-content: space-between;
}
.ticks button {
  font: 12px ui-monospace, monospace;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px;
}
.ticks button.on {
  color: var(--ink);
  font-weight: 700;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c);
  margin-right: 6px;
}
@media (max-width: 800px) {
  .controls {
    grid-template-columns: 1fr;
  }
}
.toggles {
  flex-direction: column;
  align-items: flex-start !important;
  padding-top: 4px;
}
.toggles,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: center;
}
/* pause icon as two bars: the ❚❚ glyph renders as a solid block in some fonts */
.icon-pause {
  display: inline-block;
  width: 10px;
  height: 12px;
  border-left: 3.5px solid currentColor;
  border-right: 3.5px solid currentColor;
}
.play-btn {
  gap: 8px;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.actions {
  grid-column: 1 / -1;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.score {
  overflow-x: auto;
  padding: 20px;
  margin: 12px 0 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
}
h2 {
  font-size: 18px;
  text-align: center;
  margin: 0 0 4px 0;
}
.row {
  display: grid;
  grid-template-columns: 28px minmax(948px, 1fr);
  align-items: center;
  padding: 10px 0;
  border-radius: 6px;
  transition: background 0.2s;
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
/* Bobnarske note: a table like the printed score, each bell in its own lane between lines */
:where(.drum) .grid {
  border: 1px solid var(--ink);
}
:where(.drum) .line {
  align-self: stretch;
  height: auto;
  background: none;
  border-bottom: 1px solid var(--ink);
}
:where(.drum) .line:nth-child(4) {
  border-bottom: 0;
}
:where(.drum) .line.now,
:where(.drum) .line.hit {
  height: auto; /* .line.now's 3px would shrink the lane and double its border */
  background: color-mix(in srgb, var(--c) 18%, transparent);
}
/* the practice bell's line; replaces the whole-row tint so only that line is yellow */
.lane {
  grid-column: 1 / -1;
  background: var(--lane);
  border-radius: 11px;
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
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  font: 700 13px 'Courier New', Courier, monospace;
}
/* Courier is thin: the x needs size and weight to read as clearly as the numbered squares */
:where(.drum) .note.x {
  background: none;
  color: var(--ink);
  font-size: 17px;
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
.drum .bar-line {
  border-color: var(--ink);
  margin: 0 0 0 -0.5px;
}
.drum .col-hl {
  margin: 0; /* stay inside the table border */
  border-radius: 0;
}
/* Po Malavašiču: big handwritten-style digits, hosting bell as superscript */
.mala {
  display: grid;
  justify-content: center;
  padding: 8px 0 16px;
}
.mala p {
  display: flex;
  gap: 0.3em;
  margin: 0 0 0.35em;
  font: 500 44px/1.5 Georgia, 'Times New Roman', serif;
}
.mala .pair {
  display: inline-flex;
  gap: 0.2em;
  align-items: flex-start;
}
.mala .lead,
.mala .host {
  position: relative;
  display: inline-block;
  padding: 0 2px;
  border-radius: 6px;
  transition: color 0.08s, background 0.08s;
}
.mala .host {
  font-size: 0.5em;
  line-height: 1.6;
  opacity: var(--host-opacity, 1);
}
.mala .past {
  color: var(--muted);
}
.mala .mine {
  background: var(--lane);
}
/* current strike: white digit on the bell's colour, like the squares in Bobnarske note */
.mala .now,
.mala .waiting {
  background: var(--c);
  color: #fff;
  opacity: 1;
}
.mala .waiting {
  animation: pulse-bg 0.8s ease-in-out infinite alternate;
}
@keyframes pulse-bg {
  to {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--c) 30%, transparent);
  }
}
.mala .accent {
  top: -0.35em;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.4em;
}
/* Notni in številčni zapis */
.staff {
  display: grid;
  justify-content: center;
  gap: 4px;
  padding-bottom: 12px;
}
.staff svg {
  max-width: 100%;
  height: auto;
  fill: var(--ink);
  overflow: visible;
}
.staff g {
  color: var(--ink);
  fill: currentColor;
}
.staff .smufl {
  font: 48px/1 Bravura; /* SMuFL: em = 4 staff spaces */
}
.staff .smufl.timesig {
  font-size: 30px; /* digits are 2 sp tall; scaled down so both fit the 4-line staff */
}
.staff .num {
  font-family: Georgia, 'Times New Roman', serif;
  text-anchor: middle;
}
.staff .num {
  font-size: 20px;
}
.staff .num.small {
  font-size: 13px;
}
.staff .mine-bg {
  fill: var(--lane);
}
.staff .host {
  opacity: var(--host-opacity, 1);
}
.staff .past {
  color: var(--muted);
}
.staff .now,
.staff .waiting {
  color: var(--c);
  opacity: 1;
}
.staff .waiting {
  animation: blink 0.8s ease-in-out infinite alternate;
}
@keyframes blink {
  to {
    opacity: 0.35;
  }
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
  font: 700 13px 'Courier New', Courier, monospace;
  color: var(--ink);
}
.hint {
  color: var(--muted);
}
.footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  text-align: center;
  font-size: 13px;
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

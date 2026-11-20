<script setup lang="ts">
import { shallowRef, computed } from 'vue'
import Select from 'primevue/select'
import AppHeader from './components/AppHeader.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import StatsPanel from './components/StatsPanel.vue'
import PlayerBar from './components/PlayerBar.vue'
import ResultDialog from './components/ResultDialog.vue'
import CountdownOverlay from './components/CountdownOverlay.vue'
import MalaScore from './components/score/MalaScore.vue'
import StaffScore from './components/score/StaffScore.vue'
import TrackScore from './components/score/TrackScore.vue'
import GridScore from './components/score/GridScore.vue'
import MelodyPicker from './components/MelodyPicker.vue'
import { useSettings, DURATION_OPTIONS } from './composables/useSettings.ts'
import { useLibrary } from './composables/useLibrary.ts'
import { usePlayer } from './composables/usePlayer.ts'
import { usePlayHistory } from './composables/usePlayHistory.ts'
import { useShortcuts } from './composables/useShortcuts.ts'
import { useBeat } from './composables/useBeat.ts'
import { useMediaQuery } from './composables/useMediaQuery.ts'
import { useWakeLock } from './composables/useWakeLock.ts'
import { confetti } from './lib/confetti.ts'
import { beatsPerBar, bellCount } from './lib/notation.ts'
import type { Result } from './lib/score.ts'

// The page: app bar, settings and statistics panels, melody picker, score and the docked player.
// It connects the pieces; playback lives in usePlayer, the saved choices in useSettings.
const library = useLibrary() // built-in and user melodies
const settings = useSettings(library.all)
const {
  pieceName,
  view,
  practice,
  tempoIdx,
  hostVolume,
  waitForMe,
  metronome,
  beatView,
  minutes,
  favorites,
  piece,
  rpm,
} = settings
// when the chosen playing time (Igraj) is over, it ends like Ustavi
const {
  playing,
  countdown,
  beat,
  current,
  waiting,
  flash,
  position,
  progress,
  toggle,
  step,
  ring,
  tap,
  finish,
} = usePlayer(settings, {
  onTimeUp: () => stopAndScore(),
  onStart: () => started(piece.value.name),
})
const { stats, add: addPlay, counts, started } = usePlayHistory()
useWakeLock(playing) // the screen stays on while the melody plays
// visual metronome: lit dot / amber glow on every melody note while playing
const { beat: barBeat, pulse } = useBeat(piece, current, playing)
const perBar = computed(() => beatsPerBar(piece.value.strikes))
const bells = computed(() => bellCount(piece.value.strikes))
const showDots = computed(() => beatView.value === 'dots' || beatView.value === 'both')
const showGlow = computed(() => beatView.value === 'glow' || beatView.value === 'both')

// same breakpoint as the side panels: desktop shows Bobnarske note whole, smaller screens as a moving track
const desktop = useMediaQuery('(min-width: 1200px)')

const showSettings = shallowRef(false) // panels only open/close below 1200px
const showStats = shallowRef(false)
const result = shallowRef<Result | null>(null) // accuracy shown after Ustavi

// Ustavi / Esc: stop, show the accuracy and keep it in the statistics; 100 earns confetti
function stopAndScore() {
  const scored = { piece: piece.value.name, bell: practice.value + 1, tempo: rpm.value }
  const r = finish()
  if (!r) return
  result.value = r
  addPlay({ ...scored, score: r.score })
  if (r.score === 100) confetti()
}

useShortcuts({
  escape: () =>
    showSettings.value || showStats.value
      ? (showSettings.value = showStats.value = false)
      : stopAndScore(),
  bell: (b) => b < bells.value && (practice.value = b), // no bell 4 in a 3-bell piece
  toggleWait: () => (waitForMe.value = !waitForMe.value),
  toggleMetronome: () => (metronome.value = !metronome.value),
  togglePlay: toggle,
  step,
  tap,
})

const scoreStyle = computed(() => ({
  '--bells': bells.value,
  '--host-opacity': 0.25 + (0.75 * hostVolume.value) / 100,
}))
const scoreProps = computed(() => ({
  piece: piece.value,
  current: current.value,
  waiting: waiting.value,
  practice: practice.value,
}))
</script>

<template>
  <AppHeader
    :dots="showDots && playing"
    :beats="perBar"
    :beat="barBeat"
    @settings="showSettings = true"
    @stats="showStats = true"
  />
  <!-- desktop: settings and statistics are fixed side columns; tablet and phone: they slide in from the sides -->
  <div class="layout">
    <SettingsPanel
      v-model:view="view"
      v-model:tempo-idx="tempoIdx"
      v-model:host-volume="hostVolume"
      v-model:wait-for-me="waitForMe"
      v-model:metronome="metronome"
      v-model:beat-view="beatView"
      :beats-per-bar="perBar"
      :open="showSettings"
      @close="showSettings = false"
    />
    <main>
      <!-- glow: an amber inner shadow round the visible part of the white sheet (above the player),
           restarted (key) on every melody note -->
      <div
        v-if="showGlow && barBeat >= 0"
        :key="pulse"
        class="beat-glow"
        :class="{ down: barBeat === 0 }"
        :style="{ '--glow-dur': `${Math.min(0.45, beat * 0.6)}s` }"
        aria-hidden="true"
      />
      <section class="controls">
        <div class="field inline piece-field">
          <label id="piece-label">Melodija</label>
          <MelodyPicker
            v-model:piece-name="pieceName"
            v-model:favorites="favorites"
            :library="library"
            :counts="counts"
            :rpm="rpm"
            :host-volume="hostVolume"
            @opened="playing && toggle()"
          />
        </div>
        <div class="field inline">
          <label id="duration-label">Igraj</label>
          <Select
            v-model="minutes"
            :options="DURATION_OPTIONS"
            option-label="label"
            option-value="value"
            aria-labelledby="duration-label"
          />
        </div>
      </section>

      <!-- the view name is also a class here: the notation styles use it (.drum, .mala, .staff) -->
      <section class="score" :class="[view, { practising: practice >= 0 }]" :style="scoreStyle">
        <MalaScore v-if="view === 'mala'" v-bind="scoreProps" />
        <StaffScore
          v-else-if="view === 'staff' || view === 'simple'"
          v-bind="scoreProps"
          :simple="view === 'simple'"
        />
        <GridScore v-else-if="desktop" v-bind="scoreProps" :flash="flash" @ring="ring" />
        <TrackScore
          v-else
          v-bind="scoreProps"
          :flash="flash"
          :playing="playing"
          :position="position"
          @ring="ring"
        />
      </section>

      <ResultDialog v-model:result="result" />

      <PlayerBar
        v-model:practice="practice"
        :bells="bells"
        :playing="playing"
        :can-stop="playing || current >= 0"
        :waiting="waiting >= 0"
        :flash="flash"
        :timed="minutes > 0"
        :progress="progress"
        @prev="step(-1)"
        @toggle="toggle"
        @tap="tap"
        @stop="stopAndScore"
        @next="step(1)"
      />
    </main>
    <StatsPanel :open="showStats" :stats="stats" @close="showStats = false" />
  </div>
  <CountdownOverlay :count="countdown" :beat="beat" />
  <div
    v-if="showSettings || showStats"
    class="backdrop"
    @click="showSettings = showStats = false"
  />
</template>

<style>
/* one layout for phone, tablet and desktop: app bar, melody picker, score, player docked at the bottom.
   The main column is white, full height between the app bar and the bottom. */
main {
  max-width: 1240px;
  min-height: calc(
    100dvh - 61px - env(safe-area-inset-top)
  ); /* exactly the screen below the app bar */
  background: #fff;
  border-radius: 10px; /* a sheet of paper laid on the dark frame */
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 8px 8px calc(var(--player-h) + 16px); /* room for the docked player */
}
/* visual metronome glow: flashes in at once, fades over about half a beat; stronger on the downbeat.
   Soft and edge-only on purpose: a full-screen flash at these tempos would be tiring (and a seizure risk). */
.beat-glow {
  /* sticks over the visible sheet, from below the app bar to above the docked player, so all four edges
     show also when the score scrolls; takes no room (negative margin) */
  --glow-h: calc(
    100dvh - 61px - env(safe-area-inset-top) - var(--player-h) - env(safe-area-inset-bottom)
  );
  position: sticky;
  top: calc(61px + env(safe-area-inset-top));
  flex: none;
  height: var(--glow-h);
  margin: -8px -8px calc(8px - var(--glow-h));
  border-radius: 10px 10px 0 0; /* like the sheet: round top, straight where it runs under the player */
  pointer-events: none;
  z-index: 1;
  animation: beat-glow var(--glow-dur, 0.3s) ease-out forwards;
  --glow: inset 0 0 0 3px rgba(244, 194, 108, 0.9), inset 0 0 70px 6px rgba(244, 194, 108, 0.5);
}
.beat-glow.down {
  --glow: inset 0 0 0 5px rgba(224, 160, 48, 0.95), inset 0 0 120px 12px rgba(224, 160, 48, 0.55);
}
@keyframes beat-glow {
  from {
    box-shadow: var(--glow);
  }
  to {
    box-shadow:
      inset 0 0 0 0 transparent,
      inset 0 0 0 0 transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .beat-glow {
    opacity: 0.5;
  }
}
/* what shows around the sheet's rounded corners: the same dark as the app bar and panels */
.layout {
  background: var(--chrome);
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 25;
  background: rgba(0, 0, 0, 0.55);
}
@media (min-width: 1200px) {
  /* lets notation views size themselves to the score column (cqi units), e.g. Malavašič's digits */
  .score {
    container-type: inline-size;
  }
  .layout {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr) 340px;
    align-items: start;
  }
  main {
    grid-column: 2;
    width: 100%;
  }
  .backdrop {
    display: none;
  }
}
/* melody and duration pickers, each with its label in front; they wrap onto two lines on narrow phones.
   The melody picker doubles as the score's title. */
.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px 20px;
  padding: 12px 16px;
}
.field.inline {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.piece-field {
  flex: 1 1 260px;
  max-width: 520px;
}
/* phones: both pickers on one line without their labels (still read out by screen readers) */
@media (max-width: 767px) {
  .controls {
    flex-wrap: nowrap;
    gap: 8px;
    padding-inline: 12px;
  }
  .piece-field {
    flex: 1 1 0;
    min-width: 0;
  }
  /* tighter selects so the melody name fits */
  .controls .p-select-label {
    padding-inline: 0.75rem 0.25rem;
  }
  .controls .p-select-dropdown {
    width: 2rem;
  }
  .field.inline > label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
/* the pickers are the only PrimeVue controls on white: light colours by hand, a soft grey fill */
.controls .p-select {
  background: #f4f4f5; /* zinc-100 */
  border-color: #e4e4e7; /* zinc-200 */
}
.controls .p-select:not(.p-disabled):hover {
  border-color: #d4d4d8;
}
.controls .p-select-label,
.controls .p-select-dropdown {
  color: var(--ink);
}
/* the score fills the screen between the melody picker and the player, content centred */
.score {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-x: auto;
  padding: 8px 12px;
}
</style>

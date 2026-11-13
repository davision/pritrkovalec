<script setup lang="ts">
import { shallowRef, computed } from 'vue'
import Select from 'primevue/select'
import AppHeader from './components/AppHeader.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import StatsPanel from './components/StatsPanel.vue'
import PlayerBar from './components/PlayerBar.vue'
import ResultDialog from './components/ResultDialog.vue'
import MalaScore from './components/score/MalaScore.vue'
import StaffScore from './components/score/StaffScore.vue'
import DrumTicker from './components/score/DrumTicker.vue'
import GridScore from './components/score/GridScore.vue'
import { useSettings, PIECE_OPTIONS } from './composables/useSettings.ts'
import { usePlayer } from './composables/usePlayer.ts'
import { usePlayHistory } from './composables/usePlayHistory.ts'
import { useShortcuts } from './composables/useShortcuts.ts'
import { confetti } from './lib/confetti.ts'
import type { Result } from './lib/score.ts'

// The page: app bar, settings and statistics panels, melody picker, score and the docked player.
// It connects the pieces; playback lives in usePlayer, the saved choices in useSettings.
const settings = useSettings()
const { pieceIdx, view, practice, tempoIdx, hostVolume, waitForMe, piece, rpm } = settings
const { playing, current, waiting, flash, position, toggle, step, ring, tap, finish } =
  usePlayer(settings)
const { stats, add: addPlay } = usePlayHistory()

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
  bell: (b) => (practice.value = b),
  toggleWait: () => (waitForMe.value = !waitForMe.value),
  togglePlay: toggle,
  step,
  tap,
})

const scoreStyle = computed(() => ({ '--host-opacity': 0.25 + (0.75 * hostVolume.value) / 100 }))
const scoreProps = computed(() => ({
  piece: piece.value,
  current: current.value,
  waiting: waiting.value,
  practice: practice.value,
}))
</script>

<template>
  <AppHeader @settings="showSettings = true" @stats="showStats = true" />
  <!-- desktop: settings and statistics are fixed side columns; tablet and phone: they slide in from the sides -->
  <div class="layout">
    <SettingsPanel
      v-model:view="view"
      v-model:tempo-idx="tempoIdx"
      v-model:host-volume="hostVolume"
      v-model:wait-for-me="waitForMe"
      :open="showSettings"
      @close="showSettings = false"
    />
    <main>
      <section class="controls">
        <div class="field">
          <label>Melodija</label>
          <Select
            v-model="pieceIdx"
            class="piece-select"
            :options="PIECE_OPTIONS"
            option-label="label"
            option-value="value"
          />
        </div>
      </section>

      <!-- the view name is also a class here: the notation styles use it (.drum, .seq, .mala, .staff) -->
      <section class="score" :class="[view, { practising: practice >= 0 }]" :style="scoreStyle">
        <MalaScore v-if="view === 'mala'" v-bind="scoreProps" />
        <StaffScore
          v-else-if="view === 'staff' || view === 'simple'"
          v-bind="scoreProps"
          :simple="view === 'simple'"
        />
        <DrumTicker
          v-else-if="view === 'drum'"
          v-bind="scoreProps"
          :flash="flash"
          :playing="playing"
          :position="position"
          @ring="ring"
        />
        <GridScore v-else v-bind="scoreProps" :flash="flash" @ring="ring" />
      </section>

      <ResultDialog v-model:result="result" />

      <PlayerBar
        v-model:practice="practice"
        :playing="playing"
        :can-stop="playing || current >= 0"
        :waiting="waiting >= 0"
        :flash="flash"
        @prev="step(-1)"
        @toggle="toggle"
        @tap="tap"
        @stop="stopAndScore"
        @next="step(1)"
      />
    </main>
    <StatsPanel :open="showStats" :stats="stats" @close="showStats = false" />
  </div>
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
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 8px 8px calc(var(--player-h) + 16px); /* room for the docked player */
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 25;
  background: rgba(0, 0, 0, 0.55);
}
@media (min-width: 1200px) {
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
/* melody picker: label centred above the select; it doubles as the score's title */
.controls {
  padding: 12px 16px;
}
.controls .field > label {
  text-align: center;
}
.piece-select .p-select-label {
  font-weight: 700;
}
/* the melody picker is the only PrimeVue control on white: give it light colours by hand */
.controls .p-select {
  background: #fff;
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

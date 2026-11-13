<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { barLen } from '../../lib/notation.ts'
import type { Piece } from '../../lib/melodies.ts'
import BellButtons from './BellButtons.vue'
import './grid.css'

// Bobnarske note / Grafični zapis on phones and tablets: one endless track sliding under a fixed playhead.
// The piece is drawn 3× so the playhead (on the middle copy) always has notes on both sides; wrapping
// jumps one copy back, invisibly. Desktop shows the whole score in rows instead (GridScore).
const props = withDefaults(
  defineProps<{
    view: 'drum' | 'seq' // drum: numbered squares and x; seq: dots, with empty circles on the other bells
    piece: Piece
    current: number
    waiting: number
    practice: number
    flash?: number
    playing?: boolean
    position: () => number // player's position in strikes, fractional while playing
  }>(),
  { flash: -1, playing: false },
)
const emit = defineEmits<{ ring: [bell: number] }>()

const COL = 30 // px per strike
const COPIES = 3 // shortcut: assumes one copy is wider than the screen (≥ 48 strikes); add copies for shorter pieces
const strip = useTemplateRef<HTMLDivElement>('strip')

const tape = computed(() => {
  const s = props.piece.strikes
  return Array.from({ length: COPIES }, (_, c) =>
    s.map((x, i) => ({ ...x, i, j: c * s.length + i })),
  ).flat()
})
// Grafični zapis: an empty circle on each bell that doesn't ring at that strike
const tapePauses = computed(() =>
  props.view === 'seq'
    ? tape.value.flatMap((s) =>
        [0, 1, 2, 3].filter((b) => b !== s.bell).map((b) => ({ j: s.j, b })),
      )
    : [],
)
const tapeBars = computed(() => {
  const len = barLen(props.piece.strikes)
  return tape.value.filter((s) => s.j && s.j % len === 0).map((s) => s.j)
})
const currentBell = computed(() => props.piece.strikes[props.current]?.bell ?? -1)

// set imperatively every frame: binding it through Vue would re-render the whole score 60× a second
function place() {
  if (!strip.value) return
  const pos = props.piece.strikes.length + props.position()
  strip.value.style.transform = `translateX(${-(pos + 0.5) * COL}px)`
}
let raf = 0
function follow() {
  place()
  raf = requestAnimationFrame(follow)
}
// while playing the strip glides every frame; while stopped it jumps with each step
watch(
  () => props.playing,
  (on) => {
    cancelAnimationFrame(raf)
    if (on) follow()
    else place()
  },
)
watch(
  () => [props.current, props.piece],
  () => !props.playing && place(),
  { flush: 'post' },
)
onMounted(() => (props.playing ? follow() : place()))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="ticker">
    <BellButtons :flash="flash" @ring="emit('ring', $event)" />
    <div class="ticker-window">
      <div
        ref="strip"
        class="grid strip"
        :style="{ gridTemplateColumns: `repeat(${tape.length}, ${COL}px)` }"
      >
        <div
          v-for="b in 4"
          :key="b"
          class="line"
          :class="[
            `b${b - 1}`,
            { now: currentBell === b - 1, mine: practice === b - 1, hit: flash === b - 1 },
          ]"
          :style="{ gridRow: b }"
        />
        <div v-if="practice >= 0" class="lane" :style="{ gridRow: practice + 1 }" />
        <!-- v-memo: a strike re-renders only the notes whose state changed, not all ~400 -->
        <span
          v-for="s in tape"
          :key="s.j"
          v-memo="[
            piece,
            practice,
            s.i === current,
            s.i === waiting,
            s.j < piece.strikes.length + current,
          ]"
          class="note"
          :class="[
            `b${s.bell}`,
            {
              x: s.label === 'x',
              now: s.i === current,
              waiting: s.i === waiting,
              past: s.j < piece.strikes.length + current,
              mine: s.bell === practice,
            },
          ]"
          :style="{ gridColumn: s.j + 1, gridRow: s.bell + 1 }"
        >
          <i v-if="s.accent" class="accent">&gt;</i>{{ view === 'drum' ? s.label : '' }}
        </span>
        <!-- static: v-memo keeps the hundreds of empty circles out of every re-render -->
        <span
          v-for="p in tapePauses"
          :key="`p${p.j}-${p.b}`"
          v-memo="[piece]"
          class="note pause"
          :class="`b${p.b}`"
          :style="{ gridColumn: p.j + 1, gridRow: p.b + 1 }"
        />
        <span
          v-for="j in tapeBars"
          :key="`bar${j}`"
          class="bar-line"
          :style="{ gridColumn: j + 1 }"
        />
      </div>
      <div class="playhead" />
    </div>
  </div>
</template>

<style>
/* notes slide left under a fixed playhead at 25 % */
.ticker {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
}
.ticker .bell-nums {
  padding-top: 21px; /* line up with the strip: window padding + table border */
}
.ticker-window {
  position: relative;
  height: 134px; /* 4 lanes + room for accents above */
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 4%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 4%, #000 92%, transparent);
}
.ticker .strip {
  position: absolute;
  top: 20px;
  left: 25%;
  width: max-content;
  will-change: transform;
}
.playhead {
  position: absolute;
  top: 12px;
  height: 112px;
  left: 25%;
  width: 30px; /* = COL */
  translate: -50% 0;
  border-radius: 4px;
  background: var(--col-hl);
  box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--ink) 25%, transparent);
  pointer-events: none;
}
</style>

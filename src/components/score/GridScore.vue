<script setup lang="ts">
import { computed, watch, shallowRef, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { barLen } from '../../lib/notation.ts'
import type { Piece, Strike } from '../../lib/melodies.ts'
import BellButtons from './BellButtons.vue'
import './grid.css'

// Bobnarske note / Grafični zapis on desktop: the whole score in rows of 4 bars (2 when 4 would be too
// cramped), so every row lines up; the notes grow with the width. The row being played gets a column highlight.
// drum: numbered squares and x; seq: a dot per strike on its bell's line and an empty circle on the other three.
const props = withDefaults(
  defineProps<{
    view: 'drum' | 'seq'
    piece: Piece
    current: number
    waiting: number
    practice: number
    flash?: number
  }>(),
  { flash: -1 },
)
const emit = defineEmits<{ ring: [bell: number] }>()

const BARS_PER_ROW = [4, 2, 1] // the first that keeps cells at least MIN_CELL wide
const MIN_CELL = 18 // px per strike before a row gets too cramped to read
const MAX_CELL = 34 // px; wider screens leave the rows centred instead of growing the notes further
const BELLS_W = 28 // the bell numbers column
const root = useTemplateRef<HTMLDivElement>('root')
const width = shallowRef(0)
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([e]) => (width.value = e!.contentRect.width))
  observer.observe(root.value!)
})
onBeforeUnmount(() => observer?.disconnect())

// strikes per bar; pieces with very long bars (Po pet naokoli, Tri dva ena) use their Malavašič groups
// instead (`group` notes, each with its hosting x)
const bar = computed(() =>
  props.piece.group ? 2 * props.piece.group : Math.max(1, barLen(props.piece.strikes)),
)
const cellFor = (cols: number) => Math.floor((width.value - BELLS_W) / cols)
const cols = computed(() => {
  const n = props.piece.strikes.length
  for (const bars of BARS_PER_ROW) {
    const c = Math.min(n, bars * bar.value)
    if (!width.value || cellFor(c) >= MIN_CELL) return c
  }
  return Math.min(n, bar.value) // even one bar is cramped: keep it, the score scrolls sideways
})
const cell = computed(() =>
  width.value ? Math.max(MIN_CELL, Math.min(MAX_CELL, cellFor(cols.value))) : 23,
)
const rows = computed(() => {
  const out: (Strike & { i: number; col: number })[][] = []
  props.piece.strikes.forEach((s, i) =>
    (out[Math.floor(i / cols.value)] ??= []).push({ ...s, i, col: i % cols.value }),
  )
  return out
})
const currentRow = computed(() => (props.current < 0 ? -1 : Math.floor(props.current / cols.value)))
const currentBell = computed(() => props.piece.strikes[props.current]?.bell ?? -1)

watch(
  currentRow,
  (r) =>
    r >= 0 &&
    document.getElementById(`row-${r}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
)
</script>

<template>
  <div ref="root" class="rows" :style="{ '--cell': `${cell}px` }">
    <div
      v-for="(row, r) in rows"
      :id="`row-${r}`"
      :key="r"
      class="row"
      :class="{ active: r === currentRow }"
    >
      <BellButtons :flash="flash" @ring="emit('ring', $event)" />
      <!-- fixed-size cells: a shorter last row ends after its last bar, aligned to the rows above -->
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${row.length}, var(--cell))` }">
        <div
          v-for="b in 4"
          :key="b"
          class="line"
          :class="[
            `b${b - 1}`,
            {
              now: r === currentRow && currentBell === b - 1,
              mine: practice === b - 1,
              hit: flash === b - 1,
            },
          ]"
          :style="{ gridRow: b }"
        />
        <div v-if="practice >= 0" class="lane" :style="{ gridRow: practice + 1 }" />
        <div v-if="r === currentRow" class="col-hl" :style="{ gridColumn: (current % cols) + 1 }" />
        <template v-for="s in row" :key="s.i">
          <span
            class="note"
            :class="[
              `b${s.bell}`,
              {
                x: s.label === 'x',
                now: s.i === current,
                waiting: s.i === waiting,
                past: s.i < current,
                mine: s.bell === practice,
              },
            ]"
            :style="{ gridColumn: s.col + 1, gridRow: s.bell + 1 }"
          >
            <i v-if="s.accent" class="accent">&gt;</i>{{ view === 'drum' ? s.label : '' }}
          </span>
          <span
            v-if="s.col && s.col % bar === 0"
            class="bar-line"
            :style="{ gridColumn: s.col + 1 }"
          />
          <template v-for="b in view === 'seq' ? 4 : 0" :key="b">
            <span
              v-if="b - 1 !== s.bell"
              class="note pause"
              :class="`b${b - 1}`"
              :style="{ gridColumn: s.col + 1, gridRow: b }"
            />
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
/* one column as wide as the widest row, centred; rows start-aligned inside it */
.rows {
  display: grid;
  justify-content: center;
}
.row {
  display: grid;
  grid-template-columns: 28px max-content;
  align-items: center;
  padding: 30px 0;
  border-radius: 6px;
  transition: background 0.2s;
}
</style>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { ROW } from '../../lib/melodies.ts'
import { barLen } from '../../lib/notation.ts'
import type { Piece, Strike } from '../../lib/melodies.ts'
import BellButtons from './BellButtons.vue'
import './grid.css'

// Grafični zapis: rows of 48 strikes as in the PDF, a dot per strike on its bell's line and an empty
// circle on the other three; the row being played gets a column highlight.
const props = withDefaults(
  defineProps<{
    piece: Piece
    current: number
    waiting: number
    practice: number
    flash?: number
  }>(),
  { flash: -1 },
)
const emit = defineEmits<{ ring: [bell: number] }>()

const cols = computed(() => Math.min(ROW, props.piece.strikes.length))
const bar = computed(() => barLen(props.piece.strikes))
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
  <div
    v-for="(row, r) in rows"
    :id="`row-${r}`"
    :key="r"
    class="row"
    :class="{ active: r === currentRow }"
  >
    <BellButtons :flash="flash" @ring="emit('ring', $event)" />
    <!-- a shorter last row keeps the column width and ends after its last bar -->
    <div
      class="grid"
      :style="{
        gridTemplateColumns: `repeat(${row.length}, 1fr)`,
        width: `${(row.length / cols) * 100}%`,
      }"
    >
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
          <i v-if="s.accent" class="accent">&gt;</i>
        </span>
        <span
          v-if="s.col && s.col % bar === 0"
          class="bar-line"
          :style="{ gridColumn: s.col + 1 }"
        />
        <template v-for="b in 4" :key="b">
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
</template>

<style>
.row {
  display: grid;
  grid-template-columns: 28px minmax(948px, 1fr);
  align-items: center;
  padding: 30px 0;
  border-radius: 6px;
  transition: background 0.2s;
}
</style>

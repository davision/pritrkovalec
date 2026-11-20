<script setup lang="ts">
import { computed } from 'vue'
import type { Piece } from '../lib/melodies.ts'

// A piece's fingerprint as a rosette: its melody notes (no x) go once round the circle in order, each at
// a radius set by its bell (bell 1, the highest, outermost), joined into one closed line. Rotating pieces
// come out with a 4-fold flower, the note pattern shapes the petals; accented notes are bigger dots.
const { piece } = defineProps<{ piece: Piece }>()

const dots = computed(() => {
  const notes = piece.strikes.filter((s) => s.label !== 'x')
  return notes.map((s, i) => {
    const a = (2 * Math.PI * i) / notes.length - Math.PI / 2
    const r = 14 + (3 - s.bell) * 8
    return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a), bell: s.bell, accent: s.accent }
  })
})
const path = computed(
  () =>
    dots.value.map((d, i) => `${i ? 'L' : 'M'}${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join('') + 'Z',
)
</script>

<template>
  <svg class="melody-thumb" viewBox="0 0 100 100" aria-hidden="true">
    <circle v-for="r in [14, 22, 30, 38]" :key="r" cx="50" cy="50" :r="r" class="ring" />
    <path :d="path" class="line" />
    <circle
      v-for="(d, i) in dots"
      :key="i"
      :cx="d.x"
      :cy="d.y"
      :r="d.accent ? 4 : 2.4"
      :class="`b${d.bell}`"
      class="dot"
    />
  </svg>
</template>

<style>
.melody-thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
}
.melody-thumb .ring {
  fill: none;
  stroke: currentColor;
  stroke-opacity: 0.08;
}
.melody-thumb .line {
  fill: var(--accent);
  fill-opacity: 0.08;
  stroke: var(--accent);
  stroke-opacity: 0.55;
  stroke-width: 1.2;
  stroke-linejoin: round;
}
.melody-thumb .dot {
  fill: var(--c);
}
</style>

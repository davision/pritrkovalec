<script setup lang="ts">
// Visual metronome as a row of dots, one per beat of the bar; the first (downbeat) is bigger.
// The dot of the beat just played lights up at once and stays lit until the next one, so the row also
// shows where in the bar the melody is; the previous dot fades out.
defineProps<{
  beats: number // beats per bar
  beat: number // lit dot, -1 = none
}>()
</script>

<template>
  <div class="beat-dots" aria-hidden="true">
    <span
      v-for="n in beats"
      :key="n"
      class="beat-dot"
      :class="{ on: n - 1 === beat, down: n === 1 }"
    />
  </div>
</template>

<style>
.beat-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  height: 22px;
}
.beat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dot-off, #e4e4e7); /* unlit */
  transition:
    background-color 0.25s ease-out,
    transform 0.25s ease-out,
    box-shadow 0.25s ease-out;
}
.beat-dot.down {
  width: 14px;
  height: 14px;
}
/* lighting up is instant (no transition), fading out is soft */
.beat-dot.on {
  transition: none;
  background: var(--accent);
  transform: scale(1.3);
  box-shadow: 0 0 0 4px rgba(244, 194, 108, 0.3);
}
.beat-dot.down.on {
  background: #e0a030; /* deeper amber on the downbeat */
  box-shadow: 0 0 0 5px rgba(224, 160, 48, 0.35);
}
</style>

<script setup lang="ts">
// Count-in before the melody: a big number in a grey circle over the whole screen. Each number
// shrinks and fades over one beat; the key restarts the animation for the next one.
defineProps<{
  count: number // number to show, 0 = nothing
  beat: number // seconds per beat
}>()
</script>

<template>
  <div v-if="count" class="countdown" role="status" aria-live="assertive">
    <span :key="count" class="countdown-num" :style="{ animationDuration: `${beat}s` }">
      {{ count }}
    </span>
  </div>
</template>

<style>
.countdown {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  pointer-events: none; /* the tap circle and buttons stay usable underneath */
}
.countdown-num {
  width: min(60vw, 260px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(63, 63, 70, 0.6);
  color: #fff;
  font:
    700 clamp(96px, 32vw, 160px) / 1 Roboto,
    sans-serif;
  animation: count-out ease-in forwards;
}
@keyframes count-out {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.4);
    opacity: 0;
  }
}
</style>

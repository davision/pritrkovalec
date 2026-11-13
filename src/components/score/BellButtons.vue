<script setup lang="ts">
// Bell numbers 1–4 down the side of a score; clicking one rings that bell.
const { flash = -1 } = defineProps<{
  flash?: number // bell just rung, briefly highlighted
}>()
const emit = defineEmits<{ ring: [bell: number] }>()
</script>

<template>
  <div class="bell-nums">
    <button
      v-for="b in 4"
      :key="b"
      :class="[`b${b - 1}`, { hit: flash === b - 1 }]"
      :aria-label="`Udari zvon ${b}`"
      @click="emit('ring', b - 1)"
    >
      {{ b }}
    </button>
  </div>
</template>

<style>
.bell-nums {
  display: grid;
  grid-template-rows: repeat(4, 23px);
  align-self: start;
}
.bell-nums button {
  place-self: center;
  width: 18px;
  height: 18px;
  font:
    700 11px/1 Roboto,
    sans-serif;
  border: 0;
  border-radius: 50%;
  background: var(--c);
  color: #fff;
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.08s,
    box-shadow 0.08s;
}
.bell-nums button.hit {
  transform: scale(1.25);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent);
}
/* Bobnarske note: plain printed bell numbers like the book, coloured only while ringing */
.drum .bell-nums button {
  font:
    13px/1 Roboto,
    sans-serif;
  background: none;
  color: var(--ink);
  border-radius: 3px;
}
.drum .bell-nums button.hit {
  background: var(--c);
  color: #fff;
  transform: none;
  box-shadow: none;
}
</style>

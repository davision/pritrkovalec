<script setup lang="ts">
// A bell in its own colour, with its number inside unless `plain`.
const { plain = false } = defineProps<{
  bell: number // 0–3
  plain?: boolean
}>()
</script>

<template>
  <svg
    class="bell-icon"
    :class="`b${bell}`"
    viewBox="0 0 32 32"
    role="img"
    :aria-label="`Zvon ${bell + 1}`"
  >
    <path
      d="M14.5 2.5h3v2.2C22.6 5.5 25.5 9.6 25.5 15v5.5l3 4V26h-25v-1.5l3-4V15c0-5.4 2.9-9.5 8-10.3z"
    />
    <circle cx="16" cy="28.3" r="2.6" />
    <text v-if="!plain" x="16" y="19.5">{{ bell + 1 }}</text>
  </svg>
</template>

<style>
.bell-icon {
  display: block;
  width: 30px;
  height: 30px;
  fill: var(--c);
}
.bell-icon text {
  fill: #fff;
  font:
    700 12px Roboto,
    sans-serif;
  text-anchor: middle;
}
</style>

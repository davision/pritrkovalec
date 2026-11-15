<script setup lang="ts">
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { confetti } from '../lib/confetti.ts'
import BeatDots from './BeatDots.vue'

// App bar across the whole page: settings left, title and version centred, statistics right.
// The two buttons open the side panels on tablet and phone; on desktop the panels are always open.
// While a melody plays (and the dots are on), the visual metronome's dots take the title's place.
const {
  dots = false,
  beats = 4,
  beat = -1,
} = defineProps<{
  dots?: boolean // show the beat dots instead of the title
  beats?: number // beats per bar
  beat?: number // lit dot, -1 = none
}>()
const emit = defineEmits<{ settings: []; stats: [] }>()
const VERSION = __VERSION__ // injected at build time, see vite.config.js

// easter egg: 4 quick clicks/taps on the title throw confetti
let clicks = 0
let lastClick = 0
function onTitle() {
  const now = Date.now()
  clicks = now - lastClick < 600 ? clicks + 1 : 1 // a pause longer than 0.6 s starts the count again
  lastClick = now
  if (clicks === 4) {
    clicks = 0
    confetti()
  }
}
</script>

<template>
  <header>
    <Button
      class="icon-btn"
      icon="pi pi-cog"
      severity="secondary"
      text
      aria-label="Nastavitve"
      title="Nastavitve"
      @click="emit('settings')"
    />
    <div class="brand-swap" :class="{ dots }">
      <div class="brand" :aria-hidden="dots">
        <!-- the app's bell, as in the favicon and home-screen icon -->
        <svg class="logo" viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M14.5 2.5h3v2.2C22.6 5.5 25.5 9.6 25.5 15v5.5l3 4V26h-25v-1.5l3-4V15c0-5.4 2.9-9.5 8-10.3z"
          />
          <circle cx="16" cy="28.3" r="2.6" />
        </svg>
        <h1 @click="onTitle">Zvonko</h1>
        <Tag :value="`v${VERSION}`" rounded class="version" />
      </div>
      <BeatDots class="header-dots" :beats="beats" :beat="beat" />
    </div>
    <Button
      class="icon-btn"
      icon="pi pi-chart-bar"
      severity="secondary"
      text
      aria-label="Statistika igranja"
      title="Statistika"
      @click="emit('stats')"
    />
  </header>
</template>

<style>
header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 44px; /* equal sides keep the title truly centred */
  align-items: center;
  padding: calc(8px + env(safe-area-inset-top)) 12px 8px;
  background: rgba(20, 20, 22, 0.9); /* --chrome, see-through for the blur */
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
/* title and beat dots share one place and cross-fade: the dots come in quickly when the melody
   starts, the title returns slowly when it stops */
.brand-swap {
  display: grid;
  place-items: center;
}
.brand-swap > * {
  grid-area: 1 / 1;
  transition: opacity 1.2s ease;
}
.brand-swap .header-dots {
  opacity: 0;
  --dot-off: rgba(255, 255, 255, 0.16);
}
.brand-swap.dots .brand {
  opacity: 0;
  pointer-events: none;
  transition-duration: 0.25s;
}
.brand-swap.dots .header-dots {
  opacity: 1;
  transition-duration: 0.25s;
}
.brand {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}
.logo {
  width: 22px;
  height: 22px;
  fill: var(--accent);
  flex: none;
}
/* header: beats PrimeVue's own tag colours */
header .version.p-tag {
  background: var(--accent);
  color: var(--chrome-deep);
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
}
h1 {
  font-size: 20px;
  font-weight: 500;
  margin: 0;
  user-select: none; /* fast taps on the title shouldn't select it */
  -webkit-user-select: none;
}
/* borderless icon buttons: a big, bright icon is the whole button */
header .icon-btn.p-button {
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--ink);
}
.icon-btn .p-button-icon {
  font-size: 22px;
}
@media (min-width: 1200px) {
  /* panels are always open here: the buttons keep their space so the title stays centred */
  .icon-btn {
    visibility: hidden;
  }
}
</style>

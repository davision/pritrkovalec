<script setup lang="ts">
import SelectButton from 'primevue/selectbutton'
import { BELL_OPTIONS } from '../composables/useSettings.ts'

// Player docked at the bottom: which bell the player rings, transport buttons, and the big circle
// that strikes the chosen bell like space does.
const {
  playing = false,
  canStop = false,
  waiting = false,
  flash = -1,
} = defineProps<{
  playing?: boolean
  canStop?: boolean
  waiting?: boolean // the melody waits for the player's note
  flash?: number // bell just rung, briefly highlighted
}>()
const practice = defineModel<number>('practice', { required: true })
const emit = defineEmits<{ prev: []; toggle: []; tap: []; stop: []; next: [] }>()
</script>

<template>
  <nav class="player dark" aria-label="Predvajalnik">
    <SelectButton
      v-model="practice"
      :options="BELL_OPTIONS"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      class="player-bells"
    >
      <template #option="{ option }">
        <!-- a bell in its own colour with its number inside -->
        <svg
          v-if="option.value >= 0"
          class="bell-icon"
          :class="`b${option.value}`"
          viewBox="0 0 32 32"
          role="img"
          :aria-label="`Zvon ${option.label}`"
        >
          <path
            d="M14.5 2.5h3v2.2C22.6 5.5 25.5 9.6 25.5 15v5.5l3 4V26h-25v-1.5l3-4V15c0-5.4 2.9-9.5 8-10.3z"
          />
          <circle cx="16" cy="28.3" r="2.6" />
          <text x="16" y="19.5">{{ option.label }}</text>
        </svg>
        <span v-else>{{ option.label }}</span>
      </template>
    </SelectButton>
    <div class="player-row">
      <button class="pbtn" aria-label="Nota nazaj" @click="emit('prev')">
        <i class="pi pi-step-backward" />
      </button>
      <button
        class="pbtn play"
        :aria-label="playing ? 'Pavza' : 'Predvajaj'"
        @click="emit('toggle')"
      >
        <i :class="playing ? 'pi pi-pause' : 'pi pi-play'" />
      </button>
      <button
        class="tap"
        :class="[`b${practice}`, { hit: practice >= 0 && flash === practice, waiting }]"
        :disabled="practice < 0"
        :aria-label="practice < 0 ? 'Najprej izberi zvon' : `Udari zvon ${practice + 1}`"
        @pointerdown.prevent="emit('tap')"
      >
        <template v-if="practice >= 0"
          ><strong>{{ practice + 1 }}</strong
          ><small>udari</small></template
        >
        <small v-else>izberi<br />zvon</small>
      </button>
      <button class="pbtn" aria-label="Ustavi" :disabled="!canStop" @click="emit('stop')">
        <span class="stop-icon" />
      </button>
      <button class="pbtn" aria-label="Nota naprej" @click="emit('next')">
        <i class="pi pi-step-forward" />
      </button>
    </div>
  </nav>
</template>

<style>
.player {
  position: fixed;
  inset: auto 0 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 16px calc(10px + env(safe-area-inset-bottom));
  background: var(--chrome);
  border-top: 1px solid var(--line);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.25);
  touch-action: manipulation; /* no double-tap zoom while tapping along */
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.player-bells .p-togglebutton {
  padding: 4px 12px;
  font-size: 13px;
  background: transparent; /* no grey bar behind the bells */
  border-color: transparent;
}
.player-bells .p-togglebutton.p-togglebutton-checked {
  background: transparent;
  border-color: transparent;
}
/* the chosen bell sits on a raised chip */
.player-bells .p-togglebutton-checked .p-togglebutton-content {
  background: var(--chrome-raised);
  box-shadow: 0 0 0 1px var(--line);
}
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
.player-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  max-width: 420px;
}
.pbtn {
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.08s;
}
.pbtn .pi {
  font-size: 18px;
}
.pbtn:hover:not(:disabled) {
  background: var(--chrome-raised);
}
.pbtn:active:not(:disabled) {
  transform: scale(0.94);
}
.pbtn:disabled {
  opacity: 0.35;
  cursor: default;
}
/* play: solid accent circle, as in music apps */
.pbtn.play {
  background: var(--accent);
  color: var(--chrome-deep);
}
.pbtn.play:hover {
  background: #fbbf24; /* amber-400 */
}
.pbtn.play .pi-play {
  margin-left: 3px; /* optical centre of the triangle */
}
/* stop: a filled accent square (PrimeIcons only has an outlined one) */
.stop-icon {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background: var(--accent);
}
.tap {
  width: 96px;
  height: 96px;
  flex: none;
  border: 0;
  border-radius: 50%;
  background: var(--c, var(--line));
  color: #fff;
  display: grid;
  place-content: center;
  line-height: 1;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--c, #000) 35%, transparent);
  transition:
    transform 0.06s,
    box-shadow 0.06s;
}
.tap strong {
  font:
    700 36px Roboto,
    sans-serif;
}
.tap small {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
}
.tap:disabled {
  background: var(--chrome-raised);
  color: var(--muted);
  box-shadow: inset 0 0 0 1px var(--line);
}
.tap.hit {
  transform: scale(0.92);
  box-shadow: 0 0 0 10px color-mix(in srgb, var(--c) 30%, transparent);
}
.tap.waiting {
  animation: pulse-bg 0.8s ease-in-out infinite alternate;
}
</style>

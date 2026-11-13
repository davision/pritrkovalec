<script setup lang="ts">
import { useTemplateRef } from 'vue'
import SelectButton from 'primevue/selectbutton'
import Popover from 'primevue/popover'
import BellIcon from './BellIcon.vue'
import { BELL_OPTIONS } from '../composables/useSettings.ts'

// Player docked at the bottom: transport buttons and the big circle that strikes the chosen bell like
// space does. The bell is chosen in a popover above the circle: from the circle itself while none is
// chosen, then from the small bell badge on its top-right corner.
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

const picker = useTemplateRef<InstanceType<typeof Popover>>('picker')
const circle = useTemplateRef<HTMLButtonElement>('circle')
// always point the popover at the big circle, also when opened from the badge
const openPicker = (e: Event) => picker.value?.toggle(e, circle.value)

// the circle strikes on pointerdown (no click delay); with no bell chosen it opens the picker instead
function onCircleDown() {
  if (practice.value >= 0) emit('tap')
}
function onCircleClick(e: MouseEvent) {
  if (practice.value < 0) openPicker(e)
}
function choose() {
  picker.value?.hide()
}
</script>

<template>
  <nav class="player dark" aria-label="Predvajalnik">
    <div class="player-row">
      <button class="pbtn" aria-label="Nota nazaj" @click="emit('prev')">
        <i class="pi pi-step-backward" />
      </button>
      <button
        class="pbtn play"
        :aria-label="playing ? 'Pavza' : 'Predvajaj'"
        @click="emit('toggle')"
      >
        <i v-if="playing" class="pi pi-pause" />
        <!-- filled triangle: PrimeIcons' play is only an outline -->
        <svg v-else class="play-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.2v11.6c0 .6.7 1 1.2.6l9-5.8a.7.7 0 0 0 0-1.2l-9-5.8C4.7 1.2 4 1.6 4 2.2z" />
        </svg>
      </button>
      <div class="tap-wrap">
        <button
          ref="circle"
          class="tap"
          :class="[
            `b${practice}`,
            { empty: practice < 0, hit: practice >= 0 && flash === practice, waiting },
          ]"
          :aria-label="practice < 0 ? 'Izberi zvon' : `Udari zvon ${practice + 1}`"
          :aria-haspopup="practice < 0 ? 'dialog' : undefined"
          @pointerdown.prevent="onCircleDown"
          @click="onCircleClick"
        >
          <template v-if="practice >= 0"
            ><strong>{{ practice + 1 }}</strong
            ><small>udari</small></template
          >
          <small v-else>izberi<br />zvon</small>
        </button>
        <button
          v-if="practice >= 0"
          class="bell-badge"
          aria-label="Zamenjaj zvon"
          aria-haspopup="dialog"
          @click="openPicker"
        >
          <BellIcon :bell="practice" plain />
        </button>
      </div>
      <button class="pbtn" aria-label="Ustavi" :disabled="!canStop" @click="emit('stop')">
        <span class="stop-icon" />
      </button>
      <button class="pbtn" aria-label="Nota naprej" @click="emit('next')">
        <i class="pi pi-step-forward" />
      </button>
    </div>

    <Popover ref="picker" class="bell-picker">
      <p class="bell-picker-title">Igram zvon</p>
      <SelectButton
        v-model="practice"
        :options="BELL_OPTIONS"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        class="player-bells"
        @change="choose"
      >
        <template #option="{ option }">
          <BellIcon v-if="option.value >= 0" :bell="option.value" />
          <span v-else>{{ option.label }}</span>
        </template>
      </SelectButton>
    </Popover>
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
/* bell picker popover above the circle. The circle sits in the middle of a symmetric row, so the
   middle of the screen is the circle's centre: centre the popover and its arrow there. */
.bell-picker.p-popover {
  left: 50% !important; /* PrimeVue aligns the popover's left edge to the circle's */
  translate: -50% 0; /* `translate`, not `transform`, which the open animation uses */
}
.bell-picker.p-popover::before,
.bell-picker.p-popover::after {
  left: 50%;
}
.bell-picker-title {
  margin: 0 0 8px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
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
.play-icon {
  width: 18px;
  height: 18px;
  margin-left: 2px; /* optical centre of the triangle */
  fill: currentColor;
}
/* stop: a filled accent square (PrimeIcons only has an outlined one) */
.stop-icon {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background: var(--accent);
}
/* the circle, with the chosen bell's badge on its top-left */
.tap-wrap {
  position: relative;
  flex: none;
}
.bell-badge {
  position: absolute;
  top: -5px;
  right: -12px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 3px solid var(--chrome);
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transition: transform 0.08s;
}
.bell-badge:active {
  transform: scale(0.92);
}
.bell-badge .bell-icon {
  width: 22px;
  height: 22px;
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
  cursor: pointer;
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
.tap.empty {
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

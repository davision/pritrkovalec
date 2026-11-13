<script setup lang="ts">
import Select from 'primevue/select'
import Slider from 'primevue/slider'
import ToggleSwitch from 'primevue/toggleswitch'
import Tag from 'primevue/tag'
import SidePanel from './SidePanel.vue'
import { TEMPOS, VIEW_OPTIONS, type View } from '../composables/useSettings.ts'

// Left panel: how the score looks and plays, then keyboard shortcuts and the copyright at the bottom.
const { open = false } = defineProps<{ open?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const view = defineModel<View>('view', { required: true })
const tempoIdx = defineModel<number>('tempoIdx', { required: true })
const hostVolume = defineModel<number>('hostVolume', { required: true })
const waitForMe = defineModel<boolean>('waitForMe', { required: true })
</script>

<template>
  <SidePanel title="Nastavitve" side="left" :open="open" @close="emit('close')">
    <div class="drawer-fields">
      <div class="field">
        <label>Vrsta zapisa</label>
        <Select v-model="view" :options="VIEW_OPTIONS" option-label="label" option-value="value" />
      </div>
      <!-- tuning picker, hidden for now (usePlayer always uses the first tuning):
      <div class="field">
        <label>Uglasitev</label>
        <Select v-model="tuning" :options="Object.keys(tunings)" />
      </div> -->
      <div class="field">
        <label
          >Tempo <strong>{{ TEMPOS[tempoIdx] }}</strong> udarcev/min</label
        >
        <Slider v-model="tempoIdx" :min="0" :max="TEMPOS.length - 1" :step="1" />
        <div class="ticks">
          <button
            v-for="(value, i) in TEMPOS"
            :key="value"
            :class="{ on: i === tempoIdx }"
            @click="tempoIdx = i"
          >
            {{ value }}
          </button>
        </div>
      </div>
      <div class="field">
        <label
          >Glasnost spremljave (x) <strong>{{ hostVolume }} %</strong></label
        >
        <Slider v-model="hostVolume" :min="0" :max="100" :step="5" />
      </div>
      <label class="toggle"><ToggleSwitch v-model="waitForMe" /> Počakaj name (P)</label>
      <!-- <label class="toggle"><ToggleSwitch v-model="metronome" /> Metronom {{ beatsPerBar }}/4 (M)</label> -->
    </div>
    <div class="panel-foot">
      <ul class="shortcuts">
        <li>
          <Tag class="key" value="preslednica" /> udari izbrani zvon (na zvonu 1 začne melodijo)
        </li>
        <li><Tag class="key" value="S" /> predvajaj / pavza</li>
        <li><Tag class="key" value="←" /> <Tag class="key" value="→" /> nota nazaj / naprej</li>
        <li>
          <Tag class="key" value="1" />–<Tag class="key" value="4" /> izberi zvon,
          <Tag class="key" value="0" /> vsi zvonovi
        </li>
        <li><Tag class="key" value="Esc" /> ustavi (na začetek)</li>
        <li><Tag class="key" value="P" /> počakaj name</li>
      </ul>
      <footer class="footer">Copyright © 2026 David Ličen</footer>
    </div>
  </SidePanel>
</template>

<style>
.drawer-fields {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-top: 8px;
}
.field .p-slider {
  margin: 8px 6px 0;
}
.ticks {
  display: flex;
  justify-content: space-between;
}
.ticks button {
  font-size: 12px;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px;
}
.ticks button.on {
  color: var(--ink);
  font-weight: 700;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
/* bottom of the left panel: keyboard shortcuts and copyright */
.panel-left {
  display: flex;
  flex-direction: column;
}
.panel-foot {
  margin-top: auto;
  padding-top: 24px;
}
.footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--muted);
}
.shortcuts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--muted);
}
.shortcuts .key {
  padding: 1px 6px;
  font:
    500 11px/1.4 Roboto,
    sans-serif;
  border: 1px solid var(--line);
  border-bottom-width: 2px; /* reads as a key cap */
  background: var(--chrome-raised);
  color: var(--ink);
}
/* keyboard shortcuts are only useful with a keyboard */
@media (pointer: coarse) {
  .shortcuts {
    display: none;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { WINDOWS, type Result } from '../lib/score.ts'

// Accuracy of the last play-along, shown after Ustavi. Closing sets the result back to null.
const result = defineModel<Result | null>('result', { default: null })

const verdict = computed(() => {
  const s = result.value?.score ?? 0
  return s >= 95
    ? 'Odlično!'
    : s >= 85
      ? 'Zelo dobro'
      : s >= 70
        ? 'Dobro'
        : s >= 50
          ? 'Še malo vaje'
          : 'Vadi naprej'
})
// average offset: negative = early (rushing), positive = late (dragging)
const timing = computed(() => {
  const mean = result.value?.mean ?? 0
  return Math.abs(mean) < 10
    ? 'Lepo na udarcu'
    : `V povprečju ${Math.abs(mean)} ms ${mean < 0 ? 'prezgodaj' : 'prepozno'}`
})
</script>

<template>
  <Dialog
    :visible="!!result"
    modal
    dismissable-mask
    header="Natančnost igranja"
    class="result-dialog"
    @update:visible="result = null"
  >
    <template v-if="result">
      <p class="result-score">{{ result.score }}<small>/100</small></p>
      <p class="result-verdict">{{ verdict }}</p>
      <ul class="result-counts">
        <li v-for="(w, k) in WINDOWS" :key="w.label">
          <span
            >{{ w.label }} <small>±{{ w.ms }} ms</small></span
          ><strong>{{ result.counts[k] }}</strong>
        </li>
        <li>
          <span>Zgrešeno</span><strong>{{ result.miss }}</strong>
        </li>
        <li v-if="result.stray">
          <span>Odvečni udarci</span><strong>{{ result.stray }}</strong>
        </li>
      </ul>
      <p v-if="result.counts.some(Boolean)" class="result-mean">{{ timing }}</p>
      <Button label="Zapri" class="result-close" @click="result = null" />
    </template>
  </Dialog>
</template>

<style>
.result-dialog {
  width: min(92vw, 380px);
}
.result-score {
  margin: 0;
  text-align: center;
  font:
    700 64px/1 Roboto,
    sans-serif;
  color: var(--accent);
}
.result-score small {
  font-size: 20px;
  color: var(--muted);
}
.result-verdict {
  margin: 4px 0 16px;
  text-align: center;
  font-size: 18px;
}
.result-counts {
  list-style: none;
  padding: 0;
  margin: 0;
}
.result-counts li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--line);
}
.result-counts small,
.result-mean {
  color: var(--muted);
}
.result-mean {
  text-align: center;
}
.result-close {
  width: 100%;
}
</style>

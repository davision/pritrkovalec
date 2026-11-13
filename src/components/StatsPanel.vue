<script setup lang="ts">
import SidePanel from './SidePanel.vue'
import type { SongStats } from '../composables/usePlayHistory.ts'

// Right panel: each played song with its best score; a song expands into all its plays.
const { open = false } = defineProps<{ open?: boolean; stats: SongStats[] }>()
const emit = defineEmits<{ close: [] }>()
const fmtDate = (at: number) =>
  new Date(at).toLocaleString('sl-SI', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <SidePanel title="Statistika" side="right" :open="open" @close="emit('close')">
    <p v-if="!stats.length" class="stats-empty">
      Še ni odigranih melodij. Izberi zvon, igraj zraven in na koncu pritisni Ustavi.
    </p>
    <details v-for="s in stats" :key="s.name" class="stats-song">
      <summary>
        <span
          >{{ s.name }}<small>{{ s.list.length }}× igrano</small></span
        >
        <strong title="Najboljši rezultat">{{ s.best }}</strong>
      </summary>
      <ul>
        <li v-for="p in s.list" :key="p.at">
          <span
            >{{ fmtDate(p.at) }}<small>zvon {{ p.bell }} · {{ p.tempo }}/min</small></span
          >
          <strong>{{ p.score }}</strong>
        </li>
      </ul>
    </details>
  </SidePanel>
</template>

<style>
.stats-empty {
  color: var(--muted);
}
.stats-song {
  border-bottom: 1px solid var(--line);
}
.stats-song summary,
.stats-song li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.stats-song summary {
  padding: 12px 0;
  cursor: pointer;
}
.stats-song summary::-webkit-details-marker {
  display: none;
}
.stats-song summary::before {
  content: '▸';
  color: var(--muted);
  transition: rotate 0.15s;
}
.stats-song[open] summary::before {
  rotate: 90deg;
}
.stats-song summary span {
  flex: 1;
}
.stats-song small {
  display: block;
  font-size: 12px;
  color: var(--muted);
}
.stats-song summary strong {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}
.stats-song ul {
  list-style: none;
  margin: 0 0 12px;
  padding: 0 0 0 22px;
}
.stats-song li {
  padding: 6px 0;
  border-top: 1px dashed var(--line);
}
</style>

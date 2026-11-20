<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import MelodyThumb from './MelodyThumb.vue'
import { pieces } from '../lib/melodies.ts'

// The melody picker: a button with the current piece that opens a gallery of all pieces, grouped by how many
// bells they use, favourites (starred, kept by name) first in each group.
const pieceIdx = defineModel<number>('pieceIdx', { required: true })
const favorites = defineModel<string[]>('favorites', { required: true })
// plays of each piece by everyone, by name; null when the server isn't reachable (then no counts show)
const { counts = null } = defineProps<{ counts?: Record<string, number> | null }>()
// 1 predvajanje, 2 predvajanji, 3–4 predvajanja, 0 / 5+ predvajanj (by the last two digits: 101 predvajanje)
function playsLabel(n: number) {
  const d = n % 100
  return `${n} ${d === 1 ? 'predvajanje' : d === 2 ? 'predvajanji' : d === 3 || d === 4 ? 'predvajanja' : 'predvajanj'}`
}

const open = shallowRef(false)

const bellWord = (n: number) => (n === 2 ? 'zvonova' : n === 1 ? 'zvon' : 'zvonovi')
const groups = computed(() => {
  const fav = new Set(favorites.value)
  const by = new Map<number, number[]>()
  pieces.forEach((p, i) => {
    const n = new Set(p.strikes.map((s) => s.bell)).size
    by.set(n, [...(by.get(n) ?? []), i])
  })
  return [...by]
    .sort(([a], [b]) => a - b)
    .map(([n, list]) => ({
      title: `${n} ${bellWord(n)}`,
      // stable sort: favourites first, otherwise the order of `pieces`
      list: list.sort((a, b) => +fav.has(pieces[b]!.name) - +fav.has(pieces[a]!.name)),
    }))
})

function toggleFavorite(name: string) {
  favorites.value = favorites.value.includes(name)
    ? favorites.value.filter((n) => n !== name)
    : [...favorites.value, name]
}
function pick(i: number) {
  pieceIdx.value = i
  open.value = false
}
</script>

<template>
  <button
    type="button"
    class="piece-trigger"
    aria-haspopup="dialog"
    aria-labelledby="piece-label piece-name"
    @click="open = true"
  >
    <MelodyThumb :piece="pieces[pieceIdx]!" class="piece-trigger-thumb" />
    <span id="piece-name">{{ pieces[pieceIdx]!.name }}</span>
    <i class="pi pi-chevron-down" aria-hidden="true" />
  </button>

  <Dialog
    v-model:visible="open"
    modal
    dismissable-mask
    header="Izberi melodijo"
    class="melody-dialog"
  >
    <section v-for="g in groups" :key="g.title" class="melody-group">
      <h3>{{ g.title }}</h3>
      <ul class="melody-grid">
        <li v-for="i in g.list" :key="i" class="melody-tile" :class="{ selected: i === pieceIdx }">
          <button type="button" class="melody-pick" :aria-current="i === pieceIdx" @click="pick(i)">
            <MelodyThumb :piece="pieces[i]!" />
            <span>{{ pieces[i]!.name }}</span>
            <small v-if="counts" class="melody-plays">{{
              playsLabel(counts[pieces[i]!.name] ?? 0)
            }}</small>
          </button>
          <button
            type="button"
            class="melody-star"
            :aria-pressed="favorites.includes(pieces[i]!.name)"
            :aria-label="`Priljubljena: ${pieces[i]!.name}`"
            @click="toggleFavorite(pieces[i]!.name)"
          >
            <i
              class="pi"
              :class="favorites.includes(pieces[i]!.name) ? 'pi-star-fill' : 'pi-star'"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </section>
    <!-- placeholder: the melody editor comes later -->
    <Button
      label="Ustvari svojo melodijo"
      icon="pi pi-plus"
      severity="secondary"
      outlined
      disabled
      class="melody-create"
    />
    <small class="melody-soon">Kmalu</small>
  </Dialog>
</template>

<style>
/* looks like the duration Select next to it (see .controls in App.vue) */
.piece-trigger {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 6px;
  min-height: 2.5rem;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  color: var(--ink);
  font:
    700 1rem Roboto,
    sans-serif;
  cursor: pointer;
  text-align: left;
}
.piece-trigger:hover {
  border-color: #d4d4d8;
}
.piece-trigger:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.piece-trigger > span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.piece-trigger-thumb {
  width: 30px;
  flex: none;
}
.piece-trigger .pi {
  color: var(--muted);
  font-size: 0.8rem;
}

.melody-dialog {
  width: min(94vw, 760px);
}
.melody-group h3 {
  margin: 4px 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.melody-grid {
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.melody-tile {
  position: relative;
}
.melody-pick {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--chrome-raised);
  border: 2px solid transparent;
  border-radius: 10px;
  color: var(--ink);
  font:
    500 14px/1.25 Roboto,
    sans-serif;
  text-align: left;
  cursor: pointer;
}
.melody-pick:hover {
  border-color: var(--line);
}
.melody-pick:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.melody-plays {
  margin-top: -6px; /* close under the name */
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
}
.melody-tile.selected .melody-pick {
  border-color: var(--accent);
}
.melody-star {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: none;
  border: 0;
  border-radius: 50%;
  color: var(--muted);
  cursor: pointer;
}
.melody-star:hover,
.melody-star[aria-pressed='true'] {
  color: var(--accent);
}
.melody-star:focus-visible {
  outline: 2px solid var(--accent);
}
.melody-create {
  width: 100%;
}
.melody-soon {
  display: block;
  margin-top: 4px;
  text-align: center;
  color: var(--muted);
}
</style>

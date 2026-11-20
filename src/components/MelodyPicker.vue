<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import SelectButton from 'primevue/selectbutton'
import MelodyThumb from './MelodyThumb.vue'
import MelodyEditor from './MelodyEditor.vue'
import type { Piece } from '../lib/melodies.ts'
import { bellCount } from '../lib/notation.ts'
import { norm } from '../lib/custom.ts'
import type { useLibrary } from '../composables/useLibrary.ts'

// The melody picker: a button with the current piece that opens a gallery of all pieces (built-in and user
// melodies), grouped by how many bells they use, favourites (starred, kept by name) first in each group.
// Search by name or another name, or show only 3- or 4-bell melodies. New melodies (beta) open the editor.
const pieceName = defineModel<string>('pieceName', { required: true })
const favorites = defineModel<string[]>('favorites', { required: true })
const {
  library,
  counts = null,
  rpm,
  hostVolume,
} = defineProps<{
  library: ReturnType<typeof useLibrary>
  // plays of each piece by everyone, by name; null when the server isn't reachable (then no counts show)
  counts?: Record<string, number> | null
  rpm: number // the app's tempo and x volume, for listening to a new melody
  hostVolume: number
}>()
// the gallery opened: the caller pauses the melody playing behind it
const emit = defineEmits<{ opened: [] }>()
// 1 predvajanje, 2 predvajanji, 3–4 predvajanja, 0 / 5+ predvajanj (by the last two digits: 101 predvajanje)
function playsLabel(n: number) {
  const d = n % 100
  return `${n} ${d === 1 ? 'predvajanje' : d === 2 ? 'predvajanji' : d === 3 || d === 4 ? 'predvajanja' : 'predvajanj'}`
}

const open = shallowRef(false)
const editing = shallowRef(false)
const query = shallowRef('')
const bellFilter = shallowRef(0) // 0 = all
const BELL_FILTERS = [
  { label: 'Vse', value: 0 },
  { label: '3 zvonovi', value: 3 },
  { label: '4 zvonovi', value: 4 },
]
const confirmDelete = shallowRef('') // id of a melody whose delete button asks "Izbrišem?"

const all = computed(() => library.all.value)
const aliasesOf = (p: Piece) => library.aliases.value[p.name] ?? []
const current = computed(() => all.value.find((p) => p.name === pieceName.value) ?? all.value[0]!)

const bellWord = (n: number) => (n === 2 ? 'zvonova' : n === 1 ? 'zvon' : 'zvonovi')
const groups = computed(() => {
  const q = norm(query.value)
  const fav = new Set(favorites.value)
  const by = new Map<number, Piece[]>()
  for (const p of all.value) {
    const n = bellCount(p.strikes)
    if (bellFilter.value && n !== bellFilter.value) continue
    if (q && ![p.name, ...aliasesOf(p)].some((s) => norm(s).includes(q))) continue
    by.set(n, [...(by.get(n) ?? []), p])
  }
  return [...by]
    .sort(([a], [b]) => a - b)
    .map(([n, list]) => ({
      title: `${n} ${bellWord(n)}`,
      // stable sort: favourites first, otherwise built-in pieces then user melodies, oldest first
      list: list.sort((a, b) => +fav.has(b.name) - +fav.has(a.name)),
    }))
})

function toggleFavorite(name: string) {
  favorites.value = favorites.value.includes(name)
    ? favorites.value.filter((n) => n !== name)
    : [...favorites.value, name]
}
function pick(name: string) {
  pieceName.value = name
  open.value = false
}
function create() {
  open.value = false
  editing.value = true
}
async function remove(p: Piece) {
  if (confirmDelete.value !== p.custom!.id) return (confirmDelete.value = p.custom!.id)
  confirmDelete.value = ''
  if (await library.remove(p.custom!.id)) {
    favorites.value = favorites.value.filter((n) => n !== p.name)
  }
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
    <MelodyThumb :piece="current" class="piece-trigger-thumb" />
    <span id="piece-name">{{ current.name }}</span>
    <i class="pi pi-chevron-down" aria-hidden="true" />
  </button>

  <Dialog
    v-model:visible="open"
    modal
    dismissable-mask
    header="Izberi melodijo"
    class="melody-dialog"
    @show="emit('opened')"
    @hide="query = ''"
  >
    <div class="melody-filters">
      <IconField class="melody-search">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="query"
          type="search"
          placeholder="Išči po imenu"
          aria-label="Išči melodijo po imenu"
          autocomplete="off"
        />
      </IconField>
      <SelectButton
        v-model="bellFilter"
        :options="BELL_FILTERS"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        aria-label="Število zvonov"
      />
    </div>

    <section v-for="g in groups" :key="g.title" class="melody-group">
      <h3>{{ g.title }}</h3>
      <ul class="melody-grid">
        <li
          v-for="p in g.list"
          :key="p.name"
          class="melody-tile"
          :class="{ selected: p.name === current.name }"
        >
          <button
            type="button"
            class="melody-pick"
            :aria-current="p.name === current.name"
            @click="pick(p.name)"
          >
            <MelodyThumb :piece="p" />
            <span>{{ p.name }} <span v-if="p.custom" class="beta-tag">beta</span></span>
            <small v-if="aliasesOf(p).length" class="melody-aliases"
              >tudi: {{ aliasesOf(p).join(', ') }}</small
            >
            <small v-if="counts" class="melody-plays">{{ playsLabel(counts[p.name] ?? 0) }}</small>
          </button>
          <button
            type="button"
            class="melody-star"
            :aria-pressed="favorites.includes(p.name)"
            :aria-label="`Priljubljena: ${p.name}`"
            @click="toggleFavorite(p.name)"
          >
            <i
              class="pi"
              :class="favorites.includes(p.name) ? 'pi-star-fill' : 'pi-star'"
              aria-hidden="true"
            />
          </button>
          <!-- own melodies: a second press confirms -->
          <button
            v-if="p.custom?.mine"
            type="button"
            class="melody-delete"
            :class="{ confirm: confirmDelete === p.custom.id }"
            :aria-label="
              confirmDelete === p.custom.id ? `Res izbrišem ${p.name}?` : `Izbriši ${p.name}`
            "
            @click="remove(p)"
            @blur="confirmDelete = ''"
          >
            <i class="pi pi-trash" aria-hidden="true" />
            <span v-if="confirmDelete === p.custom.id">Izbrišem?</span>
          </button>
        </li>
      </ul>
    </section>
    <p v-if="!groups.length" class="melody-empty">Ni melodije s tem imenom.</p>

    <Button
      label="Ustvari svojo melodijo"
      icon="pi pi-plus"
      severity="secondary"
      outlined
      class="melody-create"
      :disabled="!library.online.value"
      @click="create"
    />
    <small v-if="!library.online.value" class="melody-soon"
      >Za nove melodije je potrebna povezava s strežnikom.</small
    >
  </Dialog>

  <MelodyEditor
    v-model:open="editing"
    :pieces="all"
    :aliases="library.aliases.value"
    :save="library.create"
    :save-alias="library.addAlias"
    :rpm="rpm"
    :host-volume="hostVolume"
    @saved="pick"
  />
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
.melody-aliases {
  margin-top: -6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
  font-style: italic;
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
.melody-delete {
  position: absolute;
  bottom: 6px;
  right: 6px;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
  background: none;
  border: 0;
  border-radius: 16px;
  color: var(--muted);
  font:
    500 12px Roboto,
    sans-serif;
  cursor: pointer;
}
.melody-delete:hover,
.melody-delete.confirm {
  color: #fff;
  background: var(--p-red-500);
}
.melody-delete:focus-visible {
  outline: 2px solid var(--accent);
}
.melody-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 16px;
}
.melody-search {
  flex: 1 1 220px;
}
.melody-search input {
  width: 100%;
}
.melody-empty {
  text-align: center;
  color: var(--muted);
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

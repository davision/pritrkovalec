<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import RadioButton from 'primevue/radiobutton'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import MelodyThumb from './MelodyThumb.vue'
import MalaScore from './score/MalaScore.vue'
import type { Piece } from '../lib/melodies.ts'
import {
  build,
  defaultPerBar,
  findSame,
  parseMelody,
  sameName,
  MAX_NAME,
  type MelodyDef,
} from '../lib/custom.ts'
import type { SaveResult } from '../composables/useLibrary.ts'
import { usePlayer } from '../composables/usePlayer.ts'

// Making a melody (beta) the way ringers describe one: how many bells, the line of the first round without the
// hosting strikes, which bell hosts, how often the line repeats, and whether it then turns to the next bell.
// When the same melody is already in the app, it is saved as another name for that one instead.
// The melody can be heard first (at the app's tempo), and saving asks once more: everyone will see it.
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  pieces: Piece[]
  aliases: Record<string, string[]>
  save: (def: MelodyDef) => Promise<SaveResult>
  saveAlias: (piece: string, alias: string) => Promise<SaveResult>
  rpm: number // the app's tempo, for listening
  hostVolume: number // % volume of the x strikes, as in the app
}>()
const emit = defineEmits<{ saved: [name: string] }>()

const name = shallowRef('')
const bells = shallowRef(4)
const text = shallowRef('')
const host = shallowRef(4)
const reps = shallowRef(2)
const turns = shallowRef(true)
const perBarChoice = shallowRef<number | null>(null) // null = automatic
const REPS = [1, 2, 3, 4].map((n) => ({ label: `${n}×`, value: n }))
const busy = shallowRef(false)
const failed = shallowRef('')
const touched = shallowRef(false) // errors show only after the first save attempt

// a new bell count: the last bell hosts, as in most melodies
watch(bells, (b) => (host.value = b))
watch(open, (o) => {
  if (!o) return
  name.value = text.value = failed.value = ''
  bells.value = host.value = 4
  reps.value = 2
  turns.value = true
  perBarChoice.value = null
  touched.value = false
})

const parsed = computed(() => parseMelody(text.value, bells.value))
const melody = computed(() => (Array.isArray(parsed.value) ? parsed.value : null))
// bar choices that divide the line, and the whole line as one bar
const barOptions = computed(() => {
  const len = melody.value?.length ?? 0
  const opts = [3, 4].filter((n) => len > n && len % n === 0)
  return [
    ...opts.map((n) => ({ label: `${n}/4`, value: n })),
    { label: 'cela vrstica', value: len },
  ]
})
const perBar = computed(() => {
  const len = melody.value?.length ?? 1
  const chosen = perBarChoice.value
  return chosen && barOptions.value.some((o) => o.value === chosen) ? chosen : defaultPerBar(len)
})

// the melody without its name: typing the name doesn't rebuild the preview or stop listening
const shape = computed<Omit<MelodyDef, 'name'> | null>(() =>
  melody.value
    ? {
        bells: bells.value,
        melody: melody.value,
        host: host.value,
        reps: reps.value,
        turn: turns.value,
        perBar: perBar.value,
      }
    : null,
)
const def = computed<MelodyDef | null>(() =>
  shape.value ? { ...shape.value, name: name.value.trim() } : null,
)
const preview = computed<Piece | null>(() =>
  shape.value ? { name: 'Predogled', strikes: build({ ...shape.value, name: '' }) } : null,
)

// listening: a player of its own on the preview, all bells, no metronome; any change to the melody stops it
const SILENT: Piece = { name: '', strikes: [{ bell: 0, label: '1', accent: false }] }
const {
  playing,
  countdown,
  current: playingAt,
  toggle: listen,
  finish: stopListening,
} = usePlayer({
  piece: computed(() => preview.value ?? SILENT),
  rpm: toRef(props, 'rpm'),
  hostVolume: toRef(props, 'hostVolume'),
  practice: shallowRef(-1),
  waitForMe: shallowRef(false),
  metronome: shallowRef(false),
  minutes: shallowRef(0),
})
watch(open, (o) => !o && stopListening())

// saving publishes to everyone: the first press asks, the second saves; any change asks again
const confirming = shallowRef(false)
watch(def, () => (confirming.value = false))
// the same melody already in the app: then this name is saved as another name for it
const same = computed(() => (def.value ? (findSame(def.value, props.pieces)[0] ?? null) : null))

const nameError = computed(() => {
  const n = name.value.trim()
  if (!n) return same.value ? 'Vpiši ime, pod katerim jo poznaš' : 'Vpiši ime melodije'
  if (n.length > MAX_NAME) return `Največ ${MAX_NAME} znakov`
  const taken = props.pieces.some(
    (p) => sameName(p.name, n) || props.aliases[p.name]?.some((a) => sameName(a, n)),
  )
  return taken ? 'To ime že obstaja' : ''
})

async function submit() {
  touched.value = true
  failed.value = ''
  if (nameError.value || !def.value) return
  if (!confirming.value) return (confirming.value = true)
  confirming.value = false
  stopListening()
  busy.value = true
  const result = same.value
    ? await props.saveAlias(same.value.name, def.value.name)
    : await props.save(def.value)
  busy.value = false
  if (result === 'taken') failed.value = 'To ime je medtem že nekdo uporabil. Izberi drugo.'
  else if (result === 'error')
    failed.value = 'Shranjevanje ni uspelo. Preveri povezavo in poskusi znova.'
  else {
    open.value = false
    emit('saved', same.value ? same.value.name : def.value.name)
  }
}
</script>

<template>
  <Dialog v-model:visible="open" modal class="melody-editor">
    <template #header>
      <span class="p-dialog-title">Nova melodija <span class="beta-tag">beta</span></span>
    </template>
    <form class="editor-form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="melody-name">Ime</label>
        <InputText
          id="melody-name"
          v-model="name"
          :maxlength="MAX_NAME"
          :invalid="touched && !!nameError"
          autocomplete="off"
        />
        <small v-if="touched && nameError" class="field-error">{{ nameError }}</small>
      </div>

      <fieldset class="field">
        <legend>Število zvonov</legend>
        <div class="radios">
          <label v-for="n in [3, 4]" :key="n"
            ><RadioButton v-model="bells" :value="n" name="bells" /> {{ n }} zvonovi</label
          >
        </div>
      </fieldset>

      <div class="field">
        <label for="melody-notes">Melodija</label>
        <InputText
          id="melody-notes"
          v-model="text"
          inputmode="numeric"
          placeholder="npr. 1 1 2 2"
          autocomplete="off"
          :invalid="(touched || text !== '') && !melody"
          aria-describedby="melody-notes-help"
        />
        <small v-if="(touched || text !== '') && typeof parsed === 'string'" class="field-error">{{
          parsed
        }}</small>
        <small v-else id="melody-notes-help" class="field-help"
          >Številke zvonov v prvem krogu, brez gostenja.</small
        >
      </div>

      <fieldset class="field">
        <legend>Gosti (x)</legend>
        <div class="radios">
          <label v-for="n in bells" :key="n"
            ><RadioButton v-model="host" :value="n" name="host" /> zvon {{ n }}</label
          >
        </div>
      </fieldset>

      <div class="field">
        <label id="reps-label">Vrstica se ponovi</label>
        <SelectButton
          v-model="reps"
          :options="REPS"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-labelledby="reps-label"
        />
      </div>

      <label class="switch-row">
        <ToggleSwitch v-model="turns" />
        <span
          >Naokoli
          <small class="field-help">nato jo začne naslednji zvon, vse do zadnjega</small></span
        >
      </label>

      <div v-if="melody && barOptions.length > 1" class="field">
        <label id="bar-label">Takt</label>
        <SelectButton
          :model-value="perBar"
          :options="barOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-labelledby="bar-label"
          @update:model-value="perBarChoice = $event"
        />
      </div>

      <section v-if="preview" class="editor-preview" aria-label="Predogled">
        <MelodyThumb :piece="preview" class="editor-thumb" />
        <div class="editor-score">
          <MalaScore :piece="preview" :current="playingAt" :waiting="-1" :practice="-1" />
        </div>
        <Button
          class="editor-listen"
          :icon="playing ? 'pi pi-stop' : 'pi pi-play'"
          :label="countdown ? String(countdown) : playing ? 'Ustavi' : 'Poslušaj'"
          severity="secondary"
          rounded
          @click="playing ? stopListening() : listen()"
        />
      </section>

      <Message v-if="same" severity="info" class="editor-same">
        Ta melodija je že v aplikaciji kot <strong>{{ same.name }}</strong>. Če jo poznaš pod drugim
        imenom, ga vpiši zgoraj in ga dodamo kot drugo ime.
      </Message>
      <Message v-if="failed" severity="error">{{ failed }}</Message>
      <Message v-if="confirming" severity="warn" role="alert">
        {{ same ? 'Drugo ime' : 'Melodija' }} bo {{ same ? 'vidno' : 'vidna' }} vsem uporabnikom
        aplikacije. Si prepričan?
      </Message>

      <div class="editor-actions">
        <Button
          :label="confirming ? 'Nazaj' : 'Prekliči'"
          severity="secondary"
          text
          @click="confirming ? (confirming = false) : (open = false)"
        />
        <Button
          type="submit"
          :label="confirming ? 'Da, objavi' : same ? 'Dodaj drugo ime' : 'Shrani melodijo'"
          :loading="busy"
          icon="pi pi-check"
        />
      </div>
    </form>
  </Dialog>
</template>

<style>
.melody-editor {
  width: min(94vw, 560px);
}
.beta-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--accent);
  color: #1b1b1b;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  vertical-align: middle;
}
.editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.editor-form fieldset {
  border: 0;
  margin: 0;
  padding: 0;
}
.editor-form legend {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}
.radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.radios label,
.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.field-help {
  color: var(--muted);
}
.field-error {
  color: var(--p-red-400);
}
.editor-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: var(--chrome-raised);
}
.editor-thumb {
  width: 72px;
  flex: none;
}
.editor-score {
  flex: 1;
  min-width: 0;
  max-height: 180px;
  overflow: auto;
}
.editor-score .mala {
  padding: 0;
}
.editor-score .mala p {
  font-size: 22px;
}
.editor-listen {
  flex: 1 0 100%; /* own row under the thumbnail and the notes */
}
.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

import { shallowRef, computed, watch, type Ref } from 'vue'
import { pieces, type Piece } from '../lib/melodies.ts'
import { bellCount } from '../lib/notation.ts'

export const TEMPOS = [165, 180, 210, 230] // udarcev na minuto, drsnik preklaplja med temi vrednostmi
export type View = 'drum' | 'mala' | 'staff' | 'simple'
export const VIEW_OPTIONS: { label: string; value: View }[] = [
  { label: 'Bobnarske note', value: 'drum' },
  { label: 'Po Malavašiču', value: 'mala' },
  { label: 'Notni in številčni zapis', value: 'staff' },
  { label: 'Poenostavljen notni zapis', value: 'simple' },
]
// visual metronome while playing: a row of dots, an amber glow around the score, both or none
export type BeatView = 'off' | 'dots' | 'glow' | 'both'
export const BEAT_VIEW_OPTIONS: { label: string; value: BeatView }[] = [
  { label: 'Brez', value: 'off' },
  { label: 'Pike', value: 'dots' },
  { label: 'Blisk', value: 'glow' },
  { label: 'Oboje', value: 'both' },
]
// -1 = all bells play, 0–3 = the bell the player rings themselves
export const BELL_OPTIONS = [-1, 0, 1, 2, 3].map((b) => ({
  label: b < 0 ? 'Vsi' : String(b + 1),
  value: b,
}))

// how long a play-along lasts: 0 = until stopped, else about this many minutes (read after the "Igraj"
// label); ~ because the melody always plays to the end of its pass
const minutesLabel = (m: number) =>
  m === 1 ? 'minuto' : m === 2 ? 'minuti' : m <= 4 ? 'minute' : 'minut'
export const DURATION_OPTIONS = [
  { label: 'neskončno', value: 0 },
  ...Array.from({ length: 10 }, (_, k) => ({
    label: `~${k + 1} ${minutesLabel(k + 1)}`,
    value: k + 1,
  })),
]

const KEY = 'zvonko-settings'

// The player's choices, saved across reloads. Each saved value is checked before use, so an old or broken
// entry (e.g. a piece that was since renamed) just keeps that setting's default. The piece is kept by name,
// looked up in `all` (built-in and user melodies): a user melody loading after the start is still found.
export function useSettings(all: Ref<Piece[]> = shallowRef(pieces)) {
  const pieceName = shallowRef(pieces[0]!.name)
  const view = shallowRef<View>('mala') // score style
  const practice = shallowRef(-1) // muted bell the player rings, -1 = none
  const tempoIdx = shallowRef(TEMPOS.indexOf(180))
  const hostVolume = shallowRef(55) // % volume of the x strikes, 0 = only the lead melody plays
  const waitForMe = shallowRef(false) // pause before each practice-bell note until the player rings it
  const metronome = shallowRef(false) // tick on every melody note, accented on the first beat of the bar
  const beatView = shallowRef<BeatView>('both') // how the beat is shown while playing
  const minutes = shallowRef(0) // play for this many minutes, then stop; 0 = until stopped
  const favorites = shallowRef<string[]>([]) // starred pieces, by name; shown first in the melody picker

  // each saved setting with the check its stored value must pass
  const saved: Record<string, [Ref<unknown>, (v: unknown) => boolean]> = {
    view: [view, (v) => VIEW_OPTIONS.some((o) => o.value === v)],
    practice: [practice, (v) => BELL_OPTIONS.some((o) => o.value === v)],
    tempoIdx: [
      tempoIdx,
      (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < TEMPOS.length,
    ],
    hostVolume: [
      hostVolume,
      (v) => Number.isFinite(v) && (v as number) >= 0 && (v as number) <= 100,
    ],
    waitForMe: [waitForMe, (v) => typeof v === 'boolean'],
    metronome: [metronome, (v) => typeof v === 'boolean'],
    beatView: [beatView, (v) => BEAT_VIEW_OPTIONS.some((o) => o.value === v)],
    minutes: [minutes, (v) => DURATION_OPTIONS.some((o) => o.value === v)],
    favorites: [favorites, (v) => Array.isArray(v) && v.every((n) => typeof n === 'string')],
  }
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}
    for (const [k, [r, ok]] of Object.entries(saved)) if (ok(stored[k])) r.value = stored[k]
    if (typeof stored.piece === 'string') pieceName.value = stored.piece
  } catch { } // storage blocked (private mode) or unreadable: start with defaults

  // a piece with fewer bells (Renška): the chosen bell may not exist in it, then all bells play
  // an unknown name (renamed or deleted piece, or a user melody not loaded yet) plays the first piece
  const piece = computed(() => all.value.find((p) => p.name === pieceName.value) ?? all.value[0]!)
  watch(
    piece,
    (p) => {
      if (practice.value >= bellCount(p.strikes)) practice.value = -1
    },
    { immediate: true },
  )

  watch([pieceName, ...Object.values(saved).map(([r]) => r)], () => {
    const out = Object.fromEntries(Object.entries(saved).map(([k, [r]]) => [k, r.value]))
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...out, piece: pieceName.value }))
    } catch { }
  })

  return {
    pieceName,
    view,
    practice,
    tempoIdx,
    hostVolume,
    waitForMe,
    metronome,
    beatView,
    minutes,
    favorites,
    piece,
    rpm: computed(() => TEMPOS[tempoIdx.value]!),
  }
}

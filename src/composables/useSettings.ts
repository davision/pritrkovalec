import { shallowRef, computed, watch, type Ref } from 'vue'
import { pieces } from '../lib/melodies.ts'

export const TEMPOS = [150, 180, 210, 230] // udarcev na minuto, drsnik preklaplja med temi vrednostmi
export const PIECE_OPTIONS = pieces.map((p, i) => ({ label: p.name, value: i }))
export type View = 'drum' | 'mala' | 'staff' | 'simple'
export const VIEW_OPTIONS: { label: string; value: View }[] = [
  { label: 'Bobnarske note', value: 'drum' },
  { label: 'Po Malavašiču', value: 'mala' },
  { label: 'Notni in številčni zapis', value: 'staff' },
  { label: 'Poenostavljen notni zapis', value: 'simple' },
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

const KEY = 'pritrkovalec-settings'

// The player's choices, saved across reloads. Each saved value is checked before use, so an old or broken
// entry (e.g. a piece that was since renamed) just keeps that setting's default. The piece is kept by name, not index.
export function useSettings() {
  const pieceIdx = shallowRef(0)
  const view = shallowRef<View>('mala') // score style
  const practice = shallowRef(-1) // muted bell the player rings, -1 = none
  const tempoIdx = shallowRef(TEMPOS.indexOf(180))
  const hostVolume = shallowRef(55) // % volume of the x strikes, 0 = only the lead melody plays
  const waitForMe = shallowRef(false) // pause before each practice-bell note until the player rings it
  const minutes = shallowRef(0) // play for this many minutes, then stop; 0 = until stopped

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
    minutes: [minutes, (v) => DURATION_OPTIONS.some((o) => o.value === v)],
  }
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}
    for (const [k, [r, ok]] of Object.entries(saved)) if (ok(stored[k])) r.value = stored[k]
    const i = pieces.findIndex((p) => p.name === stored.piece)
    if (i >= 0) pieceIdx.value = i
  } catch {} // storage blocked (private mode) or unreadable: start with defaults

  watch([pieceIdx, ...Object.values(saved).map(([r]) => r)], () => {
    const out = Object.fromEntries(Object.entries(saved).map(([k, [r]]) => [k, r.value]))
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...out, piece: pieces[pieceIdx.value]!.name }))
    } catch {}
  })

  return {
    pieceIdx,
    view,
    practice,
    tempoIdx,
    hostVolume,
    waitForMe,
    minutes,
    piece: computed(() => pieces[pieceIdx.value]!),
    rpm: computed(() => TEMPOS[tempoIdx.value]!),
  }
}

import { shallowRef, watch, type Ref } from 'vue'
import type { Piece } from '../lib/melodies.ts'

// The visual metronome's beat, taken from the strike shown as sounding (so it follows the audio clock,
// like the score highlight). A beat is a melody note; the hosting x strikes between them don't count.
//   beat:  0-based place of the last melody note in its bar, -1 = not playing
//   pulse: counts up on every melody note, to restart a flash animation (used as a :key)
export function useBeat(
  piece: Ref<Piece>,
  current: Readonly<Ref<number>>,
  playing: Readonly<Ref<boolean>>,
) {
  const beat = shallowRef(-1)
  const pulse = shallowRef(0)

  watch(current, (i) => {
    const s = piece.value.strikes[i]
    if (!playing.value || !s || s.label === 'x') return
    beat.value = +s.label - 1
    pulse.value++
  })
  watch(playing, (p) => !p && (beat.value = -1))

  return { beat, pulse }
}

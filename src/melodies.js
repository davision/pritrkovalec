// Bells are 0-based internally (0 = bell 1, the smallest). Strikes per score row, as in the PDF.
export const ROW = 48

// One full turn ("naokoli"): in phase k the melody starts on bell k and bell k+3 "hosts"
// with an x between every melody note. melody = bell offsets from k, played `reps` times per phase.
function turn(melody, { reps = 2, accent = false } = {}) {
  const strikes = []
  for (let k = 0; k < 4; k++) {
    const host = (k + 3) % 4
    for (let r = 0; r < reps; r++)
      melody.forEach((off, i) => {
        strikes.push({ bell: (k + off) % 4, label: String(i + 1), accent: accent && r === 0 && i === 0 })
        strikes.push({ bell: host, label: 'x', accent: false })
      })
  }
  return strikes
}

const MERCINOVA = [0, 1, 2]
const STIRKA = [0, 2, 1, 2]

export const pieces = [
  { name: 'Mercinova naokoli', strikes: turn(MERCINOVA) },
  { name: 'Štirka naokoli', strikes: [...turn(STIRKA), ...turn(STIRKA), ...turn(STIRKA)] },
  {
    name: 'Mercinova naokoli; s poudarki (variacija)',
    strikes: [...turn(MERCINOVA), ...turn(MERCINOVA, { accent: true })],
  },
]

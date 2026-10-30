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

// A fixed sequence that doesn't rotate: melody bells in order (0 = bell 1), each followed by an x of
// its hosting bell (hosts[i]); notes numbered 1..perBar within each bar.
function hosted(bells, hosts, perBar = 4) {
  return bells.flatMap((bell, i) => [
    { bell, label: String((i % perBar) + 1), accent: false },
    { bell: hosts[i], label: 'x', accent: false },
  ])
}

const mirror = (bell) => 3 - bell // bell b ↔ 5 - b (1↔4, 2↔3)

const MERCINOVA = [0, 1, 2]
const STIRKA = [0, 2, 1, 2]
// prettier-ignore
const PO_PET_NAVADNA = [0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2, 1, 3, 1, 3, 1, 3, 3, 3, 1, 3, 1, 3, 1, 3, 3, 3]
const PO_PET = [0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2]
// 4 bars hosted by bell 4, 4 bars by bell 3; then the whole figure mirrored so bell 1 hosts first (4 2 2 2 …)
const PO_PET_HOSTS = PO_PET_NAVADNA.map((_, i) => (i < 16 ? 3 : 2))
const TRI_DVA_ENA = [ 0, 0, 0, 2, 0, 0, 2, 0, 2 ]


export const pieces = [
  { name: 'Mercinova naokoli', strikes: turn(MERCINOVA) },
  { name: 'Štirka naokoli', strikes: turn(STIRKA) },
  {
    name: 'Mercinova naokoli; s poudarki (variacija)',
    strikes: turn(MERCINOVA, { accent: true }),
  },
  {
    name: 'Po pet (navadna)',
    strikes: [...hosted(PO_PET_NAVADNA, PO_PET_HOSTS)],
  },
  {
    name: 'Po pet naokoli',
    strikes: turn(PO_PET, { reps: 1})
  },
    {
    name: 'Tri dva ena',
    strikes: turn(TRI_DVA_ENA, { reps: 1})
  }
]

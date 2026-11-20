// Bells are 0-based internally (0 = bell 1, the smallest). Strikes per score row, as in the PDF.
export const ROW = 48

// One strike of a bell: label is the melody note's number within its bar ('1', '2', …) or 'x' for a hosting strike.
export interface Strike {
  bell: number
  label: string
  accent: boolean
}
export interface Piece {
  name: string
  strikes: Strike[]
  group?: number // Po Malavašiču wraps after this many notes instead of after a bar
  custom?: { id: string; mine: boolean } // made by a user (stored on the server); mine = on this device
}

// One full turn ("naokoli") over `bells` bells: in phase k the melody starts on bell k and bell k + host
// "hosts" with an x between every melody note (default -1: the bell before k). Bells the melody and host
// don't reach wait (Tri dva ena na štiri: bell k + 3). melody = bell offsets from k, played `reps`
// times per phase. Notes are numbered 1..perBar within each bar (default: the melody is one bar).
export function turn(
  melody: number[],
  { reps = 2, accent = false, bells = 4, perBar = melody.length, host = -1 } = {},
): Strike[] {
  const strikes: Strike[] = []
  for (let k = 0; k < bells; k++) {
    const hostBell = (k + host + bells) % bells
    for (let r = 0; r < reps; r++)
      melody.forEach((off, i) => {
        strikes.push({
          bell: (k + off) % bells,
          label: String((i % perBar) + 1),
          accent: accent && r === 0 && i === 0,
        })
        strikes.push({ bell: hostBell, label: 'x', accent: false })
      })
  }
  return strikes
}

// A fixed sequence that doesn't rotate: melody bells in order (0 = bell 1), each followed by an x of
// its hosting bell (hosts[i]); notes numbered 1..perBar within each bar.
function hosted(bells: number[], hosts: number[], perBar = 4): Strike[] {
  return bells.flatMap((bell, i) => [
    { bell, label: String((i % perBar) + 1), accent: false },
    { bell: hosts[i]!, label: 'x', accent: false },
  ])
}

export const mirror = (bell: number) => 3 - bell // bell b ↔ 5 - b (1↔4, 2↔3)

const MERCINOVA = [0, 1, 2]
const STIRKA = [0, 2, 1, 2]
// prettier-ignore
const PO_PET_NAVADNA = [0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2, 1, 3, 3, 3, 1, 3, 3, 3, 1, 3, 1, 3, 1, 3, 3, 3]
const PO_PET = [0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2]
// 4 bars hosted by bell 4, 4 bars by bell 3; then the whole figure mirrored so bell 1 hosts first (4 2 2 2| …)
const PO_PET_HOSTS = PO_PET_NAVADNA.map((_, i) => (i < 16 ? 3 : 2))
const TRI_DVA_ENA = [0, 0, 0, 1, 0, 0, 1, 0, 1] // 1 1 1 2 1 1 2 1 2, bell 3 hosting
const ENKT_DVAKT = [0, 0, 1, 1] // 1 1 2 2, bell 3 hosting
const RENSKA = [0, 1, 0, 1, 0, 0, 0, 1] // 1 2 1 2 1 1 1 2, bell 3 hosting

export const pieces: Piece[] = [
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
    strikes: turn(PO_PET, { reps: 1 }),
    group: 4, // Po Malavašiču wraps after every 4 notes (0 2 2 2 | …)
  },
  {
    name: 'Tri dva ena na štiri',
    strikes: turn(TRI_DVA_ENA, { reps: 1, host: 2 }), // bell 4 waits, then the next bell
    group: 3, // 3 + 3 + 3
  },
  {
    name: 'Renška',
    strikes: turn(RENSKA, { bells: 3, perBar: 4 }), // two 4/4 bars per line
  },
  {
    name: 'Tri dva ena',
    strikes: turn(TRI_DVA_ENA, { reps: 1, bells: 3 }),
    group: 3, // 3 + 3 + 3
  },
  {
    name: 'Enkt dvakt',
    strikes: turn(ENKT_DVAKT, { bells: 3 }),
  },
]

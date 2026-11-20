import { shallowRef, computed } from 'vue'

const KEY = 'zvonko-plays'
const MAX = 500 // capped so storage can't fill up
const CLIENT_KEY = 'zvonko-client'

export interface Play {
  piece: string // song name
  score: number
  bell: number // 1–4
  tempo: number // strikes per minute
  at: number // Date.now() when played
}
export interface SongStats {
  name: string
  best: number
  list: Play[] // newest first
}

// Anonymous random id of this device, so the server can count players without accounts.
function clientId() {
  try {
    let id = localStorage.getItem(CLIENT_KEY)
    if (!id) localStorage.setItem(CLIENT_KEY, (id = crypto.randomUUID()))
    return id
  } catch {
    return crypto.randomUUID() // storage blocked: a fresh id per play
  }
}

// Sends a play to the server for the popularity counts. Fire and forget: offline, on a static host
// without /api, or with the server down, the play is still kept locally.
function report(entry: Omit<Play, 'at'>) {
  fetch('api/plays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client: clientId(), ...entry }),
    keepalive: true,
  }).catch(() => {})
}

// Plays of each piece by everyone (server, all time), by name; null without the API (offline, static host).
// Each start here adds one at once, so the count moves without waiting for the server.
function useCounts() {
  const counts = shallowRef<Record<string, number> | null>(null)
  fetch('api/popular')
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rows: { piece: string; plays: number }[]) => {
      counts.value = Object.fromEntries(rows.map((r) => [r.piece, r.plays]))
    })
    .catch(() => {})

  function started(piece: string) {
    if (counts.value) counts.value = { ...counts.value, [piece]: (counts.value[piece] ?? 0) + 1 }
    fetch('api/starts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: clientId(), piece }),
      keepalive: true,
    }).catch(() => {})
  }
  return { counts, started }
}

// Scored play-alongs, newest first, kept in localStorage. A broken saved entry is dropped on load
// instead of breaking the list.
export function usePlayHistory() {
  const plays = shallowRef<Play[]>([])
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (Array.isArray(saved))
      plays.value = saved.filter(
        (p) => typeof p?.piece === 'string' && Number.isFinite(p.score) && Number.isFinite(p.at),
      )
  } catch {}

  function add(entry: Omit<Play, 'at'>) {
    plays.value = [{ ...entry, at: Date.now() }, ...plays.value].slice(0, MAX)
    try {
      localStorage.setItem(KEY, JSON.stringify(plays.value))
    } catch {}
    report(entry)
  }

  // one entry per song, most recently played first (Map keeps the order songs are first seen in)
  const stats = computed<SongStats[]>(() => {
    const by = new Map<string, Play[]>()
    for (const p of plays.value) {
      const list = by.get(p.piece)
      if (list) list.push(p)
      else by.set(p.piece, [p])
    }
    return [...by].map(([name, list]) => ({
      name,
      list,
      best: Math.max(...list.map((p) => p.score)),
    }))
  })

  return { stats, add, ...useCounts() }
}

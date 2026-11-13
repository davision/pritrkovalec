import { shallowRef, computed } from 'vue'

const KEY = 'pritrkovalec-plays'
const MAX = 500 // capped so storage can't fill up

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

  return { stats, add }
}

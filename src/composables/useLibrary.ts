import { shallowRef, computed } from 'vue'
import { pieces, type Piece } from '../lib/melodies.ts'
import { build, type MelodyDef } from '../lib/custom.ts'
import { clientId } from './usePlayHistory.ts'

interface Stored extends MelodyDef {
  id: string
  mine: boolean
}
// what saving a melody or a name can end in: ok, the name is already used, or no connection to the server
export type SaveResult = 'ok' | 'taken' | 'error'

const headers = () => ({ 'Content-Type': 'application/json', 'X-Client': clientId() })

// All pieces: the built-in ones, then melodies users made (beta, from the server), and the other names
// ringers use for them. Without the server (offline, static host) just the built-in pieces, nothing to add.
export function useLibrary() {
  const stored = shallowRef<Stored[]>([])
  const aliasList = shallowRef<{ piece: string; alias: string }[]>([])
  const online = shallowRef(false)

  async function load() {
    try {
      const r = await fetch('api/library', { headers: headers() })
      if (!r.ok) return
      const data = await r.json()
      stored.value = data.melodies
      aliasList.value = data.aliases
      online.value = true
    } catch {}
  }
  load()

  const all = computed<Piece[]>(() => [
    ...pieces,
    ...stored.value.map((m) => ({
      name: m.name,
      strikes: build(m),
      custom: { id: m.id, mine: m.mine },
    })),
  ])
  // other names of each piece, by its name
  const aliases = computed(() => {
    const by: Record<string, string[]> = {}
    for (const { piece, alias } of aliasList.value) (by[piece] ??= []).push(alias)
    return by
  })

  async function send(url: string, body: object): Promise<SaveResult> {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ client: clientId(), ...body }),
      })
      if (r.status === 409) return 'taken'
      if (!r.ok) return 'error'
      await load()
      return 'ok'
    } catch {
      return 'error'
    }
  }
  const create = (def: MelodyDef) => send('api/melodies', def)
  const addAlias = (piece: string, alias: string) => send('api/aliases', { piece, alias })

  async function remove(id: string) {
    try {
      const r = await fetch(`api/melodies/${id}`, { method: 'DELETE', headers: headers() })
      if (r.ok) await load()
      return r.ok
    } catch {
      return false
    }
  }

  return { all, aliases, online, create, addAlias, remove }
}

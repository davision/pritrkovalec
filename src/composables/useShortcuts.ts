import { onMounted, onBeforeUnmount } from 'vue'

export interface ShortcutActions {
  escape(): void
  bell(b: number): void // -1 = all bells, 0–3
  toggleWait(): void
  togglePlay(): void
  step(d: number): void
  tap(): void
}

// Keyboard shortcuts while the app is open.
export function useShortcuts(actions: ShortcutActions) {
  const plain = (e: KeyboardEvent) => e.type === 'keydown' && !e.metaKey && !e.ctrlKey

  function onKey(e: KeyboardEvent) {
    if (e.code === 'Escape' && e.type === 'keydown') return actions.escape()
    // 1–4 picks the bell to play along, 0 = all bells play
    if (/^Digit[0-4]$/.test(e.code) && plain(e)) {
      e.preventDefault()
      return actions.bell(+e.code.slice(-1) - 1)
    }
    // metronome (M) disabled for now
    if (e.code === 'KeyP' && plain(e) && !e.repeat) {
      e.preventDefault()
      return actions.toggleWait()
    }
    if (e.code === 'KeyS' && plain(e) && !e.repeat) {
      e.preventDefault() // don't jump to an option in a focused dropdown
      return actions.togglePlay()
    }
    if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && plain(e)) {
      e.preventDefault() // don't move a focused slider
      return actions.step(e.code === 'ArrowLeft' ? -1 : 1)
    }
    if (e.code !== 'Space') return
    e.preventDefault() // keep space from scrolling / activating focused controls (on keyup too)
    if (e.type === 'keydown' && !e.repeat) actions.tap()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKey)
  })
}

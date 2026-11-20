import { watch, onScopeDispose, type Ref } from 'vue'

// Keeps the screen on while `active` (the melody playing), with the Screen Wake Lock API.
// The browser drops the lock when the page is hidden, so it is taken again on return.
// Unsupported or refused (low battery, older browsers): the screen just turns off as usual.
export function useWakeLock(active: Ref<boolean>) {
  let lock: WakeLockSentinel | null = null

  async function sync() {
    const want = active.value && document.visibilityState === 'visible'
    if (want && !lock && 'wakeLock' in navigator) {
      try {
        lock = await navigator.wakeLock.request('screen')
        lock.addEventListener('release', () => (lock = null))
        if (!active.value) sync() // stopped while the request was pending
      } catch {}
    } else if (!want && lock) {
      lock.release().catch(() => {})
      lock = null
    }
  }

  watch(active, sync)
  document.addEventListener('visibilitychange', sync)
  onScopeDispose(() => {
    document.removeEventListener('visibilitychange', sync)
    lock?.release().catch(() => {})
  })
}

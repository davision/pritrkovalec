import { shallowRef, computed, onScopeDispose } from 'vue'
import { useMediaQuery } from './useMediaQuery.ts'

// Chromium's install prompt event; not in TypeScript's DOM types
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// "Add to home screen" (PWA install). Chrome, Edge and Android offer a real install prompt; Safari on
// iPhone/iPad has no API, so there the player is told how to do it by hand.
export function useInstallApp() {
  const standalone = useMediaQuery('(display-mode: standalone)')
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  const prompt = shallowRef<BeforeInstallPromptEvent | null>(null)
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS reports itself as a Mac

  const onPrompt = (e: Event) => {
    e.preventDefault() // keep the browser's own mini-bar away; our button shows the prompt
    prompt.value = e as BeforeInstallPromptEvent
  }
  const onInstalled = () => (prompt.value = null)
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)
  onScopeDispose(() => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  })

  const installed = computed(() => standalone.value || iosStandalone)
  // 'prompt': the browser can install it; 'ios': show the Share → Add to Home Screen steps; null: nothing to offer
  const mode = computed(() =>
    installed.value ? null : prompt.value ? 'prompt' : ios ? 'ios' : null,
  )

  async function install() {
    const e = prompt.value
    if (!e) return
    await e.prompt()
    await e.userChoice
    prompt.value = null // the event can be used only once
  }

  return { mode, install }
}

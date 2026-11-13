import { shallowRef, readonly, onScopeDispose } from 'vue'

// Whether a CSS media query matches, kept up to date as the window resizes or rotates.
export function useMediaQuery(query: string) {
  const mql = window.matchMedia(query)
  const matches = shallowRef(mql.matches)
  const update = (e: MediaQueryListEvent) => (matches.value = e.matches)
  mql.addEventListener('change', update)
  onScopeDispose(() => mql.removeEventListener('change', update))
  return readonly(matches)
}

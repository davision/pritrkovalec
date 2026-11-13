import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import 'primeicons/primeicons.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './styles/base.css'
import App from './App.vue'

// Amber accent (bell bronze) instead of Aura's emerald; Aura's dark surfaces are already zinc.
const Pritrkovalec = definePreset(Aura, {
  semantic: {
    primary: Object.fromEntries(
      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, `{amber.${n}}`]),
    ),
  },
})

// PrimeVue's dark tokens apply under class "dark", which index.html puts on <html>: the whole app is dark,
// except the score column, which switches back to light (see styles/base.css).
createApp(App)
  .use(PrimeVue, { theme: { preset: Pritrkovalec, options: { darkModeSelector: '.dark' } } })
  .mount('#app')

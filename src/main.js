import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'

// light-only for now: the score is drawn on a paper background
createApp(App)
  .use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } })
  .mount('#app')

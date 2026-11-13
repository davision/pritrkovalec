import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import App from './App.vue'

// light-only for now: the score is drawn on a paper background
createApp(App)
  .use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } })
  .mount('#app')

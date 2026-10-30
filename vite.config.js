import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// relative base so the build works on any static host / subpath (GitHub Pages, Netlify…)
export default defineConfig({ plugins: [vue()], base: './' })

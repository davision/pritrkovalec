import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'

// version = 1.<number of commits>, so every commit bumps it; '?' when built outside a git checkout
let commits = '?'
try {
  commits = execSync('git rev-list --count HEAD').toString().trim()
} catch {}

// relative base so the build works on any static host / subpath (GitHub Pages, Netlify…)
export default defineConfig({ plugins: [vue()], base: './', define: { __VERSION__: JSON.stringify(`1.${commits}`) } })

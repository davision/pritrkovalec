import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'

// version = MAJOR.<commits since the major started>, so every commit bumps the minor.
// For a new major: raise MAJOR and set SINCE to the commit count of the commit that starts it.
const MAJOR = 2
const SINCE = 16 // v2.0 = the 16th commit (the redesign with side panels)
let minor = '?' // built outside a git checkout
try {
  minor = Math.max(0, +execSync('git rev-list --count HEAD').toString().trim() - SINCE)
} catch {}

// relative base so the build works on any static host / subpath (GitHub Pages, Netlify…)
export default defineConfig({ plugins: [vue()], base: './', define: { __VERSION__: JSON.stringify(`${MAJOR}.${minor}`) } })

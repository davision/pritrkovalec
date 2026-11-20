import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync, spawn } from 'node:child_process'

// version = MAJOR.<commits since the major started>, so every commit bumps the minor.
// For a new major: raise MAJOR and set SINCE to the commit count of the commit that starts it.
const MAJOR = 2
const SINCE = 16 // v2.0 = the 16th commit (the redesign with side panels)
let minor: number | string = '?' // built outside a git checkout
try {
  minor = Math.max(0, +execSync('git rev-list --count HEAD').toString().trim() - SINCE)
} catch {}

// dev only: `npm run dev` also starts the API (server.cjs, MONGODB_URI from atlas-credentials.env) on :3000,
// restarted by node --watch when server.cjs changes. One process for the whole dev session: Vite reloads this
// config (and the plugin) on config changes, so the child is kept on globalThis and stopped only when Vite exits.
// Already running separately (npm run server)? Then that one is used.
const g = globalThis as { zvonkoApi?: ReturnType<typeof spawn> }
function apiServer(): Plugin {
  return {
    name: 'zvonko-api',
    apply: 'serve',
    async configureServer() {
      if (g.zvonkoApi) return
      const up = await fetch('http://localhost:3000/api/health').then(
        (r) => r.ok,
        () => false,
      )
      if (up) return
      const api = (g.zvonkoApi = spawn(
        process.execPath,
        ['--env-file-if-exists=atlas-credentials.env', '--watch', 'server.cjs'],
        { stdio: 'inherit' },
      ))
      const stop = () => api.kill()
      process.on('exit', stop)
      // stopped by a signal: stop the API too, then let the signal end Vite as it would have
      for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const)
        process.once(sig, () => {
          stop()
          process.kill(process.pid, sig)
        })
    },
  }
}

// relative base so the build works on any static host / subpath (GitHub Pages, Netlify…)
// dev: /api goes to the Express server on :3000 (started by apiServer)
export default defineConfig({
  plugins: [vue(), apiServer()],
  base: './',
  define: { __VERSION__: JSON.stringify(`${MAJOR}.${minor}`) },
  server: { proxy: { '/api': 'http://localhost:3000' } },
})

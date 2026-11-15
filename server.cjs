// Production server for Zvonko: the backend API (+ serves dist/ when run locally).
// On the hosting (CloudLinux Node.js selector / Passenger) this is the "Application startup file";
// Passenger supplies PORT. CommonJS (.cjs) because Passenger loads the startup file with require().
const fs = require('node:fs')
const path = require('node:path')
const express = require('express')

const app = express()
const dist = path.join(__dirname, 'dist')

app.disable('x-powered-by')
app.use(express.json())

// --- API (backend functionality goes here) ---
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

// --- static frontend (local `node server.cjs` only) ---
// In production dist/ lives in public_html and LiteSpeed serves it directly (much faster than
// going through Node); this server then only sees requests for paths that aren't real files.
if (fs.existsSync(dist)) {
  // hashed build assets never change → cache for a year; everything else revalidates
  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(dist, { maxAge: 0 }))
  // SPA fallback: unknown non-file paths get index.html
  app.get(/^\/(?!.*\.\w+$).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Zvonko listening on ${port}`))

// Production server for Zvonko: the backend API (+ serves dist/ when run locally).
// On the hosting (CloudLinux Node.js selector / Passenger) this is the "Application startup file";
// Passenger supplies PORT. CommonJS (.cjs) because Passenger loads the startup file with require().
// MONGODB_URI comes from the environment: DirectAdmin's Node.js app settings in production,
// atlas-credentials.env locally (npm run server). Without it the API answers 503 and the app still works.
const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const { MongoClient } = require('mongodb')

const app = express()
const dist = path.join(__dirname, 'dist')

app.disable('x-powered-by')
app.set('trust proxy', 'loopback') // LiteSpeed/Passenger forward from localhost: req.ip = the real client
app.use(express.json({ limit: '2kb' }))

// --- database ---
let db // resolves to the zvonko database, or null without MONGODB_URI
function getDb() {
  if (!db) {
    if (!process.env.MONGODB_URI) return Promise.resolve(null)
    db = new MongoClient(process.env.MONGODB_URI)
      .connect()
      .then(async (client) => {
        const d = client.db('zvonko')
        await d.collection('plays').createIndex({ at: -1 })
        await d.collection('starts').createIndex({ piece: 1, at: -1 })
        return d
      })
      .catch((err) => {
        db = undefined // retry on the next request
        throw err
      })
  }
  return db
}

// shortcut: per-IP limit kept in memory, per process; move to the DB if the app ever runs on several processes
const hits = new Map()
function rateLimit(req, res, next) {
  const now = Date.now()
  const h = hits.get(req.ip)
  if (!h || now - h.start > 60_000) hits.set(req.ip, { start: now, n: 1 })
  else if (++h.n > 30) return res.status(429).json({ error: 'Too many requests' })
  if (hits.size > 10_000) hits.clear()
  next()
}

const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
// what the app sends; anything else is refused (trust boundary)
const validStart = (b) =>
  b &&
  typeof b.client === 'string' &&
  /^[0-9a-f-]{36}$/.test(b.client) &&
  typeof b.piece === 'string' &&
  b.piece.length > 0 &&
  b.piece.length <= 100
function validPlay(b) {
  return validStart(b) && isInt(b.score, 0, 100) && isInt(b.bell, 0, 4) && isInt(b.tempo, 30, 600)
}

const api = express.Router()
api.get('/health', (_req, res) => res.json({ ok: true }))

// one scored play: { client (random id kept on the device), piece, score, bell (0 = all, 1–4), tempo }
api.post('/plays', rateLimit, async (req, res, next) => {
  try {
    if (!validPlay(req.body)) return res.status(400).json({ error: 'Invalid play' })
    const d = await getDb()
    if (!d) return res.status(503).json({ error: 'No database' })
    const { client, piece, score, bell, tempo } = req.body
    await d.collection('plays').insertOne({ client, piece, score, bell, tempo, at: new Date() })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// a piece started from the beginning (listening or playing along): what the play counts count
api.post('/starts', rateLimit, async (req, res, next) => {
  try {
    if (!validStart(req.body)) return res.status(400).json({ error: 'Invalid start' })
    const d = await getDb()
    if (!d) return res.status(503).json({ error: 'No database' })
    const { client, piece } = req.body
    await d.collection('starts').insertOne({ client, piece, at: new Date() })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// most played pieces, all time or in the last `days` days: [{ piece, plays, players }]
api.get('/popular', async (req, res, next) => {
  try {
    const days = isInt(+req.query.days, 1, 365) ? +req.query.days : 0
    const d = await getDb()
    if (!d) return res.status(503).json({ error: 'No database' })
    const rows = await d
      .collection('starts')
      .aggregate([
        ...(days ? [{ $match: { at: { $gte: new Date(Date.now() - days * 86_400_000) } } }] : []),
        { $group: { _id: '$piece', plays: { $sum: 1 }, players: { $addToSet: '$client' } } },
        { $project: { _id: 0, piece: '$_id', plays: 1, players: { $size: '$players' } } },
        { $sort: { plays: -1 } },
      ])
      .toArray()
    res.set('Cache-Control', 'public, max-age=60').json(rows)
  } catch (err) {
    next(err)
  }
})

api.use((_req, res) => res.status(404).json({ error: 'Not found' }))
// eslint-disable-next-line no-unused-vars -- express needs all four arguments to treat this as the error handler
api.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})
app.use('/api', api)

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

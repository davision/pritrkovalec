# CLAUDE.md

**Zvonko** (repo dir `pritrkovanje`): a Vue 3 + TypeScript + Vite web app (installable PWA) for practising
*pritrkavanje*, Slovenian rhythmic chiming on four church bells. A melody plays as a sequence of bell strikes;
the player mutes one bell and rings it with the space bar, and gets an accuracy score.

UI text, piece names and the README are in **Slovenian**; code comments are mostly English. Keep that split.

## Commands

```sh
npm run dev         # Vite dev server
npm test            # plain node assert scripts: src/lib/{melodies,score,notation}.test.ts (Node runs .ts natively)
npm run type-check  # vue-tsc --build
npm run lint        # oxlint (correctness = error)
npm run format      # prettier on src/ (no semicolons, single quotes, width 100)
npm run build       # type-check + vite build → dist/
npm run deploy      # build + rsync/SSH deploy to zvonko.si (scripts/deploy.sh)
npm run server      # Express API on :3000 with MONGODB_URI from atlas-credentials.env (gitignored);
                    # run next to `npm run dev`, Vite proxies /api to it. After a build it also serves dist/.
```

No test framework: tests are `node:assert` scripts run directly by Node (needs Node ≥ 22.18 for type stripping;
CI uses 24). Test files are excluded from `tsconfig.app.json`. Import paths use explicit `.ts` extensions.

## Layout

- `src/lib/` — pure logic, no Vue:
  - `melodies.ts` — pieces. `Strike = { bell 0–3, label '1'..'n' | 'x', accent }`. Built by rules, not transcribed:
    `turn(offsets, {reps, accent})` rotates the melody start bell through all four bells, the previous bell
    "hosts" with an `x` after every note; `hosted(bells, hosts, perBar)` for non-rotating pieces; `mirror` swaps
    1↔4, 2↔3. `ROW = 48` strikes per score row. Optional `Piece.group` = notes per line in the Malavašič view.
  - `bell.ts` — `tunings` (semitones from a1 + 1/16-semitone deviations, bell 1 first) and `Bells`, a Web Audio
    additive-synth bell (partials, compressor, plays an octave up).
  - `score.ts` — timing windows (`WINDOWS`, `MISS_MS`), `hit`/`score`, and `createJudge()` used during play.
  - `notation.ts` — helpers for the score views (bars, beats per bar, pair lines, count-in).
  - `confetti.ts` — shown on a 100 score.
- `src/composables/`:
  - `usePlayer.ts` — the core: Web Audio **lookahead scheduler** (audio timed by `AudioContext`, display follows
    via rAF), count-in, wait-for-me mode, metronome, time limit, tapping + judging. Settings come in as refs.
  - `useSettings.ts` — all user choices + option lists (`TEMPOS`, `VIEW_OPTIONS`, …), persisted to `localStorage`
    (piece stored by name). `usePlayHistory.ts` — scored plays in `localStorage`, bad entries dropped on load.
  - `useShortcuts.ts` (Space tap, S play/pause, ←→ step, Esc stop+score, 0–4 bell, P wait, M metronome),
    `useBeat.ts` (visual beat), `useMediaQuery.ts`, `useInstallApp.ts` (PWA install prompt).
- `src/App.vue` — wires everything: settings/stats side panels, piece picker, score view, `PlayerBar`, result dialog.
- `src/components/score/` — four notation views (`View = 'drum' | 'mala' | 'staff' | 'simple'`):
  `GridScore` (drum-style numbered squares; `TrackScore` is its moving-track form below 1200px),
  `MalaScore` (Malavašič numbers), `StaffScore` (staff notation, Bravura font), plus `BellButtons`, `grid.css`.
- UI: PrimeVue 4 with an Aura preset recoloured to amber (`main.ts`). App is dark (`class="dark"` on `<html>`),
  the score column switches back to light (`styles/base.css`). 1200px is the desktop breakpoint.

## Adding a piece

Write the melody as bell offsets from the starting bell, add it to `pieces` in `melodies.ts` using `turn`/`hosted`,
add first-strike checks to `melodies.test.ts`, run `npm test`. README has the full explanation (in Slovenian).

## Versioning & deploy

- Version `__VERSION__` = `MAJOR.<commit count − SINCE>` from `vite.config.ts`; every commit bumps the minor.
  New major: raise `MAJOR`, set `SINCE` to that commit's count. CI needs `fetch-depth: 0` for this.
- `base: './'` so the build works from any subpath.
- Two targets: GitHub Pages via `.github/workflows/deploy.yml` on every push to `main` (lint → test → build), and
  **zvonko.si** via `npm run deploy` (manual). On zvonko.si LiteSpeed serves `dist/` from `public_html`; `server.cjs`
  (Express, CommonJS because Passenger `require()`s it) runs under DirectAdmin/Passenger and only handles non-file
  paths, i.e. `/api/*`: `/api/health`, `POST /api/plays` (validated, rate-limited per IP), `GET /api/popular?days=30`.
  Plays go to MongoDB Atlas (db `zvonko`, collection `plays`); `MONGODB_URI` is set in DirectAdmin's Node.js app
  settings, never in the repo. The client reports each scored play fire-and-forget with an anonymous device id
  (`usePlayHistory.ts`); without the API (GitHub Pages, offline) the app works on localStorage alone.
- User melodies (beta): `src/lib/custom.ts` turns a `MelodyDef` (bells, first-round line, hosting bell, repeats,
  turn, notes per bar) into strikes with `turn()`, and `findSame()` detects a melody already in the app (then the
  editor saves the name as an alternative name instead). Server: `GET /api/library` (melodies + aliases, `mine`
  via the `X-Client` header), `POST /api/melodies`, `DELETE /api/melodies/:id` (creator only), `POST /api/aliases`;
  names unique ignoring case and diacritics. `useLibrary.ts` merges them with the built-in `pieces`; settings keep
  the chosen piece by name. The deploy script never touches the hosting's `.htaccess`
  outside its `# ZVONKO BEGIN/END` block; it restarts the app via `tmp/restart.txt`.

## Gotchas

- Bells are **0-based in code** (0 = bell 1, smallest) but 1-based in the UI and README.
- `usePlayer` always uses the first tuning (the tuning picker is hidden).
- The README's "Zgradba" section and Node version are stale (mentions `src/melodies.js`, Node 20.19); trust the code.

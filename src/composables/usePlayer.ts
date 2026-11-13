import { shallowRef, readonly, computed, watch, onScopeDispose, type Ref } from 'vue'
import { tunings, Bells } from '../lib/bell.ts'
import { createJudge } from '../lib/score.ts'
import type { Piece } from '../lib/melodies.ts'
import { countInBeats } from '../lib/notation.ts'

const LOOKAHEAD = 0.1 // s of audio scheduled ahead
const GRACE = 0.3 // wait mode: seconds after a note is due before the melody counts as stopped
const freqs = Object.values(tunings)[0]! // tuning picker is hidden for now: always the first tuning

export interface PlayerSettings {
  piece: Ref<Piece>
  rpm: Ref<number>
  practice: Ref<number> // bell the player rings, -1 = none
  waitForMe: Ref<boolean>
  hostVolume: Ref<number> // % volume of the x strikes
  minutes: Ref<number> // after this much playing time, finish the current pass and stop; 0 = until stopped
}
export interface PlayerOptions {
  onTimeUp?: () => void // the chosen playing time is over and the melody reached its end (the caller stops and scores)
}
// something due at audio time t (s): strike i sounding, the melody pausing at i for the player (wait),
// or a count-in beat (count = the number shown, counting down to 1)
interface Queued {
  i: number
  t: number
  wait?: boolean
  count?: number
}

// Plays a piece in time and lets the player ring one bell along with it.
// Web Audio lookahead scheduler: audio is timed by the AudioContext, the shown position follows via rAF.
export function usePlayer(
  { piece, rpm, practice, waitForMe, hostVolume, minutes }: PlayerSettings,
  { onTimeUp }: PlayerOptions = {},
) {
  const playing = shallowRef(false)
  const countdown = shallowRef(0) // count-in number on screen, 0 = none
  const beat = computed(() => 120 / rpm.value) // s per beat: a melody note and its hosting x
  const current = shallowRef(-1) // strike shown as sounding, -1 = at the start
  const waiting = shallowRef(-1) // strike the melody is paused on in wait mode
  const flash = shallowRef(-1) // bell just rung by hand, for a short highlight
  // metronome is disabled for now; kept so it can be switched back on
  const metronome = false as boolean
  let clickOnly = false // metronome-only playback, bells silent

  let bells: Bells | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let raf = 0
  let next = 0 // index of the next strike to schedule
  let nextTime = 0 // its audio time
  let queue: Queued[] = []
  let waitAt = -1 // scheduler stopped before this strike, waiting for the player
  let currentT = 0 // audio time the current strike sounded, for smooth motion between strikes
  let countLeft = 0 // count-in clicks still to schedule
  let countTotal = 0
  let countTime = 0 // audio time of the next count-in click
  let played = 0 // s of melody played in earlier stretches (before pauses), for the time limit
  let since: number | null = null // audio time the melody started in the current stretch
  let ending = false // time is up: play to the end of the current pass, then stop
  let endAt: number | null = null // audio time the last strike's beat is over
  const judge = createJudge() // accuracy of this play-along

  function audio(): Bells {
    const b = (bells ??= new Bells())
    b.resume()
    freqs.forEach((f) => b.buffer(f)) // render all 4 bells up front, not on the first tap
    return b
  }

  function schedule() {
    if (!bells) return
    const strikes = piece.value.strikes
    // count-in first: clicks on the beat, a higher one on the first, before the melody's first strike
    while (countLeft > 0 && countTime < bells.ctx.currentTime + LOOKAHEAD) {
      bells.click(countTime, countLeft === countTotal)
      queue.push({ i: -1, t: countTime, count: countLeft })
      countLeft--
      countTime += beat.value
    }
    while (waitAt < 0 && nextTime < bells.ctx.currentTime + LOOKAHEAD) {
      // time is up: don't start another pass; the end is one strike after the last one
      if (ending && next === 0) {
        endAt ??= nextTime
        break
      }
      const s = strikes[next]!
      if (waitForMe.value && s.bell === practice.value) {
        waitAt = next
        queue.push({ i: next, t: nextTime + GRACE, wait: true }) // show the pause once the grace period is over
        return
      }
      const volume = s.label === 'x' ? hostVolume.value / 100 : 1
      if (!clickOnly && s.bell !== practice.value && volume > 0)
        bells.ring(freqs[s.bell]!, nextTime, s.accent, volume)
      if (s.bell === practice.value) judge.expect(nextTime * 1000) // a beat the player should hit
      if ((metronome || clickOnly) && s.label !== 'x') bells.click(nextTime, s.label === '1')
      queue.push({ i: next, t: nextTime })
      nextTime += 60 / rpm.value
      next = (next + 1) % strikes.length
    }
  }

  function draw() {
    const now = bells!.ctx.currentTime
    while (queue.length && queue[0]!.t <= now) {
      const q = queue.shift()!
      if (q.count) countdown.value = q.count
      else if (q.wait) waiting.value = q.i
      else {
        current.value = q.i
        currentT = q.t
        countdown.value = 0
      }
    }
    // time limit: only melody time counts, not the count-in or pauses. Once it is reached the melody
    // still plays to the end of its current pass, so it never stops mid-phrase.
    if (
      !ending &&
      minutes.value &&
      since !== null &&
      played + Math.max(0, now - since) >= minutes.value * 60
    )
      ending = true
    if (endAt !== null && now >= endAt) {
      onTimeUp?.()
      if (!playing.value) return // the caller stopped it: don't keep drawing
    }
    raf = requestAnimationFrame(draw)
  }

  // countIn: count the beats in with clicks first (Predvajaj); not when the player's own tap started it
  function play(from = 0, countIn = false) {
    const { ctx } = audio()
    next = from
    if (countIn) {
      countLeft = countTotal = countInBeats(piece.value.strikes)
      countTime = ctx.currentTime + LOOKAHEAD
      nextTime = countTime + countTotal * beat.value // the melody comes in on the beat after the count
    } else {
      // starting after a strike the player just rang by hand: the next one is one beat away
      nextTime = ctx.currentTime + (from ? 60 / rpm.value : LOOKAHEAD)
    }
    since = nextTime
    endAt = null // a pause while finishing the pass: the end is worked out again
    queue = []
    waitAt = waiting.value = -1
    current.value = from - 1
    currentT = nextTime - 60 / rpm.value // glide from the shown note into the first one
    timer = setInterval(schedule, 25)
    raf = requestAnimationFrame(draw)
    playing.value = true
  }

  // pause keeps the position (current), stop rewinds to the start
  function pause() {
    clearInterval(timer)
    cancelAnimationFrame(raf)
    playing.value = false
    waitAt = waiting.value = -1
    countLeft = countdown.value = 0 // clicks not yet scheduled are dropped, the rest are < LOOKAHEAD away
    if (bells && since !== null) played += Math.max(0, bells.ctx.currentTime - since)
    since = null
    if (bells) judge.dropAfter(bells.ctx.currentTime * 1000)
  }

  function stop() {
    pause()
    clickOnly = false
    current.value = -1
    played = 0
    ending = false
    endAt = null
    judge.reset()
  }

  // Ustavi / Esc: stop and return the accuracy of this play-along, or null when there is nothing to score
  function finish() {
    const result = judge.result(bells ? bells.ctx.currentTime * 1000 : 0)
    stop()
    return result
  }

  // Predvajaj: from the start, or after a pause / step continue one beat after the shown note
  function resume() {
    play(current.value < 0 ? 0 : (current.value + 1) % piece.value.strikes.length, true)
  }

  function toggle() {
    if (playing.value) pause()
    else resume()
  }

  // one strike back or forward (wraps around), sounding it so the step can be heard
  function step(d: number) {
    if (playing.value) pause()
    const n = piece.value.strikes.length
    current.value = (Math.max(current.value, d > 0 ? -1 : 0) + d + n) % n
    const s = piece.value.strikes[current.value]!
    audio().ring(freqs[s.bell]!, undefined, s.accent)
  }

  function continueFrom(i: number, t: number) {
    next = i % piece.value.strikes.length
    nextTime = t
    currentT = t - 60 / rpm.value
    waitAt = waiting.value = -1
    queue = queue.filter((q) => !q.wait)
  }

  function ring(bell: number) {
    audio().ring(freqs[bell]!)
    flash.value = bell
    setTimeout(() => flash.value === bell && (flash.value = -1), 150)
  }

  // the player strikes their bell: space on desktop, the big circle on touch screens
  function tap() {
    if (practice.value < 0) return
    ring(practice.value)
    const { ctx } = bells! // ring() created it
    // judged against what the player hears, so the device's audio output delay is taken off the tap time.
    // Počakaj name isn't scored: there the melody waits for the player, so there is no fixed beat.
    if (playing.value && !waitForMe.value)
      judge.tap((ctx.currentTime - (ctx.outputLatency || 0)) * 1000)
    // the first press on the opening bell counts as strike 1, the melody continues in tempo from it
    if (!playing.value && current.value < 0 && practice.value === piece.value.strikes[0]!.bell)
      play(1)
    else if (waitAt >= 0) {
      // the player rang the awaited note: it counts as that strike. Within the grace period the melody
      // keeps its original beat (nextTime still holds the due time), otherwise it resumes one beat after the press.
      const now = ctx.currentTime
      current.value = waitAt
      continueFrom(waitAt + 1, (now <= nextTime + GRACE ? nextTime : now) + 60 / rpm.value)
    }
  }

  // Shown position in strikes, fractional while playing (between the current strike and the next),
  // for views that move smoothly. Read it every frame; it is not reactive.
  function position() {
    const frac =
      playing.value && bells
        ? Math.min(1, Math.max(0, ((bells.ctx.currentTime - currentT) * rpm.value) / 60))
        : 0
    return current.value + frac
  }

  // turning waiting off or switching bells mid-pause would leave the melody stuck: just carry on
  watch(
    [waitForMe, practice],
    () => bells && waitAt >= 0 && continueFrom(waitAt, bells.ctx.currentTime + LOOKAHEAD),
  )
  watch(piece, () => stop())
  onScopeDispose(stop)

  return {
    playing: readonly(playing),
    countdown: readonly(countdown),
    beat,
    current: readonly(current),
    waiting: readonly(waiting),
    flash: readonly(flash),
    position,
    toggle,
    step,
    ring,
    tap,
    finish,
  }
}

// Strike note as semitones from a1 (440 Hz) plus deviation in 1/16 semitone, as bell inspection reports give it.
const note = (semitones, sixteenths = 0) => 440 * 2 ** ((semitones + sixteenths / 16) / 12)

// Strike-note frequencies, bell 1 (smallest) first.
export const tunings = {
  'Naši zvonovi (h1-6 a1-4 fis1-7 d1-8)': [note(2, -6), note(0, -4), note(-3, -7), note(-7, -8)],
  "Te Deum (a' g' f' d')": [440.0, 392.0, 349.23, 293.66],
  "Durov akord (c'' g' e' c')": [523.25, 392.0, 329.63, 261.63],
}

// [ratio to strike note, amplitude, decay seconds]: rough church-bell partials (hum, prime, minor tierce, quint, nominal…)
const PARTIALS = [
  [0.5, 0.35, 3],
  [1, 0.5, 2.4],
  [1.2, 0.4, 1.8],
  [1.5, 0.2, 1.5],
  [2, 0.6, 1.2],
  [2.5, 0.15, 0.9],
  [3, 0.12, 0.7],
]

export class Bells {
  ctx = new AudioContext()
  out = this.ctx.createGain()

  constructor() {
    const comp = this.ctx.createDynamicsCompressor()
    this.out.gain.value = 0.2
    this.out.connect(comp).connect(this.ctx.destination)
  }

  resume() {
    return this.ctx.resume()
  }

  // metronome tick, higher on the first beat of the bar
  click(t, downbeat = false) {
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.frequency.value = downbeat ? 1800 : 1200
    gain.gain.setValueAtTime(0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    osc.connect(gain).connect(this.out)
    osc.start(t)
    osc.stop(t + 0.04)
  }

  ring(freq, t = this.ctx.currentTime, accent = false, volume = 1) {
    const peak = (accent ? 1.8 : 1) * volume
    for (const [ratio, amp, decay] of PARTIALS) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.frequency.value = freq * ratio
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(amp * peak, t + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay)
      osc.connect(gain).connect(this.out)
      osc.start(t)
      osc.stop(t + decay)
    }
  }
}

// Strike note as semitones from a1 (440 Hz) plus deviation in 1/16 semitone, as bell inspection reports give it.
const note = (semitones, sixteenths = 0) => 440 * 2 ** ((semitones + sixteenths / 16) / 12)

// Strike-note frequencies, bell 1 (smallest) first.
export const tunings = {
  'Naši zvonovi (d1-8 fis1-7 a1-4 h1-6)': [note(-7, -8), note(-3, -7), note(0, -4), note(2, -6)],
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

// vsi zvonovi zvenijo oktavo višje od zapisane uglasitve (sintetiziran zvok je sicer zvenel prenizko)
const OCTAVE_UP = 2

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

  // Each bell's sound is computed once into a buffer; a strike is then just 2 audio nodes instead of 14
  // live oscillators, which phones can't keep up with at 3 strikes a second.
  #buffers = new Map()
  buffer(freq) {
    let buf = this.#buffers.get(freq)
    if (buf) return buf
    const sr = this.ctx.sampleRate
    const len = Math.ceil(Math.max(...PARTIALS.map((p) => p[2])) * sr)
    buf = this.ctx.createBuffer(1, len, sr)
    const data = buf.getChannelData(0)
    const attack = 0.003 * sr
    for (const [ratio, amp, decay] of PARTIALS) {
      const w = (2 * Math.PI * freq * ratio * OCTAVE_UP) / sr
      const end = Math.floor(decay * sr)
      const fall = (0.0001 / amp) ** (1 / (end - attack)) // per-sample factor of the exponential decay
      let env = amp
      for (let n = 0; n < end; n++) {
        const g = n < attack ? (amp * n) / attack : (env *= fall)
        data[n] += g * Math.sin(w * n)
      }
    }
    this.#buffers.set(freq, buf)
    return buf
  }

  ring(freq, t = this.ctx.currentTime, accent = false, volume = 1) {
    const src = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    src.buffer = this.buffer(freq)
    gain.gain.value = (accent ? 1.8 : 1) * volume
    src.connect(gain).connect(this.out)
    src.start(t)
  }
}

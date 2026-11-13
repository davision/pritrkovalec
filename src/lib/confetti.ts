// Confetti burst over the whole app: two cannons in the bottom corners, then the pieces flutter down.
// A temporary canvas above everything (dialog included), removed when done. Skipped for reduced motion.
const COLORS = ['#e4572e', '#2e86de', '#17a673', '#9b59b6', '#f5c518'] // the four bells + gold
const DURATION = 4.5 // s, the last second fades out

export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  document.body.append(c)
  const dpr = devicePixelRatio || 1
  const W = (c.width = innerWidth * dpr)
  const H = (c.height = innerHeight * dpr)
  const ctx = c.getContext('2d')
  if (!ctx) return c.remove()
  // speeds scale with the screen height, so the burst reaches 40–95 % up on a phone and a monitor alike
  const G = 1.5 * H
  const FALL = 0.22 * H // terminal speed: paper flutters instead of dropping
  const parts = Array.from({ length: 180 }, (_, i) => {
    const left = i % 2 === 0
    const angle = ((left ? -62 : -118) + (Math.random() - 0.5) * 30) * (Math.PI / 180) // up and inward
    const speed = H * (1.1 + Math.random() * 0.6)
    return {
      x: left ? 0 : W,
      y: H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      s: (7 + Math.random() * 6) * dpr,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 14,
      color: COLORS[i % COLORS.length]!,
    }
  })

  let last = performance.now()
  let t = 0
  // an arrow, not a hoisted function, so TypeScript keeps ctx narrowed to non-null inside it
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000) // a stalled tab doesn't teleport the pieces
    last = now
    t += dt
    ctx.clearRect(0, 0, W, H)
    ctx.globalAlpha = Math.max(0, Math.min(1, DURATION - t))
    for (const p of parts) {
      p.vy = Math.min(p.vy + G * dt, FALL)
      p.vx *= 1 - 1.2 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.r += p.vr * dt
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.scale(1, Math.cos(p.r * 1.7)) // tumbling: the strip turns edge-on and back
      ctx.fillStyle = p.color
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
      ctx.restore()
    }
    if (t < DURATION) requestAnimationFrame(frame)
    else c.remove()
  }
  requestAnimationFrame(frame)
}

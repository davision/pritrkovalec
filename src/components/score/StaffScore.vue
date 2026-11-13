<script setup lang="ts">
import { computed, watch } from 'vue'
import { beatsPerBar, pairLines, type IndexedStrike, type Pair } from '../../lib/notation.ts'
import type { Piece } from '../../lib/melodies.ts'
import '@fontsource/bravura' // SMuFL music font (SIL OFL) for the staff glyphs

// Notni in številčni zapis: percussion staff, one line per bell (bell 1 at the bottom).
// Melody = quarter note, stem down; hosting bell = eighth on the off-beat, stem up. Numbers underneath.
// Poenostavljen (simple): heads only, x for the hosting bell, bell 1 on top, wider line spacing.
// Drawn with SMuFL glyphs from the Bravura font (font-size = 4 staff spaces); offsets below are in staff spaces (sp) from Bravura's metadata.
const props = withDefaults(
  defineProps<{
    piece: Piece
    current: number
    waiting: number
    practice: number
    simple?: boolean
  }>(),
  {
    simple: false,
  },
)

const ST = { top: 64, gap: 12, x0: 72, beat: 72, pad: 24 }
const SP = ST.gap
const HEAD_W = 1.18 * SP // noteheadBlack width
const STEM_W = 0.12 * SP
const STEM_LEN = 3.5 * SP
const G = {
  head: '',
  headX: '',
  flag8Up: '',
  rest8: '',
  percClef: '',
  accent: '',
  digit: (n: number) => String.fromCharCode(0xe080 + n),
}
const STAFF_H = 176

const perBar = computed(() => beatsPerBar(props.piece.strikes))
const lines = computed(() => pairLines(props.piece.strikes, perBar.value))
const gap = computed(() => (props.simple ? 22 : SP)) // simplified staff has wider line spacing, same note size
const lineY = (bell: number) => ST.top + (props.simple ? bell : 3 - bell) * gap.value
const barX = (m: number) => ST.x0 + m * (perBar.value * ST.beat + ST.pad)
const beatX = (k: number) =>
  barX(Math.floor(k / perBar.value)) + ST.pad + (k % perBar.value) * ST.beat
const staffWidth = (line: Pair[]) => barX(line.length / perBar.value) + 24 // room for the end repeat
const noteClass = (n: IndexedStrike) => [
  `b${n.bell}`,
  {
    now: n.i === props.current,
    waiting: n.i === props.waiting,
    past: n.i < props.current,
    mine: n.bell === props.practice,
  },
]
const currentLine = computed(() =>
  lines.value.findIndex((l) =>
    l.some((p) => p.lead.i === props.current || p.host?.i === props.current),
  ),
)

watch(
  currentLine,
  (l) =>
    l >= 0 &&
    document.getElementById(`mala-${l}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
)
</script>

<template>
  <div class="staff">
    <svg
      v-for="(line, l) in lines"
      :id="`mala-${l}`"
      :key="l"
      :viewBox="
        simple
          ? `0 ${ST.top - 30} ${staffWidth(line) + 20} ${3 * gap + 54}`
          : `0 0 ${staffWidth(line)} ${STAFF_H}`
      "
      :width="staffWidth(line) + (simple ? 20 : 0)"
      :height="simple ? 3 * gap + 54 : STAFF_H"
    >
      <!-- poenostavljen: bell numbers left of the lines, practice bell's line in yellow -->
      <template v-if="simple">
        <text v-for="b in 4" :key="b" class="num" x="8" :y="lineY(b - 1) + 5">{{ b }}</text>
        <rect
          v-if="practice >= 0"
          class="mine-bg"
          x="20"
          :y="lineY(practice) - 7"
          :width="staffWidth(line) - 4"
          height="14"
          rx="7"
        />
      </template>
      <g :transform="simple ? 'translate(20 0)' : undefined">
        <rect
          v-for="k in 4"
          :key="k"
          x="4"
          :y="ST.top + (k - 1) * gap - 0.8"
          :width="staffWidth(line) - 8"
          height="1.6"
        />
        <text class="smufl" x="12" :y="ST.top + 1.5 * gap">{{ G.percClef }}</text>
        <template v-if="l === 0">
          <text
            class="smufl timesig"
            :style="simple && { fontSize: '54px' }"
            x="42"
            :y="ST.top + 0.75 * gap"
          >
            {{ G.digit(perBar) }}
          </text>
          <text
            class="smufl timesig"
            :style="simple && { fontSize: '54px' }"
            x="42"
            :y="ST.top + 2.25 * gap"
          >
            {{ G.digit(4) }}
          </text>
        </template>
        <template v-for="(p, k) in line" :key="p.lead.i">
          <!-- melody: quarter note, stem down on the left of the head -->
          <g :class="noteClass(p.lead)">
            <rect
              v-if="!simple && p.lead.bell === practice"
              class="mine-bg"
              :x="beatX(k) - 11"
              y="150"
              width="22"
              height="24"
              rx="4"
            />
            <text v-if="p.lead.accent" class="smufl" :x="beatX(k) - 8" :y="ST.top - 2.6 * SP">
              {{ G.accent }}
            </text>
            <text class="smufl" :x="beatX(k) - HEAD_W / 2" :y="lineY(p.lead.bell)">
              {{ G.head }}
            </text>
            <template v-if="!simple">
              <rect
                :x="beatX(k) - HEAD_W / 2"
                :y="lineY(p.lead.bell) + 0.17 * SP"
                :width="STEM_W"
                :height="STEM_LEN - 0.17 * SP"
              />
              <text class="num" :x="beatX(k)" y="168">{{ p.lead.bell + 1 }}</text>
            </template>
          </g>
          <!-- hosting bell: eighth rest on the beat, eighth note on the off-beat, stem up on the right -->
          <g v-if="simple && p.host" class="host" :class="noteClass(p.host)">
            <text class="smufl" :x="beatX(k) + ST.beat / 2 - HEAD_W / 2" :y="lineY(p.host.bell)">
              {{ G.headX }}
            </text>
          </g>
          <g v-else-if="p.host" class="host" :class="noteClass(p.host)">
            <!-- eighth rest on the hosting bell's own line, aligned with the quarter note's beat; scaled down to read lighter -->
            <text
              class="smufl"
              :transform="`translate(${beatX(k) - 3.3} ${lineY(p.host.bell)}) scale(0.55 0.7)`"
            >
              {{ G.rest8 }}
            </text>
            <rect
              v-if="p.host.bell === practice"
              class="mine-bg"
              :x="beatX(k) + ST.beat / 2 - 9"
              y="152"
              width="18"
              height="20"
              rx="4"
            />
            <text class="smufl" :x="beatX(k) + ST.beat / 2 - HEAD_W / 2" :y="lineY(p.host.bell)">
              {{ G.head }}
            </text>
            <rect
              :x="beatX(k) + ST.beat / 2 + HEAD_W / 2 - STEM_W"
              :y="lineY(p.host.bell) - STEM_LEN"
              :width="STEM_W"
              :height="STEM_LEN - 0.17 * SP"
            />
            <text
              class="smufl"
              :x="beatX(k) + ST.beat / 2 + HEAD_W / 2 - STEM_W"
              :y="lineY(p.host.bell) - STEM_LEN"
            >
              {{ G.flag8Up }}
            </text>
            <text class="num small" :x="beatX(k) + ST.beat / 2" y="166">{{ p.host.bell + 1 }}</text>
            <rect :x="beatX(k) + ST.beat / 2 - 4" y="169" width="8" height="1.2" />
          </g>
        </template>
        <rect
          v-for="m in line.length / perBar - 1"
          :key="m"
          :x="barX(m) - 1"
          :y="ST.top"
          width="1.9"
          :height="3 * gap"
        />
        <template v-if="l === lines.length - 1">
          <!-- end repeat: dots, thin and thick barline -->
          <circle :cx="staffWidth(line) - 24" :cy="ST.top + 0.5 * gap" r="2.2" />
          <circle :cx="staffWidth(line) - 24" :cy="ST.top + 2.5 * gap" r="2.2" />
          <rect :x="staffWidth(line) - 18" :y="ST.top" width="1.9" :height="3 * gap" />
          <rect :x="staffWidth(line) - 13" :y="ST.top" width="6" :height="3 * gap" />
        </template>
        <rect v-else :x="staffWidth(line) - 9" :y="ST.top" width="1.9" :height="3 * gap" />
      </g>
    </svg>
  </div>
</template>

<style>
div.staff {
  /* div: the score section also carries the view name as a class */
  display: grid;
  justify-content: center;
  gap: 4px;
  padding-bottom: 12px;
}
.staff svg {
  max-width: 100%;
  height: auto;
  fill: var(--ink);
  overflow: visible;
}
.staff g {
  color: var(--ink);
  fill: currentColor;
}
.staff .smufl {
  font: 48px/1 Bravura; /* SMuFL: em = 4 staff spaces */
}
.staff .smufl.timesig {
  font-size: 30px; /* digits are 2 sp tall; scaled down so both fit the 4-line staff */
}
.staff .num {
  font-family: Roboto, sans-serif;
  text-anchor: middle;
  font-size: 20px;
}
.staff .num.small {
  font-size: 13px;
}
.staff .mine-bg {
  fill: var(--lane);
}
.staff .host {
  opacity: var(--host-opacity, 1);
}
.staff .past {
  color: var(--muted);
}
.staff .now,
.staff .waiting {
  color: var(--c);
  opacity: 1;
}
.staff .waiting {
  animation: blink 0.8s ease-in-out infinite alternate;
}
@keyframes blink {
  to {
    opacity: 0.35;
  }
}
</style>

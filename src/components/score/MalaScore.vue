<script setup lang="ts">
import { computed, watch } from 'vue'
import { beatsPerBar, pairLines, groups, type Pair } from '../../lib/notation.ts'
import type { Piece } from '../../lib/melodies.ts'

// Po Malavašiču: big handwritten-style digits, each melody note with its hosting bell as a superscript.
const props = defineProps<{ piece: Piece; current: number; waiting: number; practice: number }>()

const perBar = computed(() => beatsPerBar(props.piece.strikes))
// each line split into the groups it may wrap between
const lines = computed(() =>
  pairLines(props.piece.strikes, perBar.value).map((line) =>
    groups(line, props.piece.group ?? perBar.value),
  ),
)
// the melody note, then its hosting strike when it has one
const notesOf = (p: Pair) => (p.host ? [p.lead, p.host] : [p.lead])
const currentLine = computed(() =>
  lines.value.findIndex((l) =>
    l.flat().some((p) => p.lead.i === props.current || p.host?.i === props.current),
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
  <div class="mala">
    <p v-for="(line, l) in lines" :id="`mala-${l}`" :key="l">
      <span v-for="(g, k) in line" :key="k" class="group">
        <span
          v-for="p in g"
          :key="p.lead.i"
          v-memo="[
            piece,
            practice,
            current === p.lead.i || current === p.host?.i,
            current > p.lead.i,
            waiting === p.lead.i || waiting === p.host?.i,
          ]"
          class="pair"
        >
          <span
            v-for="n in notesOf(p)"
            :key="n.i"
            :class="[
              n === p.lead ? 'lead' : 'host',
              `b${n.bell}`,
              {
                now: n.i === current,
                waiting: n.i === waiting,
                past: n.i < current,
                mine: n.bell === practice,
              },
            ]"
            ><i v-if="n.accent" class="accent">&gt;</i>{{ n.bell + 1 }}</span
          >
        </span>
      </span>
    </p>
  </div>
</template>

<style>
div.mala {
  /* div: the score section also carries the view name as a class */
  display: grid;
  grid-template-columns: minmax(
    0,
    max-content
  ); /* as wide as the longest line, but never wider than the screen */
  justify-content: center;
  padding: 8px 0 16px;
}
/* a line breaks only between groups (bars), never inside one */
.mala p {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0 0.6em;
  margin: 0 0 0.35em;
  font:
    500 clamp(32px, 9vw, 44px)/1.5 Georgia,
    'Times New Roman',
    serif; /* the one place that keeps the handwritten serif */
}
.mala .group,
.mala .pair {
  display: inline-flex;
  gap: 0.2em;
  align-items: flex-start;
}
.mala .group {
  gap: 0.3em;
}
.mala .lead,
.mala .host {
  position: relative;
  display: inline-block;
  padding: 0 2px;
  border-radius: 6px;
  transition:
    color 0.08s,
    background 0.08s;
}
.mala .host {
  font-size: 0.5em;
  line-height: 1.6;
  opacity: var(--host-opacity, 1);
}
.mala .past {
  color: var(--muted);
}
.mala .mine {
  background: var(--lane);
}
/* current strike: white digit on the bell's colour, like the squares in Bobnarske note */
.mala .now,
.mala .waiting {
  background: var(--c);
  color: #fff;
  opacity: 1;
}
.mala .waiting {
  animation: pulse-bg 0.8s ease-in-out infinite alternate;
}
.mala .accent {
  top: -0.35em;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.4em;
}
</style>

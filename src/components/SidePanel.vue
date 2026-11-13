<script setup lang="ts">
import Button from 'primevue/button'

// A side panel: an always-open column on desktop (1200px and up), a panel sliding in from its side
// below that. The page's grid places the left and right panel (see App.vue).
const { open = false } = defineProps<{
  title: string
  side: 'left' | 'right'
  open?: boolean // only matters below 1200px
}>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <aside class="panel" :class="[`panel-${side}`, { open }]" :aria-label="title">
    <div class="panel-head">
      <h2>{{ title }}</h2>
      <Button
        icon="pi pi-times"
        severity="secondary"
        text
        rounded
        aria-label="Zapri"
        @click="emit('close')"
      />
    </div>
    <slot />
  </aside>
</template>

<style>
/* side panels: off-canvas below 1200px, always-open columns above */
.panel {
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: 30;
  width: min(88vw, 360px);
  overflow-y: auto;
  padding: 0 20px 24px;
  background: var(--chrome);
  box-shadow: 0 0 32px rgba(0, 0, 0, 0.5);
  visibility: hidden; /* closed panels stay out of the tab order */
  transition:
    transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),
    visibility 0s 0.3s;
}
.panel-left {
  left: 0;
  transform: translateX(-100%);
}
.panel-right {
  right: 0;
  transform: translateX(100%);
}
.panel.open {
  visibility: visible;
  transform: none;
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.panel-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  background: inherit;
}
.panel-head h2 {
  margin: 0;
  text-align: left;
}
@media (min-width: 1200px) {
  .panel {
    position: sticky;
    top: 61px; /* below the app bar */
    z-index: auto;
    width: auto;
    height: calc(100dvh - 61px); /* full height; the border runs on behind the docked player */
    padding-bottom: calc(var(--player-h) + 16px); /* keeps the panel's content above the player */
    visibility: visible;
    transform: none;
    transition: none;
    box-shadow: none;
    background: var(--paper);
  }
  .panel-left {
    grid-column: 1;
    border-right: 1px solid var(--line);
  }
  .panel-right {
    grid-column: 3;
    border-left: 1px solid var(--line);
  }
  /* always open: no close button */
  .panel-head .p-button {
    display: none;
  }
}
</style>

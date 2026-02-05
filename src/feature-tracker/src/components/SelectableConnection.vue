<template>
  <svg class="connection" data-testid="connection">
    <path :d="path" :class="{ selected: data.selected }" />
  </svg>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

export default defineComponent({
  props: {
    data: {
      type: Object as PropType<{ selected?: boolean }>,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    start: {
      type: Object as PropType<{ x: number; y: number }>,
      required: false
    },
    end: {
      type: Object as PropType<{ x: number; y: number }>,
      required: false
    }
  }
});
</script>

<style scoped>
.connection {
  overflow: visible !important;
  position: absolute;
  pointer-events: none;
  width: 9999px;
  height: 9999px;
}

.connection path {
  fill: none;
  stroke-width: 4px;
  stroke: #94a3b8;
  pointer-events: auto;
  cursor: pointer;
  transition: stroke 140ms ease, stroke-width 140ms ease, filter 140ms ease;
}

.connection path.selected {
  stroke: #38bdf8;
  stroke-width: 6px;
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.6));
}
</style>

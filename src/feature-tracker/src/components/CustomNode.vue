<template>
  <div
    class="node"
    :class="{ selected: data.selected }"
    :style="nodeStyles()"
    data-testid="node"
  >
    <div class="title" data-testid="title">
      <span class="title-text">{{ data.label }}</span>
      <span class="status-indicator" aria-hidden="true"></span>
    </div>

    <div
      v-for="[key, output] in outputs()"
      :key="`output-${key}-${seed}`"
      class="output"
      :data-testid="`output-${key}`"
    >
      <div class="output-title" data-testid="output-title">{{ output.label }}</div>
      <Ref
        class="output-socket"
        :data="{ type: 'socket', side: 'output', key, nodeId: data.id, payload: output.socket }"
        :emit="emit"
        :data-socket-node="data.id"
        :data-socket-key="key"
        data-socket-side="output"
        data-testid="output-socket"
      />
    </div>

    <Ref
      v-for="[key, control] in controls()"
      :key="`control-${key}-${seed}`"
      class="control"
      :data="{ type: 'control', payload: control }"
      :emit="emit"
      :data-testid="`control-${key}`"
    />

    <div
      v-for="[key, input] in inputs()"
      :key="`input-${key}-${seed}`"
      class="input"
      :data-testid="`input-${key}`"
    >
      <Ref
        class="input-socket"
        :data="{ type: 'socket', side: 'input', key, nodeId: data.id, payload: input.socket }"
        :emit="emit"
        :data-socket-node="data.id"
        :data-socket-key="key"
        data-socket-side="input"
        data-testid="input-socket"
      />
      <div v-show="!input.control || !input.showControl" class="input-title" data-testid="input-title">
        {{ input.label }}
      </div>
      <Ref
        v-show="input.control && input.showControl"
        class="input-control"
        :data="{ type: 'control', payload: input.control }"
        :emit="emit"
        data-testid="input-control"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { Ref } from "rete-vue-plugin";

type Entry = [string, any];

function sortByIndex(entries: Entry[]) {
  entries.sort((a, b) => (a[1]?.index ?? 0) - (b[1]?.index ?? 0));
  return entries;
}

export default defineComponent({
  props: {
    data: {
      type: Object as PropType<any>,
      required: true
    },
    emit: {
      type: Function as PropType<(payload: any) => void>,
      required: true
    },
    seed: {
      type: Number,
      required: true
    }
  },
  methods: {
    nodeStyles() {
      return {
        width: Number.isFinite(this.data.width) ? `${this.data.width}px` : "",
        height: Number.isFinite(this.data.height) ? `${this.data.height}px` : ""
      };
    },
    inputs() {
      return sortByIndex(Object.entries(this.data.inputs));
    },
    controls() {
      return sortByIndex(Object.entries(this.data.controls));
    },
    outputs() {
      return sortByIndex(Object.entries(this.data.outputs));
    }
  },
  components: {
    Ref
  }
});
</script>

<style scoped>
.node {
  background: var(--node-bg, #0b1221);
  border: 2px solid var(--node-border, #1f2937);
  border-radius: 12px;
  cursor: pointer;
  box-sizing: border-box;
  width: 180px;
  height: auto;
  padding-bottom: 8px;
  position: relative;
  user-select: none;
  line-height: initial;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  color: #e2e8f0;
}

.node:hover {
  filter: brightness(1.05);
}

.node.selected {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.node.is-dim {
  opacity: 0.3;
  filter: saturate(0.6);
}

.node {
  transition: opacity 220ms ease, filter 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.title {
  color: #f8fafc;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.title-text {
  flex: 1;
  min-width: 0;
}

.output {
  text-align: right;
}

.input {
  text-align: left;
}

.output-title,
.input-title {
  vertical-align: middle;
  color: #e2e8f0;
  display: inline-block;
  font-size: 13px;
  margin: 6px;
  line-height: 20px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--status-color, #38bdf8);
  box-shadow:
    0 0 0 2px rgba(15, 23, 42, 0.8),
    0 0 10px var(--status-color, #38bdf8);
  opacity: var(--status-opacity, 0);
  flex: 0 0 auto;
  transition: opacity 180ms ease;
}

.output-socket {
  text-align: right;
  margin-right: -18px;
  display: inline-block;
}

.input-socket {
  text-align: left;
  margin-left: -18px;
  display: inline-block;
}

.input-control {
  z-index: 1;
  width: calc(100% - 36px);
  vertical-align: middle;
  display: inline-block;
}

.control {
  padding: 6px 14px;
}
</style>

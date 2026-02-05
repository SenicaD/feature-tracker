<template>
  <div class="panel" :class="{ open: !!node }">
    <div class="header">
      <h3>Node Details</h3>
      <button class="close" @click="close">Close</button>
    </div>

    <div v-if="node" class="content">
      <div class="field">
        <label>Name</label>
        <input
          type="text"
          :value="node.name"
          @input="onNameChange"
        />
      </div>

      <div class="field">
        <label>Node ID</label>
        <div class="readonly">{{ node.id }}</div>
      </div>

      <div class="section-header">
        <label>Attributes</label>
        <button class="add-btn" @click="addAttribute">+ Add</button>
      </div>

      <div v-if="node.attributes.length === 0" class="empty-attrs">
        No attributes defined.
      </div>

      <div
        v-for="(attr, index) in node.attributes"
        :key="index"
        class="attribute"
      >
        <input
          type="text"
          class="attr-key"
          placeholder="Key"
          :value="attr.key"
          @input="(e) => onAttrKeyChange(index, e)"
        />
        <input
          type="text"
          class="attr-value"
          placeholder="Value"
          :value="attr.value"
          @input="(e) => onAttrValueChange(index, e)"
        />
        <button class="remove-btn" @click="removeAttribute(index)">&times;</button>
      </div>
    </div>
    <div v-else class="empty">
      Select a node to see its details.
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent } from "vue";
import { FeatureNode } from "../typescript/basic";

export default defineComponent({
  props: {
    node: {
      type: Object as () => FeatureNode | null,
      required: true
    }
  },

  setup(props, { emit }) {
    function onNameChange(e: Event) {
      if (!props.node) return;
      const input = e.target as HTMLInputElement;
      props.node.name = input.value;
      props.node.label = input.value;
    }

    function addAttribute() {
      if (!props.node) return;
      props.node.attributes.push({ key: "", value: "" });
    }

    function removeAttribute(index: number) {
      if (!props.node) return;
      props.node.attributes.splice(index, 1);
    }

    function onAttrKeyChange(index: number, e: Event) {
      const attr = props.node?.attributes[index];
      if (!attr) return;
      const input = e.target as HTMLInputElement;
      attr.key = input.value;
    }

    function onAttrValueChange(index: number, e: Event) {
      const attr = props.node?.attributes[index];
      if (!attr) return;
      const input = e.target as HTMLInputElement;
      attr.value = input.value;
    }

    function close() {
      emit("update:node", null);
    }

    return {
      onNameChange,
      addAttribute,
      removeAttribute,
      onAttrKeyChange,
      onAttrValueChange,
      close
    };
  }
});

</script>

<style scoped>
.panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: #1e1e1e;
  color: #fff;
  transform: translateX(100%);
  transition: transform 0.25s ease;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.panel.open {
  transform: translateX(0);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close {
  background: transparent;
  color: #fff;
  border: 1px solid #4a4a4a;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.content {
  padding: 16px;
}

.field {
  margin-top: 12px;
}

.field label {
  display: block;
  font-size: 12px;
  color: #9aa0a6;
  margin-bottom: 4px;
}

input {
  width: 100%;
  background: #2d2d2d;
  color: #fff;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #42b883;
}

.empty {
  padding: 16px;
  color: #9aa0a6;
  font-size: 14px;
}

.readonly {
  color: #9aa0a6;
  font-size: 14px;
  font-family: monospace;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.section-header label {
  font-size: 12px;
  color: #9aa0a6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-btn {
  background: transparent;
  color: #42b883;
  border: 1px solid #42b883;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.add-btn:hover {
  background: #42b88320;
}

.empty-attrs {
  color: #6b7280;
  font-size: 13px;
  margin-top: 12px;
  font-style: italic;
}

.attribute {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}

.attr-key {
  flex: 1;
}

.attr-value {
  flex: 2;
}

.remove-btn {
  background: transparent;
  color: #ef4444;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.remove-btn:hover {
  color: #f87171;
}
</style>

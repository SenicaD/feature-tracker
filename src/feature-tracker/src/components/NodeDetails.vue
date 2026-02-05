<template>
  <div class="pointer-events-none fixed inset-y-0 right-0 flex">
    <div
      class="pointer-events-auto w-80 bg-slate-900 border-l border-slate-800 shadow-xl transform transition-transform duration-200"
      :class="node ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 class="text-sm font-semibold text-slate-100">Node Details</h3>
        <button
          class="text-xs px-2 py-1 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
          @click="close"
        >
          Close
        </button>
      </div>

      <div v-if="node" class="p-4 space-y-4 text-sm">
        <div class="space-y-1">
          <label class="text-xs uppercase tracking-wide text-slate-400">Name</label>
          <input
            type="text"
            :value="node.name"
            @input="onNameChange"
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs uppercase tracking-wide text-slate-400">Node ID</label>
          <div class="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 font-mono text-xs">
            {{ node.id }}
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs uppercase tracking-wide text-slate-400">Status</label>
          <select
            :value="node.statusId || ''"
            @change="onStatusChange"
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Unset</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-xs uppercase tracking-wide text-slate-400">Project</label>
          <input
            v-model="projectName"
            list="project-options"
            type="text"
            placeholder="Project name"
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            @blur="applyProject"
          />
          <datalist id="project-options">
            <option v-for="project in projects" :key="project.id" :value="project.name" />
          </datalist>

          <div class="flex items-center gap-2">
            <input
              v-model="projectColor"
              type="color"
              class="h-10 w-12 rounded-md border border-slate-700 bg-slate-950 p-1"
              @change="applyProject"
            />
            <button
              class="text-xs px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
              @click="applyProject"
            >
              Apply
            </button>
            <button
              class="text-xs px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
              @click="clearProject"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800">
          <label class="text-xs uppercase tracking-wide text-slate-400">Attributes</label>
          <button
            class="text-xs px-2 py-1 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
            @click="addAttribute"
          >
            + Add
          </button>
        </div>

        <div v-if="node.attributes.length === 0" class="text-slate-500 text-xs italic">
          No attributes defined.
        </div>

        <div
          v-for="(attr, index) in node.attributes"
          :key="index"
          class="flex items-center gap-2"
        >
          <input
            type="text"
            class="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Key"
            :value="attr.key"
            @input="(e) => onAttrKeyChange(index, e)"
          />
          <input
            type="text"
            class="flex-[2] rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Value"
            :value="attr.value"
            @input="(e) => onAttrValueChange(index, e)"
          />
          <button
            class="text-slate-400 hover:text-red-400 px-2"
            @click="removeAttribute(index)"
          >
            &times;
          </button>
        </div>
      </div>

      <div v-else class="p-4 text-sm text-slate-500">
        Select a node to see its details.
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, type PropType, ref, watch } from "vue";
import { FeatureNode } from "../typescript/basic";
import type { StatusDef, ProjectDef } from "../typescript/api";

export default defineComponent({
  props: {
    node: {
      type: Object as PropType<FeatureNode | null>,
      required: true
    },
    statuses: {
      type: Array as PropType<StatusDef[]>,
      default: () => []
    },
    projects: {
      type: Array as PropType<ProjectDef[]>,
      default: () => []
    },
    onSetStatus: {
      type: Function as PropType<(nodeId: string, statusId: string | null) => void>,
      required: true
    },
    onSetProject: {
      type: Function as PropType<(nodeId: string, name: string | null, color: string | null) => void>,
      required: true
    }
  },

  setup(props, { emit }) {
    const projectName = ref("");
    const projectColor = ref("#38bdf8");

    function syncProjectFields() {
      if (!props.node) {
        projectName.value = "";
        projectColor.value = "#38bdf8";
        return;
      }
      const project = props.projects.find((p) => p.id === (props.node as any).projectId);
      if (project) {
        projectName.value = project.name;
        projectColor.value = project.color;
      } else {
        projectName.value = "";
        projectColor.value = "#38bdf8";
      }
    }

    watch(() => props.node, syncProjectFields, { immediate: true });
    watch(() => props.projects, syncProjectFields, { deep: true });

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

    function onStatusChange(e: Event) {
      if (!props.node) return;
      const select = e.target as HTMLSelectElement;
      const value = select.value;
      const statusId = value === "" ? null : value;
      props.onSetStatus(props.node.id, statusId);
    }

    function applyProject() {
      if (!props.node) return;
      props.onSetProject(props.node.id, projectName.value, projectColor.value);
    }

    function clearProject() {
      if (!props.node) return;
      projectName.value = "";
      props.onSetProject(props.node.id, null, null);
    }

    return {
      projectName,
      projectColor,
      onNameChange,
      addAttribute,
      removeAttribute,
      onAttrKeyChange,
      onAttrValueChange,
      onStatusChange,
      applyProject,
      clearProject,
      close
    };
  }
});

</script>

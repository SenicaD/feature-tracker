<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <select
        v-model="selectedProject"
        @change="onProjectSelect"
        class="h-10 min-w-[200px] rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="">-- Select Project --</option>
        <option v-for="name in projects" :key="name" :value="name">{{ name }}</option>
      </select>

      <button
        class="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="newProject"
      >
        New
      </button>
      <button
        class="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="saveCurrentProject"
        :disabled="!selectedProject"
      >
        Save
      </button>
      <button
        class="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="deleteCurrentProject"
        :disabled="!selectedProject"
      >
        Delete
      </button>
      <div class="h-6 w-px bg-slate-800 mx-1"></div>
      <button
        class="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="addNode"
      >
        Add Feature
      </button>
      <button
        class="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="autoArrange"
      >
        Auto Arrange
      </button>
      <select
        v-model="focusProjectId"
        @change="applyFocusProject"
        class="h-10 min-w-[160px] rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="">All Projects</option>
        <option v-for="project in featureProjects" :key="project.id" :value="project.id">
          Focus: {{ project.name }}
        </option>
      </select>
      <button
        class="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-100 hover:bg-slate-800"
        @click="toggleStatusManager"
      >
        Manage Statuses
      </button>

      <span v-if="statusMessage" class="ml-auto text-sm text-sky-300">{{ statusMessage }}</span>
    </header>

    <div class="pointer-events-none fixed inset-y-0 left-0 flex">
      <div
        class="pointer-events-auto w-80 bg-slate-900 border-r border-slate-800 shadow-xl transform transition-transform duration-200"
        :class="showStatusManager ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <div class="text-sm font-semibold text-slate-100">Statuses</div>
            <div class="text-xs text-slate-400">Names must be unique.</div>
          </div>
          <button
            class="text-xs px-2 py-1 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
            @click="toggleStatusManager"
          >
            Close
          </button>
        </div>

        <div class="p-4 space-y-4 text-sm">
          <div class="space-y-2">
            <div
              v-for="status in statuses"
              :key="status.id"
              class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full" :style="{ background: status.color }"></span>
                <span class="text-sm font-medium text-slate-100">{{ status.name }}</span>
              </div>
              <button
                class="text-xs px-3 py-1 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                :disabled="statuses.length <= 1"
                @click="removeStatus(status.id)"
              >
                Remove
              </button>
            </div>
          </div>

          <form class="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-3" @submit.prevent="addStatus">
            <input
              v-model="newStatusName"
              type="text"
              placeholder="Status name"
              class="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />

            <div class="flex flex-wrap gap-3">
              <label
                v-for="color in STATUS_PALETTE"
                :key="color"
                class="relative h-10 w-10 cursor-pointer"
              >
                <input class="sr-only" type="radio" :value="color" v-model="newStatusColor" required />
                <span
                  class="absolute inset-0 rounded-full border-2 border-slate-800"
                  :style="{
                    background: color,
                    boxShadow: newStatusColor === color ? '0 0 0 3px #38bdf8' : 'none'
                  }"
                ></span>
              </label>
            </div>

            <button
              type="submit"
              class="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-4 text-sm font-medium text-slate-50 hover:bg-slate-700"
            >
              Add Status
            </button>
          </form>
        </div>
      </div>
    </div>

    <main class="relative flex-1">
      <div class="absolute inset-0">
        <div class="rete h-full" ref="rete"></div>
      </div>
      <NodeDetails
        v-model:node="selectedNode"
        :statuses="statuses"
        :projects="featureProjects"
        :on-set-status="onSetStatus"
        :on-set-project="onSetProject"
      />
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { createEditor, type EditorController, type FeatureNode } from "./typescript/basic";
import { listProjects, loadProject, saveProject, deleteProject, STATUS_PALETTE, type StatusDef, type ProjectData, type ProjectDef } from "./typescript/api";
import NodeDetails from "./components/NodeDetails.vue";

export default defineComponent({
  components: { NodeDetails },

  data() {
    return {
      editor: null as EditorController | null,
      selectedNode: null as FeatureNode | null,
      projects: [] as string[],
      selectedProject: "",
      statuses: [] as StatusDef[],
      featureProjects: [] as ProjectDef[],
      focusProjectId: "",
      STATUS_PALETTE,
      showStatusManager: false,
      newStatusName: "",
      newStatusColor: STATUS_PALETTE[0] ?? "#10B981",
      statusMessage: "",
    };
  },

  async mounted() {
    const container = this.$refs.rete as HTMLElement;
    if (!container) return;

    this.editor = await createEditor(container);

    this.editor.onNodeClick((node) => {
      this.selectedNode = node;
    });

    this.editor.onCanvasClick(() => {
      this.selectedNode = null;
    });

    await this.refreshProjects();
  },

  unmounted() {
    this.editor?.destroy();
    this.editor = null;
  },

  methods: {
    async refreshProjects() {
      try {
        this.projects = await listProjects();
        if (this.projects.length === 0) return;
        if (!this.selectedProject || !this.projects.includes(this.selectedProject)) {
          const first = this.projects[0];
          if (!first) return;
          this.selectedProject = first;
          await this.onProjectSelect();
        }
      } catch (e) {
        this.showStatus("Failed to load projects");
      }
    },

    async onProjectSelect() {
      if (!this.selectedProject || !this.editor) return;
      try {
        const data = await loadProject(this.selectedProject);
        await this.applyProjectData(data);
        this.selectedNode = null;
        this.showStatus(`Loaded: ${this.selectedProject}`);
      } catch (e) {
        this.showStatus("Failed to load project");
      }
    },

    async newProject() {
      const name = prompt("Enter project name (letters, numbers, hyphens, underscores):");
      if (!name) return;

      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        this.showStatus("Invalid name. Use only letters, numbers, hyphens, underscores.");
        return;
      }

      if (this.projects.includes(name)) {
        this.showStatus("Project already exists");
        return;
      }

      try {
        await this.editor?.clear();
        const defaults: ProjectData = {
          name,
          statuses: this.defaultStatuses(),
          featureProjects: [],
          nodes: [],
          connections: []
        };
        await saveProject(name, defaults);
        await this.applyProjectData(defaults);
        await this.refreshProjects();
        this.selectedProject = name;
        this.selectedNode = null;
        this.showStatus(`Created: ${name}`);
      } catch (e) {
        this.showStatus("Failed to create project");
      }
    },

    async saveCurrentProject() {
      if (!this.selectedProject || !this.editor) return;
      try {
        const state = await this.editor.exportState();
        state.name = this.selectedProject;
        state.statuses = this.statuses;
        state.featureProjects = this.featureProjects;
        await saveProject(this.selectedProject, state);
        this.showStatus(`Saved: ${this.selectedProject}`);
      } catch (e) {
        this.showStatus("Failed to save project");
      }
    },

    async deleteCurrentProject() {
      if (!this.selectedProject) return;
      if (!confirm(`Delete project "${this.selectedProject}"?`)) return;

      try {
        await deleteProject(this.selectedProject);
        await this.editor?.clear();
        await this.refreshProjects();
        this.selectedProject = "";
        this.selectedNode = null;
        this.showStatus("Project deleted");
      } catch (e) {
        this.showStatus("Failed to delete project");
      }
    },

    async addNode() {
      try {
        await this.editor?.addNode();
      } catch (e) {
        console.error("Failed to add node:", e);
      }
    },

    async autoArrange() {
      try {
        await this.editor?.layout(true);
      } catch (e) {
        console.error("Failed to auto arrange:", e);
      }
    },

    applyFocusProject() {
      this.editor?.setFocusProject(this.focusProjectId || null);
    },

    async applyProjectData(data: ProjectData) {
      this.statuses = data.statuses ?? this.defaultStatuses();
      this.featureProjects = data.featureProjects ?? [];
      if (this.focusProjectId && !this.featureProjects.some((p) => p.id === this.focusProjectId)) {
        this.focusProjectId = "";
      }
      const withStatuses = { ...data, statuses: this.statuses, featureProjects: this.featureProjects };
      await this.editor?.importState(withStatuses);
      this.editor?.setStatuses(this.statuses);
      this.editor?.setProjects(this.featureProjects);
      this.editor?.setFocusProject(this.focusProjectId || null);
    },

    onSetStatus(nodeId: string, statusId: string | null) {
      this.editor?.setNodeStatus(nodeId, statusId);
      if (this.selectedNode && this.selectedNode.id === nodeId) {
        this.selectedNode.statusId = statusId;
      }
    },

    onSetProject(nodeId: string, name: string | null, color: string | null) {
      const trimmed = (name ?? "").trim();
      if (!trimmed) {
        this.editor?.setNodeProject(nodeId, null);
        if (this.selectedNode && this.selectedNode.id === nodeId) {
          (this.selectedNode as any).projectId = null;
        }
        return;
      }

      const normalized = trimmed.toLowerCase();
      const existing = this.featureProjects.find((p) => p.name.toLowerCase() === normalized);
      let projectId: string;

      if (existing) {
        projectId = existing.id;
        if (color && existing.color !== color) {
          existing.color = color;
          this.featureProjects = [...this.featureProjects];
        }
      } else {
        projectId = `${normalized.replace(/\s+/g, "-")}-${Date.now()}`;
        this.featureProjects = [
          ...this.featureProjects,
          {
            id: projectId,
            name: trimmed,
            color: color ?? "#38bdf8",
          },
        ];
      }

      this.editor?.setProjects(this.featureProjects);
      this.editor?.setNodeProject(nodeId, projectId);
      if (this.selectedNode && this.selectedNode.id === nodeId) {
        (this.selectedNode as any).projectId = projectId;
      }
    },

    defaultStatuses(): StatusDef[] {
      return [
        { id: "implemented", name: "Implemented", color: "#10B981" },
        { id: "intended", name: "Intended", color: "#3B82F6" },
        { id: "aspirational", name: "Aspirational", color: "#A855F7" },
      ];
    },

    toggleStatusManager() {
      this.showStatusManager = !this.showStatusManager;
    },

    addStatus() {
      const name = this.newStatusName.trim();
      if (!name) return;
      if (this.statuses.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        this.showStatus("Status name must be unique");
        return;
      }
      const newStatus: StatusDef = {
        id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        name,
        color: this.newStatusColor,
      };
      this.statuses = [...this.statuses, newStatus];
      this.editor?.setStatuses(this.statuses);
      this.newStatusName = "";
      this.newStatusColor = STATUS_PALETTE[0] ?? "#10B981";
    },

    removeStatus(id: string) {
      if (this.statuses.length <= 1) return;
      this.statuses = this.statuses.filter((s) => s.id !== id);

      const nodes = this.editor?.getNodes?.() ?? [];
      for (const node of nodes) {
        if ((node as any).statusId === id) {
          this.onSetStatus(node.id, null);
        }
      }

      this.editor?.setStatuses(this.statuses);
    },

    showStatus(msg: string) {
      this.statusMessage = msg;
      setTimeout(() => {
        this.statusMessage = "";
      }, 3000);
    },
  },
});
</script>

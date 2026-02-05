<template>
  <div class="page">
    <div class="toolbar">
      <select v-model="selectedProject" @change="onProjectSelect">
        <option value="">-- Select Project --</option>
        <option v-for="name in projects" :key="name" :value="name">{{ name }}</option>
      </select>
      <button @click="newProject">New</button>
      <button @click="saveCurrentProject" :disabled="!selectedProject">Save</button>
      <button @click="deleteCurrentProject" :disabled="!selectedProject">Delete</button>
      <span class="separator">|</span>
      <button @click="addNode">Add Feature</button>
      <span v-if="statusMessage" class="status">{{ statusMessage }}</span>
    </div>

    <div class="rete" ref="rete"></div>
    <NodeDetails v-model:node="selectedNode" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { createEditor, type EditorController, type FeatureNode } from "./typescript/basic";
import { listProjects, loadProject, saveProject, deleteProject } from "./typescript/api";
import NodeDetails from "./components/NodeDetails.vue";

export default defineComponent({
  components: { NodeDetails },

  data() {
    return {
      editor: null as EditorController | null,
      selectedNode: null as FeatureNode | null,
      projects: [] as string[],
      selectedProject: "",
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
      } catch (e) {
        this.showStatus("Failed to load projects");
      }
    },

    async onProjectSelect() {
      if (!this.selectedProject || !this.editor) return;
      try {
        const data = await loadProject(this.selectedProject);
        await this.editor.importState(data);
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
        await saveProject(name, { name, nodes: [], connections: [] });
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

    showStatus(msg: string) {
      this.statusMessage = msg;
      setTimeout(() => {
        this.statusMessage = "";
      }, 3000);
    },
  },
});
</script>

<style>
.page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 8px;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar select {
  padding: 6px 8px;
  background: #2d2d2d;
  color: #fff;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  min-width: 180px;
}

.toolbar button {
  padding: 6px 12px;
  background: #2d2d2d;
  color: #fff;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  cursor: pointer;
}

.toolbar button:hover:not(:disabled) {
  background: #3d3d3d;
}

.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.separator {
  color: #4a4a4a;
  margin: 0 4px;
}

.status {
  margin-left: auto;
  color: #42b883;
  font-size: 14px;
}

.rete {
  flex: 1;
}

/* Selected node styling */
.rete .node.selected {
  outline: 2px solid #42b883;
}
</style>

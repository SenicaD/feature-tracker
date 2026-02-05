# Save/Load Projects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add FastAPI backend to save/load feature tracker projects with full state restoration.

**Architecture:** FastAPI server stores projects as JSON files. Vue frontend adds project dropdown with New/Save/Delete buttons. Editor gains export/import methods to serialize state.

**Tech Stack:** FastAPI, uvicorn, Vue 3, TypeScript, Rete.js

---

### Task 1: Create FastAPI Backend

**Files:**
- Create: `src/api/main.py`
- Create: `src/api/requirements.txt`
- Create: `src/api/data/.gitkeep`

**Step 1: Create requirements.txt**

```
fastapi>=0.109.0
uvicorn>=0.27.0
```

**Step 2: Create data directory**

```bash
mkdir -p /root/scripts/feature-tracker/src/api/data
touch /root/scripts/feature-tracker/src/api/data/.gitkeep
```

**Step 3: Create FastAPI app**

```python
import json
import re
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


def validate_name(name: str) -> None:
    if not NAME_PATTERN.match(name):
        raise HTTPException(400, "Invalid project name. Use only letters, numbers, hyphens, underscores.")


def get_project_path(name: str) -> Path:
    return DATA_DIR / f"{name}.json"


class NodeAttribute(BaseModel):
    key: str
    value: str


class NodePosition(BaseModel):
    x: float
    y: float


class NodeData(BaseModel):
    id: str
    label: str
    name: str
    attributes: list[NodeAttribute]
    position: NodePosition


class ConnectionData(BaseModel):
    sourceId: str
    sourceOutput: str
    targetId: str
    targetInput: str


class ProjectData(BaseModel):
    name: str
    nodes: list[NodeData]
    connections: list[ConnectionData]


@app.get("/projects")
def list_projects() -> list[str]:
    return sorted([f.stem for f in DATA_DIR.glob("*.json")])


@app.get("/projects/{name}")
def get_project(name: str) -> ProjectData:
    validate_name(name)
    path = get_project_path(name)
    if not path.exists():
        raise HTTPException(404, "Project not found")
    data = json.loads(path.read_text())
    return ProjectData(**data)


@app.put("/projects/{name}")
def save_project(name: str, project: ProjectData) -> dict:
    validate_name(name)
    path = get_project_path(name)
    path.write_text(json.dumps(project.model_dump(), indent=2))
    return {"status": "saved"}


@app.delete("/projects/{name}")
def delete_project(name: str) -> dict:
    validate_name(name)
    path = get_project_path(name)
    if not path.exists():
        raise HTTPException(404, "Project not found")
    path.unlink()
    return {"status": "deleted"}
```

**Step 4: Verify server starts**

Run:
```bash
cd /root/scripts/feature-tracker/src/api
source /root/scripts/feature-tracker/.venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload &
sleep 2
curl http://localhost:8000/projects
```

Expected: `[]` (empty list)

**Step 5: Stop server and commit**

```bash
pkill -f "uvicorn main:app"
```

---

### Task 2: Create API Client

**Files:**
- Create: `src/feature-tracker/src/typescript/api.ts`

**Step 1: Create API client**

```typescript
const API_BASE = "http://localhost:8000";

export interface NodeAttribute {
  key: string;
  value: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  id: string;
  label: string;
  name: string;
  attributes: NodeAttribute[];
  position: NodePosition;
}

export interface ConnectionData {
  sourceId: string;
  sourceOutput: string;
  targetId: string;
  targetInput: string;
}

export interface ProjectData {
  name: string;
  nodes: NodeData[];
  connections: ConnectionData[];
}

export async function listProjects(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Failed to list projects");
  return res.json();
}

export async function loadProject(name: string): Promise<ProjectData> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Failed to load project: ${name}`);
  return res.json();
}

export async function saveProject(name: string, data: ProjectData): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save project: ${name}`);
}

export async function deleteProject(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete project: ${name}`);
}
```

---

### Task 3: Add Export/Import to Editor

**Files:**
- Modify: `src/feature-tracker/src/typescript/basic.ts`

**Step 1: Add ProjectData import and update EditorController type**

At top of file, add import:
```typescript
import type { ProjectData, NodeData, ConnectionData } from "./api";
```

Update `EditorController` type to add:
```typescript
export type EditorController = {
  addNode: () => Promise<void>;
  onNodeClick: (cb: (node: FeatureNode) => void) => void;
  onCanvasClick: (cb: () => void) => void;
  exportState: () => Promise<ProjectData>;
  importState: (data: ProjectData) => Promise<void>;
  clear: () => Promise<void>;
  destroy: () => void;
};
```

**Step 2: Add exportState function inside createEditor**

Add before the `return` statement:
```typescript
async function exportState(): Promise<ProjectData> {
  const nodes: NodeData[] = [];
  for (const node of editor.getNodes()) {
    const view = area.nodeViews.get(node.id);
    const position = view ? { x: view.position.x, y: view.position.y } : { x: 0, y: 0 };
    nodes.push({
      id: node.id,
      label: node.label,
      name: node.name,
      attributes: [...node.attributes],
      position,
    });
  }

  const connections: ConnectionData[] = [];
  for (const conn of editor.getConnections()) {
    connections.push({
      sourceId: conn.source,
      sourceOutput: conn.sourceOutput,
      targetId: conn.target,
      targetInput: conn.targetInput,
    });
  }

  return { name: "", nodes, connections };
}
```

**Step 3: Add clear and importState functions inside createEditor**

Add after exportState:
```typescript
async function clear() {
  for (const conn of editor.getConnections()) {
    await editor.removeConnection(conn.id);
  }
  for (const node of editor.getNodes()) {
    await editor.removeNode(node.id);
  }
  count = 0;
}

async function importState(data: ProjectData) {
  await clear();

  const idMap = new Map<string, string>();

  for (const nodeData of data.nodes) {
    const node = new FeatureNode(nodeData.name);
    node.label = nodeData.label;
    node.attributes = [...nodeData.attributes];
    node.addInput("in", new ClassicPreset.Input(socket));
    node.addOutput("out", new ClassicPreset.Output(socket));
    node.addControl("text", new ClassicPreset.InputControl("text", { initial: "" }));

    await editor.addNode(node);
    await area.translate(node.id, nodeData.position);
    idMap.set(nodeData.id, node.id);
  }

  for (const connData of data.connections) {
    const sourceId = idMap.get(connData.sourceId);
    const targetId = idMap.get(connData.targetId);
    if (sourceId && targetId) {
      const source = editor.getNode(sourceId);
      const target = editor.getNode(targetId);
      if (source && target) {
        const conn = new Connection(source, connData.sourceOutput, target, connData.targetInput);
        await editor.addConnection(conn);
      }
    }
  }

  if (editor.getNodes().length > 0) {
    AreaExtensions.zoomAt(area, editor.getNodes());
  }

  count = data.nodes.length;
}
```

**Step 4: Update the return statement**

```typescript
return {
  addNode,
  onNodeClick(cb) {
    nodeClickHandler = cb;
  },
  onCanvasClick(cb) {
    canvasClickHandler = cb;
  },
  exportState,
  importState,
  clear,
  destroy() {
    nodeClickHandler = null;
    canvasClickHandler = null;
    area.destroy();
  }
};
```

---

### Task 4: Update App.vue with Project Management UI

**Files:**
- Modify: `src/feature-tracker/src/App.vue`

**Step 1: Update template**

Replace the template section:
```vue
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
```

**Step 2: Update script section**

Replace the entire script section:
```vue
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
```

**Step 3: Update styles**

Add to the style section:
```css
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
```

---

### Task 5: Test End-to-End

**Step 1: Start the API server**

```bash
cd /root/scripts/feature-tracker/src/api
source /root/scripts/feature-tracker/.venv/bin/activate
uvicorn main:app --reload
```

**Step 2: Start the frontend dev server (new terminal)**

```bash
cd /root/scripts/feature-tracker/src/feature-tracker
npm run dev
```

**Step 3: Manual verification checklist**

Open http://localhost:5173 and verify:
- [ ] Dropdown shows "-- Select Project --"
- [ ] Click "New" → enter "test-project" → project created
- [ ] Dropdown now shows "test-project"
- [ ] Click "Add Feature" → add 2-3 nodes
- [ ] Connect nodes together
- [ ] Click on a node → edit name and add attributes
- [ ] Click "Save" → status shows "Saved: test-project"
- [ ] Refresh browser → select "test-project" → all state restored
- [ ] Click "Delete" → confirm → project removed

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create FastAPI backend | src/api/main.py, requirements.txt, data/.gitkeep |
| 2 | Create API client | src/feature-tracker/src/typescript/api.ts |
| 3 | Add export/import to editor | src/feature-tracker/src/typescript/basic.ts |
| 4 | Update App.vue with UI | src/feature-tracker/src/App.vue |
| 5 | End-to-end testing | Manual verification |

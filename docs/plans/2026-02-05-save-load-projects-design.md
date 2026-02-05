# Save/Load Projects Design

## Overview

Add ability to save feature tracker projects to a FastAPI backend server and reload them with full state (nodes, positions, connections, attributes).

## Data Model

```typescript
interface ProjectData {
  name: string;
  nodes: {
    id: string;
    label: string;
    name: string;
    attributes: { key: string; value: string }[];
    position: { x: number; y: number };
  }[];
  connections: {
    sourceId: string;
    sourceOutput: string;
    targetId: string;
    targetInput: string;
  }[];
}
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all project names |
| GET | `/projects/{name}` | Load project by name |
| PUT | `/projects/{name}` | Save/update project |
| DELETE | `/projects/{name}` | Delete project |

Storage: JSON files in `src/api/data/{name}.json`

## Backend (FastAPI)

**Location:** `src/api/`

**Files:**
- `main.py` - FastAPI app with endpoints
- `requirements.txt` - fastapi, uvicorn
- `data/` - project storage directory

**Details:**
- Port 8000
- CORS enabled for localhost:5173
- Project names sanitized (alphanumeric, hyphens, underscores)
- No authentication (local tool)

## Frontend Changes

**New file:** `src/typescript/api.ts`
- `listProjects()` - GET /projects
- `loadProject(name)` - GET /projects/{name}
- `saveProject(name, data)` - PUT /projects/{name}
- `deleteProject(name)` - DELETE /projects/{name}

**Modify:** `src/typescript/basic.ts`
- `exportState()` - serialize editor to ProjectData
- `importState(data)` - restore editor from ProjectData

**Modify:** `src/App.vue`
- Add toolbar: dropdown + New/Save/Delete buttons
- Wire up project selection and save/load flow

## UI

```
[Dropdown: Select Project] [New] [Save] [Delete] | [Add Feature]
```

## State Flow

1. App mount → fetch project list → populate dropdown
2. Select project → loadProject() → editor.importState()
3. Click Save → editor.exportState() → saveProject()
4. Click New → prompt name → create empty project
5. Click Delete → confirm → deleteProject()

## Files Summary

**Create:**
- `src/api/main.py`
- `src/api/requirements.txt`
- `src/api/data/.gitkeep`
- `src/feature-tracker/src/typescript/api.ts`

**Modify:**
- `src/feature-tracker/src/typescript/basic.ts`
- `src/feature-tracker/src/App.vue`

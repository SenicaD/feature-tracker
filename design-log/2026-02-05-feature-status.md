# Feature Status Design

## Background
The feature tracker currently supports nodes, attributes, and project save/load. There is no notion of per-feature status or a global status palette. Users need a way to define status categories with colors and mark each feature accordingly, with a visible indicator on the canvas.

## Problem
- No project-level list of statuses (name + color).
- Nodes cannot store or display a status.
- Visual feedback on the canvas is missing.

## Questions and Answers
- Q: Should status names be unique? A: Yes, enforced.
- Q: Accept arbitrary colors? A: Use a fixed complementary palette of rainbow-ish colors; user selects from it.
- Q: Default statuses? A: Yes — `Implemented`, `Intended`, `Aspirational`.

## Design
### Data Model
```typescript
// Shared
interface StatusDef { id: string; name: string; color: string; }
interface ProjectData {
  name: string;
  statuses: StatusDef[];              // defaults injected if missing
  nodes: {
    id: string;
    label: string;
    name: string;
    statusId?: string | null;         // optional for backward compat
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
- Status IDs are stable UUID-ish strings; names must be unique within a project.
- Colors must come from a predefined palette: `[#EF4444, #F59E0B, #10B981, #3B82F6, #A855F7, #EC4899]` (red, amber, green, blue, purple, pink) matching the dark UI.

### Backend (FastAPI)
- Extend Pydantic models with `StatusDef` and optional `statusId` on nodes.
- On read: if `statuses` missing, inject defaults; ensure node `statusId` cleared if it references a missing status.
- On save: validate unique status names, allowed colors, and `statusId` validity; reject bad input with 400.
- Storage remains JSON; write atomically.

### Frontend (Vue + Rete)
- Extend API client types with `StatusDef` and `statusId`.
- Export/import in `basic.ts` carries `statusId`; when importing, apply a `--status-color` CSS var + class on node elements via `area.nodeViews`.
- Add status selector to NodeDetails: dropdown of statuses + “Unset” option; updating immediately re-renders the node indicator.
- Add a Status Manager panel (toggled from toolbar): list statuses with color dots, add new (name + palette select), remove existing, enforce unique names.
- Defaults applied on new project creation and shown in manager.

### UI
- Toolbar: add `Manage Statuses` toggle button.
- Status Manager panel: simple card under toolbar; shows existing statuses and add form.
- Node indicator: small colored dot in the node’s top-right corner (`position: absolute; right: 6px; top: 6px; border: 2px solid #1e1e1e; width/height 12px; border-radius: 50%`). Visible only when a status is set.

## Implementation Plan
1. Backend
   - Update models in `src/api/main.py` for `StatusDef`, `statusId` (optional), validation helpers, default statuses, and atomic writes.
   - Backward compatibility shim on load for missing statuses.
2. Frontend types
   - Update `src/feature-tracker/src/typescript/api.ts` with `StatusDef`, `statusId`, and default palette export.
3. Editor state
   - `basic.ts`: include `statusId` in export/import; add `applyStatusStyle(node)` that sets `--status-color` + `has-status` class on node view; call after import and after status changes.
4. UI
   - Add Status Manager panel in `App.vue` with add/remove and palette select.
   - Pass statuses/status update handlers to `NodeDetails` and add status dropdown.
   - Initialize new projects with default statuses.
5. Styling
   - Add CSS for status dot on nodes (`.rete .node.has-status::after { ... }`).
   - Style the manager panel to match existing dark theme.
6. Verify
   - Run `npm run build` (frontend).
   - (Optional/manual) start API and ensure save/load preserves statuses.

## Examples
- New project default statuses:
```json
{
  "name": "demo",
  "statuses": [
    {"id":"impl","name":"Implemented","color":"#10B981"},
    {"id":"intended","name":"Intended","color":"#3B82F6"},
    {"id":"aspire","name":"Aspirational","color":"#A855F7"}
  ],
  "nodes": [],
  "connections": []
}
```
- Node with status reference:
```json
{"id":"n1","name":"Auth","label":"Auth","statusId":"impl",...}
```

## Trade-offs
- Using a fixed palette simplifies validation and UI but limits flexibility; can relax later to freeform colors.
- Status stored per project keeps autonomy but duplicates palettes across projects; acceptable for current scope.
- DOM patching via `nodeViews` is simple but tied to Rete’s classic template; a custom renderer would offer more control if design evolves.

## Implementation Notes (2026-02-05)
- Status name uniqueness is enforced case-insensitively on the backend to match the UI check.
- Removing a status clears that status from all nodes before saving.
- The status dot is drawn via `.rete .node.has-status::after` using `--status-color`; missing/invalid status IDs are nulled when statuses update.
- Frontend styling now uses Tailwind (via CDN) with a shadcn-inspired dark palette; legacy CSS removed in favor of utility classes.

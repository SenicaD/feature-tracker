const API_BASE = "http://localhost:8000";

export interface StatusDef {
  id: string;
  name: string;
  color: string;
}

export interface ProjectDef {
  id: string;
  name: string;
  color: string;
}

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
  statusId?: string | null;
  projectId?: string | null;
  notes?: string;
  tags?: string[];
  attributes: NodeAttribute[];
  position: NodePosition;
}

export interface ConnectionData {
  id?: string;
  sourceId: string;
  sourceOutput: string;
  targetId: string;
  targetInput: string;
  pins?: NodePosition[];
}

export interface ProjectData {
  name: string;
  statuses: StatusDef[];
  featureProjects: ProjectDef[];
  nodes: NodeData[];
  connections: ConnectionData[];
}

export const STATUS_PALETTE = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#A855F7",
  "#EC4899",
];

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

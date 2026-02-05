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

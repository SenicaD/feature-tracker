import { NodeEditor, type GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import { ConnectionPlugin, Presets as ConnectionPresets } from "rete-connection-plugin";
import { VuePlugin, Presets, type VueArea2D } from "rete-vue-plugin";
import { getDOMSocketPosition } from "rete-render-utils";
import { AutoArrangePlugin, Presets as ArrangePresets, ArrangeAppliers } from "rete-auto-arrange-plugin";
import type { ProjectData, NodeData, ConnectionData, StatusDef, ProjectDef } from "./api";
import CustomNode from "../components/CustomNode.vue";

export type NodeAttribute = {
  key: string;
  value: string;
};

export class FeatureNode extends ClassicPreset.Node {
  width = 180;
  height = 160;
  name: string;
  attributes: NodeAttribute[] = [];
  statusId: string | null = null;
  projectId: string | null = null;

  constructor(label: string) {
    super(label);
    this.name = label;
  }
}

class Connection<N extends FeatureNode> extends ClassicPreset.Connection<N, N> {}

type Schemes = GetSchemes<FeatureNode, Connection<FeatureNode>>;
type AreaExtra = VueArea2D<Schemes>;

export type EditorController = {
  addNode: () => Promise<void>;
  onNodeClick: (cb: (node: FeatureNode) => void) => void;
  onCanvasClick: (cb: () => void) => void;
  setStatuses: (statuses: StatusDef[]) => void;
  setNodeStatus: (nodeId: string, statusId: string | null) => void;
  setProjects: (projects: ProjectDef[]) => void;
  setNodeProject: (nodeId: string, projectId: string | null) => void;
  setFocusProject: (projectId: string | null) => void;
  getNodes: () => FeatureNode[];
  layout: (animate?: boolean) => Promise<void>;
  exportState: () => Promise<ProjectData>;
  importState: (data: ProjectData) => Promise<void>;
  clear: () => Promise<void>;
  destroy: () => void;
};

export async function createEditor(
  container: HTMLElement
): Promise<EditorController> {
  const socket = new ClassicPreset.Socket("socket");

  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new VuePlugin<Schemes, AreaExtra>();
  const arrange = new AutoArrangePlugin<Schemes>();

  render.addPreset(
    Presets.classic.setup({
      customize: {
        node() {
          return CustomNode;
        }
      },
      socketPositionWatcher: getDOMSocketPosition({
        offset({ x, y }, _nodeId, side) {
          return {
            x: x + 8 * (side === "input" ? -1 : 1),
            y
          };
        }
      })
    })
  );
  connection.addPreset(ConnectionPresets.classic.setup());
  arrange.addPreset(ArrangePresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);
  area.use(arrange);

  const applier = new ArrangeAppliers.TransitionApplier<Schemes, never>({
    duration: 500,
    timingFunction: (t) => t,
    async onTick() {
      await AreaExtensions.zoomAt(area, editor.getNodes());
    }
  });

  let statuses: StatusDef[] = [];
  const statusIds = () => new Set(statuses.map((s) => s.id));
  let featureProjects: ProjectDef[] = [];
  const projectIds = () => new Set(featureProjects.map((p) => p.id));
  let focusProjectId: string | null = null;

  function hexToRgba(hex: string, alpha: number) {
    const value = hex.replace("#", "");
    if (value.length !== 6) return "";
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function applyStatusStyle(nodeId: string, statusId: string | null) {
    const view = area.nodeViews.get(nodeId);
    if (!view) return;
    const el = view.element as HTMLElement;
    const status = statuses.find((s) => s.id === statusId);
    if (status) {
      el.classList.add("has-status");
      el.style.setProperty("--status-color", status.color);
    } else {
      el.classList.remove("has-status");
      el.style.removeProperty("--status-color");
    }
  }

  function setStatuses(newStatuses: StatusDef[]) {
    statuses = newStatuses;
    const allowed = statusIds();
    // Re-apply to all nodes
    for (const node of editor.getNodes() as FeatureNode[]) {
      if (node.statusId && !allowed.has(node.statusId)) {
        node.statusId = null;
      }
      applyStatusStyle(node.id, node.statusId);
    }
  }

  function applyProjectStyle(nodeId: string, projectId: string | null) {
    const view = area.nodeViews.get(nodeId);
    if (!view) return;
    const el = view.element as HTMLElement;
    const project = featureProjects.find((p) => p.id === projectId);
    if (project) {
      el.classList.add("has-project");
      el.style.setProperty("--project-color", project.color);
      const tint = hexToRgba(project.color, 0.2);
      if (tint) {
        el.style.setProperty("--node-bg", tint);
      }
      el.style.setProperty("--node-border", project.color);
    } else {
      el.classList.remove("has-project");
      el.style.removeProperty("--project-color");
      el.style.removeProperty("--node-bg");
      el.style.removeProperty("--node-border");
    }
  }

  function applyFocusStyle(nodeId: string, projectId: string | null) {
    const view = area.nodeViews.get(nodeId);
    if (!view) return;
    const el = view.element as HTMLElement;
    if (!focusProjectId) {
      el.classList.remove("is-dim");
      el.style.removeProperty("opacity");
      el.style.removeProperty("filter");
      return;
    }
    if (projectId !== focusProjectId) {
      el.classList.add("is-dim");
      el.style.opacity = "0.3";
      el.style.filter = "saturate(0.6)";
    } else {
      el.classList.remove("is-dim");
      el.style.removeProperty("opacity");
      el.style.removeProperty("filter");
    }
  }

  function setProjects(newProjects: ProjectDef[]) {
    featureProjects = newProjects;
    const allowed = projectIds();
    for (const node of editor.getNodes() as FeatureNode[]) {
      if (node.projectId && !allowed.has(node.projectId)) {
        node.projectId = null;
      }
      applyProjectStyle(node.id, node.projectId);
      applyFocusStyle(node.id, node.projectId);
    }
  }

  function setNodeStatus(nodeId: string, statusId: string | null) {
    const node = editor.getNode(nodeId) as FeatureNode | undefined;
    if (!node) return;
    const allowed = statusIds();
    node.statusId = statusId && allowed.has(statusId) ? statusId : null;
    applyStatusStyle(node.id, node.statusId);
  }

  function setNodeProject(nodeId: string, projectId: string | null) {
    const node = editor.getNode(nodeId) as FeatureNode | undefined;
    if (!node) return;
    const allowed = projectIds();
    node.projectId = projectId && allowed.has(projectId) ? projectId : null;
    applyProjectStyle(node.id, node.projectId);
    applyFocusStyle(node.id, node.projectId);
  }

  function setFocusProject(projectId: string | null) {
    focusProjectId = projectId;
    for (const node of editor.getNodes() as FeatureNode[]) {
      applyFocusStyle(node.id, node.projectId);
    }
  }

  AreaExtensions.selectableNodes(
    area,
    AreaExtensions.selector(),
    {
      accumulating: AreaExtensions.accumulateOnCtrl()
    }
  );

  AreaExtensions.simpleNodesOrder(area);


  // -----------------------------
  // CLICK HANDLING
  // -----------------------------
  let nodeClickHandler: ((node: FeatureNode) => void) | null = null;
  let canvasClickHandler: (() => void) | null = null;

  area.addPipe((context) => {
    if (context.type === "nodepicked") {
      const node = editor.getNode(context.data.id);
      if (node && nodeClickHandler) {
        nodeClickHandler(node);
      }
    }
    if (context.type === "pointerdown") {
      const target = context.data.event.target as HTMLElement;
      if (target.classList.contains("area")) {
        canvasClickHandler?.();
      }
    }
    return context;
  });

  // -----------------------------
  // NODE CREATION
  // -----------------------------
  let count = 0;

  async function addNode() {
    count++;

    const node = new FeatureNode(`Feature ${count}`);
    node.addInput("in", new ClassicPreset.Input(socket));
    node.addOutput("out", new ClassicPreset.Output(socket));
    node.addControl(
      "text",
      new ClassicPreset.InputControl("text", { initial: "hello" })
    );

    await editor.addNode(node);
    await area.translate(node.id, { x: 100 + count * 40, y: 100 });
    applyStatusStyle(node.id, null);
    applyProjectStyle(node.id, null);
    applyFocusStyle(node.id, null);
  }

  // Seed one node
  await addNode();
  AreaExtensions.zoomAt(area, editor.getNodes());

  async function exportState(): Promise<ProjectData> {
    const nodes: NodeData[] = [];
    for (const node of editor.getNodes()) {
      const view = area.nodeViews.get(node.id);
      const position = view ? { x: view.position.x, y: view.position.y } : { x: 0, y: 0 };
      nodes.push({
        id: node.id,
        label: node.label,
        name: node.name,
        statusId: node.statusId ?? null,
        projectId: node.projectId ?? null,
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

    return { name: "", statuses, featureProjects, nodes, connections } as ProjectData;
  }

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

    const incomingStatuses = data.statuses ?? [];
    const incomingProjects = data.featureProjects ?? [];
    setStatuses(incomingStatuses);
    setProjects(incomingProjects);

    const idMap = new Map<string, string>();

    for (const nodeData of data.nodes) {
      const node = new FeatureNode(nodeData.name);
      node.label = nodeData.label;
      node.attributes = [...nodeData.attributes];
      node.statusId = nodeData.statusId ?? null;
      node.projectId = nodeData.projectId ?? null;
      node.addInput("in", new ClassicPreset.Input(socket));
      node.addOutput("out", new ClassicPreset.Output(socket));
      node.addControl("text", new ClassicPreset.InputControl("text", { initial: "" }));

      await editor.addNode(node);
      await area.translate(node.id, nodeData.position);
      applyStatusStyle(node.id, node.statusId);
      applyProjectStyle(node.id, node.projectId);
      applyFocusStyle(node.id, node.projectId);
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

    // Re-run to clear any orphaned assignments now that nodes exist
    setStatuses(statuses);
    setProjects(featureProjects);
    setFocusProject(focusProjectId);

    if (editor.getNodes().length > 0) {
      AreaExtensions.zoomAt(area, editor.getNodes());
    }

    count = data.nodes.length;
  }

  async function layout(animate = true) {
    await arrange.layout({ applier: animate ? applier : undefined });
    AreaExtensions.zoomAt(area, editor.getNodes());
  }

  return {
    addNode,
    onNodeClick(cb) {
      nodeClickHandler = cb;
    },
    onCanvasClick(cb) {
      canvasClickHandler = cb;
    },
    setStatuses,
    setNodeStatus,
    setProjects,
    setNodeProject,
    setFocusProject,
    getNodes() {
      return editor.getNodes() as FeatureNode[];
    },
    layout,
    exportState,
    importState,
    clear,
    destroy() {
      nodeClickHandler = null;
      canvasClickHandler = null;
      area.destroy();
    }
  };
}

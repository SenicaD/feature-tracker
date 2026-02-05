import { NodeEditor, type GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import { ConnectionPlugin, Presets as ConnectionPresets, type SocketData } from "rete-connection-plugin";
import { ReroutePlugin, RerouteExtensions, type RerouteExtra } from "rete-connection-reroute-plugin";
import { VuePlugin, Presets, type VueArea2D } from "rete-vue-plugin";
import { getDOMSocketPosition } from "rete-render-utils";
import { AutoArrangePlugin, Presets as ArrangePresets, ArrangeAppliers } from "rete-auto-arrange-plugin";
import type { ProjectData, NodeData, ConnectionData, StatusDef, ProjectDef } from "./api";
import CustomNode from "../components/CustomNode.vue";
import SelectableConnection from "../components/SelectableConnection.vue";

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
  notes = "";
  tags: string[] = [];

  constructor(label: string) {
    super(label);
    this.name = label;
  }
}

class Connection<N extends FeatureNode> extends ClassicPreset.Connection<N, N> {
  selected?: boolean;
}

type Schemes = GetSchemes<FeatureNode, Connection<FeatureNode>>;
type AreaExtra = VueArea2D<Schemes> | RerouteExtra;

export type EditorController = {
  addNode: () => Promise<void>;
  onNodeClick: (cb: (node: FeatureNode) => void) => void;
  onCanvasClick: (cb: () => void) => void;
  setStatuses: (statuses: StatusDef[]) => void;
  setNodeStatus: (nodeId: string, statusId: string | null) => void;
  setProjects: (projects: ProjectDef[]) => void;
  setNodeProject: (nodeId: string, projectId: string | null) => void;
  setNodeTags: (nodeId: string, tags: string[]) => void;
  setFocusFilters: (filters: FocusFilters) => void;
  getNodes: () => FeatureNode[];
  layout: (animate?: boolean) => Promise<void>;
  exportState: () => Promise<ProjectData>;
  importState: (data: ProjectData) => Promise<void>;
  clear: () => Promise<void>;
  destroy: () => void;
};

export type FocusFilters = {
  projects: string[];
  tags: string[];
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
  const reroute = new ReroutePlugin<Schemes>();

  const selector = AreaExtensions.selector();
  const accumulating = AreaExtensions.accumulateOnCtrl();

  RerouteExtensions.selectablePins(reroute, selector, accumulating);

  render.use(reroute);

  render.addPreset(
    Presets.reroute.setup({
      pointerdown(id) {
        reroute.unselect(id);
        reroute.select(id);
      },
      contextMenu(id) {
        reroute.remove(id);
      },
      translate(id, dx, dy) {
        reroute.translate(id, dx, dy);
      }
    })
  );

  render.addPreset(
    Presets.classic.setup({
      customize: {
        node() {
          return CustomNode;
        },
        connection() {
          return SelectableConnection;
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
  let focusProjectIds = new Set<string>();
  let focusTags: string[] = [];

  function hexToRgba(hex: string, alpha: number) {
    const value = hex.replace("#", "");
    if (value.length !== 6) return "";
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getNodeElement(nodeId: string) {
    const view = area.nodeViews.get(nodeId);
    if (!view) return null;
    const wrapper = view.element as HTMLElement;
    return (wrapper.querySelector(".node") as HTMLElement | null) ?? wrapper;
  }

  function applyStatusStyle(nodeId: string, statusId: string | null) {
    const el = getNodeElement(nodeId);
    if (!el) return;
    const status = statuses.find((s) => s.id === statusId);
    if (status) {
      el.style.setProperty("--status-color", status.color);
      el.style.setProperty("--status-opacity", "1");
    } else {
      el.style.removeProperty("--status-color");
      el.style.setProperty("--status-opacity", "0");
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
    const el = getNodeElement(nodeId);
    if (!el) return;
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

  function applyFocusStyle(node: FeatureNode) {
    const el = getNodeElement(node.id);
    if (!el) return;
    const hasFilters = focusProjectIds.size > 0 || focusTags.length > 0;
    if (!hasFilters) {
      el.classList.remove("is-dim");
      el.style.removeProperty("opacity");
      el.style.removeProperty("filter");
      return;
    }
    const projectMatch = node.projectId ? focusProjectIds.has(node.projectId) : false;
    const nodeTags = (node.tags ?? []).map((tag) => tag.toLowerCase());
    const tagMatch = focusTags.some((tag) => nodeTags.includes(tag));
    if (!(projectMatch || tagMatch)) {
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
      applyFocusStyle(node);
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
    applyFocusStyle(node);
  }

  function setNodeTags(nodeId: string, tags: string[]) {
    const node = editor.getNode(nodeId) as FeatureNode | undefined;
    if (!node) return;
    node.tags = tags;
    applyFocusStyle(node);
  }

  function setFocusFilters(filters: FocusFilters) {
    focusProjectIds = new Set(filters.projects ?? []);
    focusTags = (filters.tags ?? []).map((tag) => tag.toLowerCase());
    for (const node of editor.getNodes() as FeatureNode[]) {
      applyFocusStyle(node);
    }
  }

  let lastPointerEvent: PointerEvent | null = null;
  const magneticRadius = 28;
  const magneticSockets = new Map<HTMLElement, SocketData>();

  function getFallbackSockets(): Array<{ element: HTMLElement; data: SocketData }> {
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-socket-node][data-socket-key][data-socket-side]"
      )
    );
    return elements
      .map((element) => {
        const nodeId = element.dataset.socketNode;
        const key = element.dataset.socketKey;
        const side = element.dataset.socketSide as "input" | "output" | undefined;
        if (!nodeId || !key || (side !== "input" && side !== "output")) return null;
        const data: SocketData = {
          element,
          type: "socket",
          nodeId,
          side,
          key
        };
        return { element, data };
      })
      .filter((item): item is { element: HTMLElement; data: SocketData } => Boolean(item));
  }

  function findNearestSocket(
    clientX: number,
    clientY: number,
    initial: SocketData
  ): { element: HTMLElement; data: SocketData } | null {
    let nearest: { element: HTMLElement; data: SocketData } | null = null;
    let minDistance = magneticRadius;
    const sockets =
      magneticSockets.size > 0
        ? Array.from(magneticSockets.entries()).map(([element, data]) => ({ element, data }))
        : getFallbackSockets();

    for (const { element, data: socket } of sockets) {
      if (!element.isConnected) continue;
      if (
        socket.nodeId === initial.nodeId &&
        socket.key === initial.key &&
        socket.side === initial.side
      ) {
        continue;
      }
      if (socket.side === initial.side) continue;
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = centerX - clientX;
      const dy = centerY - clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= minDistance) {
        minDistance = distance;
        nearest = { element, data: socket };
      }
    }
    return nearest;
  }

  async function enforceConnectionLimits(
    source: FeatureNode,
    sourceKey: string,
    target: FeatureNode,
    targetKey: string
  ) {
    const output = source.outputs[sourceKey];
    const input = target.inputs[targetKey];
    if (output && output.multipleConnections === false) {
      for (const conn of editor.getConnections()) {
        if (conn.source === source.id && conn.sourceOutput === sourceKey) {
          await editor.removeConnection(conn.id);
        }
      }
    }
    if (input && input.multipleConnections !== true) {
      for (const conn of editor.getConnections()) {
        if (conn.target === target.id && conn.targetInput === targetKey) {
          await editor.removeConnection(conn.id);
        }
      }
    }
  }

  async function tryMagneticConnection(initial: SocketData) {
    if (!lastPointerEvent) return;
    const nearest = findNearestSocket(
      lastPointerEvent.clientX,
      lastPointerEvent.clientY,
      initial
    );
    if (!nearest) return;
    const from = initial;
    const to = nearest.data;
    if (from.side === to.side) return;
    const [source, target] = from.side === "output" ? [from, to] : [to, from];
    const sourceNode = editor.getNode(source.nodeId) as FeatureNode | undefined;
    const targetNode = editor.getNode(target.nodeId) as FeatureNode | undefined;
    if (!sourceNode || !targetNode) return;
    await enforceConnectionLimits(sourceNode, source.key, targetNode, target.key);
    await editor.addConnection(
      new Connection(sourceNode, source.key as never, targetNode, target.key as never)
    );
  }

  function findConnectionHit(event: PointerEvent) {
    const path = event.composedPath();
    for (const [id, view] of area.connectionViews.entries()) {
      if (path.includes(view.element)) {
        return id;
      }
    }
    return null;
  }

  AreaExtensions.selectableNodes(area, selector, { accumulating });

  AreaExtensions.simpleNodesOrder(area);

  const recordPointerEvent = (event: PointerEvent) => {
    lastPointerEvent = event;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pointermove", recordPointerEvent);
    window.addEventListener("pointerup", recordPointerEvent);
  }

  connection.addPipe(async (context) => {
    if (context.type === "render" && context.data.type === "socket") {
      magneticSockets.set(context.data.element, context.data);
    }
    if (context.type === "unmount") {
      magneticSockets.delete(context.data.element);
    }
    if (context.type === "connectiondrop") {
      const { socket, created, initial } = context.data;
      if (!socket && !created) {
        await tryMagneticConnection(initial);
      }
    }
    return context;
  });

  const handleDelete = async (event: KeyboardEvent) => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return;
    }

    let removed = false;
    const pins = reroute.pins.getPins();
    for (const pin of pins) {
      if (pin.selected) {
        await reroute.remove(pin.id);
        removed = true;
      }
    }

    for (const conn of editor.getConnections() as Connection[]) {
      if (conn.selected) {
        await editor.removeConnection(conn.id);
        await selector.remove({ id: conn.id, label: "connection" });
        removed = true;
      }
    }

    if (removed) {
      event.preventDefault();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleDelete);
  }

  // -----------------------------
  // CLICK HANDLING
  // -----------------------------
  let nodeClickHandler: ((node: FeatureNode) => void) | null = null;
  let canvasClickHandler: (() => void) | null = null;

  area.addPipe((context) => {
    if (context.type === "pointermove" || context.type === "pointerup") {
      lastPointerEvent = context.data.event;
    }
    if (context.type === "nodepicked") {
      const node = editor.getNode(context.data.id);
      if (node && nodeClickHandler) {
        nodeClickHandler(node);
      }
    }
    if (context.type === "pointerdown") {
      const event = context.data.event;
      lastPointerEvent = event;
      const connectionId = findConnectionHit(event);
      if (connectionId) {
        const connectionItem = editor.getConnection(connectionId) as Connection | undefined;
        if (connectionItem) {
          selector.add(
            {
              id: connectionId,
              label: "connection",
              translate() {},
              unselect() {
                connectionItem.selected = false;
                area.update("connection", connectionId);
              }
            },
            accumulating.active()
          );
          connectionItem.selected = true;
          area.update("connection", connectionId);
        }
      }
      const target = event.target as HTMLElement;
      const path = event.composedPath();
      const inFilterMenu = path.some((entry) => {
        if (!(entry instanceof HTMLElement)) return false;
        return entry.hasAttribute("data-filter-menu") || entry.hasAttribute("data-filter-button");
      });
      if (inFilterMenu || target.closest("[data-filter-menu]") || target.closest("[data-filter-button]")) {
        return context;
      }
      if (!target.closest(".node")) {
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
    applyFocusStyle(node);
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
        notes: node.notes ?? "",
        tags: [...(node.tags ?? [])],
        attributes: [...node.attributes],
        position,
      });
    }

    const connections: ConnectionData[] = [];
    for (const conn of editor.getConnections()) {
      connections.push({
        id: conn.id,
        sourceId: conn.source,
        sourceOutput: conn.sourceOutput,
        targetId: conn.target,
        targetInput: conn.targetInput,
        pins: reroute.pins.getPins(conn.id).map((pin) => ({
          x: pin.position.x,
          y: pin.position.y
        }))
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
      node.notes = nodeData.notes ?? "";
      node.tags = [...(nodeData.tags ?? [])];
      node.addInput("in", new ClassicPreset.Input(socket));
      node.addOutput("out", new ClassicPreset.Output(socket));
      node.addControl("text", new ClassicPreset.InputControl("text", { initial: "" }));

      await editor.addNode(node);
      await area.translate(node.id, nodeData.position);
      applyStatusStyle(node.id, node.statusId);
      applyProjectStyle(node.id, node.projectId);
      applyFocusStyle(node);
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
          if (connData.id) {
            conn.id = connData.id;
          }
          await editor.addConnection(conn);
          if (connData.pins?.length) {
            connData.pins.forEach((pin, index) => {
              reroute.add(conn.id, { x: pin.x, y: pin.y }, index);
            });
          }
        }
      }
    }

    // Re-run to clear any orphaned assignments now that nodes exist
    setStatuses(statuses);
    setProjects(featureProjects);
    setFocusFilters({ projects: Array.from(focusProjectIds), tags: focusTags });

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
    setNodeTags,
    setFocusFilters,
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
      if (typeof window !== "undefined") {
        window.removeEventListener("pointermove", recordPointerEvent);
        window.removeEventListener("pointerup", recordPointerEvent);
        window.removeEventListener("keydown", handleDelete);
      }
      area.destroy();
    }
  };
}

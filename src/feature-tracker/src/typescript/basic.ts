import { NodeEditor, type GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import { ConnectionPlugin, Presets as ConnectionPresets } from "rete-connection-plugin";
import { VuePlugin, Presets, type VueArea2D } from "rete-vue-plugin";
import type { ProjectData, NodeData, ConnectionData } from "./api";

export type NodeAttribute = {
  key: string;
  value: string;
};

export class FeatureNode extends ClassicPreset.Node {
  width = 180;
  name: string;
  attributes: NodeAttribute[] = [];

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

  render.addPreset(Presets.classic.setup());
  connection.addPreset(ConnectionPresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);

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
}

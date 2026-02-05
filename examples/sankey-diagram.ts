import { createRoot } from "react-dom/client";
import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import { ReactPlugin, Presets, ReactArea2D } from "rete-react-plugin";
import {
  AutoArrangePlugin,
  Presets as ArrangePresets
} from "rete-auto-arrange-plugin";
import * as SankeyComponents from "./sankey/components";
import { createSankeyRestrictor } from "./sankey/restrictor";
import { Node, Connection } from "./sankey/models";
import { importGraph } from "./sankey/import";
import { getSankeySocketPosition } from "./sankey/sockets-watcher";

type Conn = Connection<Node, Node>;
type Schemes = GetSchemes<Node, Conn>;
type AreaExtra = ReactArea2D<Schemes>;

export async function createEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl()
  });

  render.addPreset(
    Presets.classic.setup<Schemes, AreaExtra>({
      socketPositionWatcher: getSankeySocketPosition(),
      customize: {
        node() {
          return SankeyComponents.SankeyNode;
        },
        connection() {
          return SankeyComponents.SankeyConnection;
        },
        socket(data) {
          return SankeyComponents.SankeySocket;
        }
      }
    })
  );

  editor.use(area);
  area.use(render);

  AreaExtensions.simpleNodesOrder(area);

  await importGraph(editor);

  const restrictor = createSankeyRestrictor(area);

  const arrange = new AutoArrangePlugin<Schemes>();

  arrange.addPreset(ArrangePresets.classic.setup());

  area.use(arrange);

  await arrange.layout({ options: { "spacing.nodeNodeBetweenLayers": "200" } });

  restrictor.enable(); // should be enabled only after layout

  AreaExtensions.zoomAt(area, editor.getNodes());
  AreaExtensions.simpleNodesOrder(area);
  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl()
  });

  return {
    destroy: () => area.destroy()
  };
}

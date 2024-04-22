import {Injector} from "@angular/core";
import {NodeEditor, GetSchemes, ClassicPreset} from "rete";
import {AreaPlugin, AreaExtensions} from "rete-area-plugin";
import {
    ConnectionPlugin,
    Presets as ConnectionPresets
} from "rete-connection-plugin";
import {AngularPlugin, Presets, AngularArea2D} from "rete-angular-plugin/17";
import {PlanNode} from "./models/polyalg-plan.model";
import {ArrangeAppliers, AutoArrangePlugin, Presets as ArrangePresets} from "rete-auto-arrange-plugin";

class Node extends ClassicPreset.Node {
    width = 180;
    height = 120;

    constructor(props, numberOfInputs: number) {
        super(props);
        this.height += Math.max(numberOfInputs - 1, 0) * 50;

    }

}

class Connection<N extends Node> extends ClassicPreset.Connection<N, N> {
}

type Schemes = GetSchemes<Node, Connection<Node>>;
type AreaExtra = AngularArea2D<Schemes>;


export async function createEditor(container: HTMLElement, injector: Injector, node: PlanNode) {
    const socket = new ClassicPreset.Socket("socket");

    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, AreaExtra>(container);
    const connection = new ConnectionPlugin<Schemes, AreaExtra>();
    const render = new AngularPlugin<Schemes, AreaExtra>({injector});
    const arrange = new AutoArrangePlugin<Schemes>();

    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl()
    });

    render.addPreset(Presets.classic.setup());

    connection.addPreset(ConnectionPresets.classic.setup());

    const applier = new ArrangeAppliers.TransitionApplier<Schemes, never>({
        duration: 250,
        timingFunction: (t) => t,
        async onTick() {
            await AreaExtensions.zoomAt(area, editor.getNodes());
        }
    });

    arrange.addPreset(ArrangePresets.classic.setup());

    editor.use(area);
    area.use(connection);
    area.use(render);
    area.use(arrange);

    AreaExtensions.simpleNodesOrder(area);

    const [nodes, connections] = addNode(socket, node);
    for (const n of nodes) {
        await editor.addNode(n);
    }

    for (const c of connections) {
        await editor.addConnection(c);
    }

    await arrange.layout({applier});

    AreaExtensions.zoomAt(area, editor.getNodes());


    return () => area.destroy();
}

function addNode(socket: ClassicPreset.Socket, node: PlanNode): [Node[], Connection<Node>[]] {
    const nodes = []
    const connections = []
    const algNode = new Node(node.opName, node.inputs.length);
    algNode.addOutput("out", new ClassicPreset.Output(socket));
    algNode.addControl("asdf", new ClassicPreset.InputControl("text", {
        readonly: true,
        initial: JSON.stringify(node.arguments)
    }));

    for (let i = 0; i < node.inputs.length; i++) {
        const [childNodes, childConnections] = addNode(socket, node.inputs[i]);
        const childNode = childNodes[childNodes.length - 1];
        nodes.push(...childNodes);
        connections.push(...childConnections);

        algNode.addInput(i.toString(), new ClassicPreset.Input(socket));
        connections.push(new Connection(childNode, "out", algNode, i.toString()));
    }
    nodes.push(algNode);
    return [nodes, connections];
}

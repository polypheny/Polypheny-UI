import {Injector} from '@angular/core';
import {ClassicPreset, GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin} from 'rete-area-plugin';
import {ConnectionPlugin, Presets as ConnectionPresets} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/17';
import {PlanNode} from './models/polyalg-plan.model';
import {ArrangeAppliers, AutoArrangePlugin, Presets as ArrangePresets} from 'rete-auto-arrange-plugin';
import {AlgNode, AlgNodeComponent} from './algnode/alg-node.component';
import {addCustomBackground} from './algnode/background';
import {ArgControl} from './controls/arg-control';
import {getControl} from './controls/arg-control-utils';
import {CustomSocketComponent} from './custom-socket/custom-socket.component';
import {CustomConnection, CustomConnectionComponent} from './custom-connection/custom-connection.component';
import {ReadonlyPlugin} from 'rete-readonly-plugin';

type Schemes = GetSchemes<AlgNode, CustomConnection<AlgNode>>;
type AreaExtra = AngularArea2D<Schemes>;

export async function createEditor(container: HTMLElement, injector: Injector, node: PlanNode, readonly: boolean) {
    const readonlyPlugin = new ReadonlyPlugin<Schemes>();

    const socket = new ClassicPreset.Socket('socket');
    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, AreaExtra>(container);
    const connection = new ConnectionPlugin<Schemes, AreaExtra>();
    const render = new AngularPlugin<Schemes, AreaExtra>({injector});
    const arrange = new AutoArrangePlugin<Schemes>();

    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl()
    });

    render.addPreset(Presets.classic.setup({
        customize: {
            node() {
                return AlgNodeComponent;
            },
            control(data) {
                if (data.payload instanceof ArgControl) {
                    return data.payload.getArgComponent();
                }
                return null;
            },
            connection() {
                return CustomConnectionComponent;
            },
            socket() {
                return CustomSocketComponent;
            }
        }
    }));

    connection.addPreset(ConnectionPresets.classic.setup());

    const applier = new ArrangeAppliers.TransitionApplier<Schemes, never>({
        duration: 250,
        timingFunction: (t) => t,
        async onTick() {
            await AreaExtensions.zoomAt(area, editor.getNodes());
        }
    });
    arrange.addPreset(ArrangePresets.classic.setup());

    editor.use(readonlyPlugin.root);
    editor.use(area);
    area.use(readonlyPlugin.area);
    area.use(render);
    area.use(arrange);

    AreaExtensions.simpleNodesOrder(area);
    addCustomBackground(area);

    const [nodes, connections] = addNode(socket, node, readonly);
    for (const n of nodes) {
        await editor.addNode(n);
    }

    for (const c of connections) {
        await editor.addConnection(c);
    }

    await arrange.layout({applier, options: {'elk.direction': 'RIGHT', 'elk.alignment': 'RIGHT'}}); // https://github.com/retejs/rete/issues/697

    AreaExtensions.zoomAt(area, editor.getNodes());

    /*area.addPipe(context => {
        if (context.type === 'nodepicked') {
            const node = editor.getNode(context.data.id)
            console.log(node, "was selected");
        }
        return context
    })*/

    if (readonly) {
        readonlyPlugin.enable(); // disable interaction with nodes (control interaction is deactivated separately)
    } else {
        area.use(connection);  // make connections editable
    }


    return () => area.destroy();
}

function addNode(socket: ClassicPreset.Socket, node: PlanNode, readonly: boolean): [AlgNode[], CustomConnection<AlgNode>[]] {
    const nodes = [];
    const connections = [];
    const algNode = new AlgNode(node.opName, node.inputs.length);
    algNode.addOutput('out', new ClassicPreset.Output(socket));

    const heights = {};
    for (const [key, arg] of Object.entries(node.arguments)) {
        const c = getControl(key, arg, readonly);
        heights[key] = c.getHeight();
        algNode.addControl(key, c);
    }
    algNode.updateControlHeights(heights);

    for (let i = 0; i < node.inputs.length; i++) {
        const [childNodes, childConnections] = addNode(socket, node.inputs[i], readonly);
        const childNode = childNodes[childNodes.length - 1];
        nodes.push(...childNodes);
        connections.push(...childConnections);

        algNode.addInput(i.toString(), new ClassicPreset.Input(socket));
        connections.push(new CustomConnection(childNode, 'out', algNode, i.toString()));
    }
    nodes.push(algNode);
    return [nodes, connections];
}



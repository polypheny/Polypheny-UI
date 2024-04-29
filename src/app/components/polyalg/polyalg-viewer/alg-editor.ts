import {Injector} from '@angular/core';
import {ClassicPreset, GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin} from 'rete-area-plugin';
import {ConnectionPlugin, Presets as ConnectionPresets} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/17';
import {PlanNode} from '../models/polyalg-plan.model';
import {ArrangeAppliers, AutoArrangePlugin, Presets as ArrangePresets} from 'rete-auto-arrange-plugin';
import {AlgNode, AlgNodeComponent} from '../algnode/alg-node.component';
import {addCustomBackground} from '../algnode/background';
import {ArgControl} from '../controls/arg-control';
import {getControl} from '../controls/arg-control-utils';
import {CustomSocketComponent} from '../custom-socket/custom-socket.component';
import {CustomConnection, CustomConnectionComponent} from '../custom-connection/custom-connection.component';
import {ReadonlyPlugin} from 'rete-readonly-plugin';
import {ConnectionPathPlugin, Transformers} from 'rete-connection-path-plugin';
import {getDOMSocketPosition} from 'rete-render-utils';
import {ContextMenuExtra, ContextMenuPlugin, Presets as ContextMenuPresets} from 'rete-context-menu-plugin';
import {PolyAlgService} from '../polyalg.service';
import {Declaration} from '../models/polyalg-registry';
import {DataModel} from '../../../models/ui-request.model';

type Schemes = GetSchemes<AlgNode, CustomConnection<AlgNode>>;
type AreaExtra = AngularArea2D<Schemes> | ContextMenuExtra;

export async function createEditor(container: HTMLElement, injector: Injector, registry: PolyAlgService, node: PlanNode, isReadOnly: boolean) {
    const readonlyPlugin = new ReadonlyPlugin<Schemes>();

    const socket = new ClassicPreset.Socket('socket');
    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, AreaExtra>(container);
    const connection = new ConnectionPlugin<Schemes, AreaExtra>;
    const render = new AngularPlugin<Schemes, AreaExtra>({injector});
    const arrange = new AutoArrangePlugin<Schemes>();
    const pathPlugin = new ConnectionPathPlugin({
        transformer: () => (
            (p) => Transformers.classic({vertical: true})(p)
        )
    });
    const contextMenu = new ContextMenuPlugin<Schemes>({
        items: getContextMenuItems(registry, socket, isReadOnly, area)
    });

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
        },
        socketPositionWatcher: getDOMSocketPosition({
            offset({x, y}, nodeId, side, key) {
                return {x, y};
            },
        })
    }));
    render.addPreset(Presets.contextMenu.setup({delay: 250}));

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
    area.use(contextMenu);
    render.use(pathPlugin);

    AreaExtensions.simpleNodesOrder(area);
    addCustomBackground(area);

    const [nodes, connections] = addNode(socket, registry, node, isReadOnly, area);
    for (const n of nodes) {
        await editor.addNode(n);
    }

    for (const c of connections) {
        await editor.addConnection(c);
    }

    const layoutOpts = {
        'elk.algorithm': 'mrtree',
        'elk.mrtree.weighting': 'CONSTRAINT',
        'elk.spacing.edgeNode': '0',
        'elk.spacing.nodeNode': '50'
    };
    await arrange.layout({
        applier, options: layoutOpts
    }); // https://github.com/retejs/rete/issues/697

    AreaExtensions.zoomAt(area, editor.getNodes());

    /*area.addPipe(context => {
        if (context.type === 'nodepicked') {
            const node = editor.getNode(context.data.id)
            console.log(node, "was selected");
        }
        return context
    })*/

    if (isReadOnly) {
        readonlyPlugin.enable(); // disable interaction with nodes (control interaction is deactivated separately)
    } else {
        area.use(connection);  // make connections editable
    }


    return {
        layout: async () => {
            await arrange.layout({
                applier, options: layoutOpts
            });
            AreaExtensions.zoomAt(area, editor.getNodes());
        },
        destroy: () => area.destroy()
    };
}

function addNode(socket: ClassicPreset.Socket, registry: PolyAlgService, node: PlanNode, isReadOnly: boolean, area: AreaPlugin<Schemes, AreaExtra>): [AlgNode[], CustomConnection<AlgNode>[]] {
    const nodes = [];
    const connections = [];
    const algNode = new AlgNode(node.opName, node.inputs.length);
    algNode.addInput('top', new ClassicPreset.Input(socket));

    const heights = {};
    for (const [key, arg] of Object.entries(node.arguments)) {
        const param = registry.getParameter(node.opName, key);
        const c = getControl(param, arg, isReadOnly, (height: number) => {
            algNode.updateControlHeight(key, height);
            area.update('node', algNode.id).then();
        });
        heights[key] = c.getHeight();
        algNode.addControl(key, c);
    }
    algNode.updateControlHeights(heights);

    for (let i = 0; i < node.inputs.length; i++) {
        const [childNodes, childConnections] = addNode(socket, registry, node.inputs[i], isReadOnly, area);
        const childNode = childNodes[childNodes.length - 1];
        nodes.push(...childNodes);
        connections.push(...childConnections);

        algNode.addOutput(i.toString(), new ClassicPreset.Output(socket));
        connections.push(new CustomConnection(algNode, i.toString(), childNode, 'top'));
    }
    nodes.push(algNode);
    return [nodes, connections];
}

function getContextMenuItems(registry: PolyAlgService, socket: ClassicPreset.Socket, isReadOnly: boolean, area: AreaPlugin<Schemes, AreaExtra>) {
    const nodes = [];
    for (const model of Object.keys(DataModel).map(key => DataModel[key])) {
        const innerNodes = [];
        for (const decl of registry.getSortedDeclarations(model)) {
            innerNodes.push([
                decl.name,
                () => createAlgNode(decl, socket, isReadOnly, (algNode) => area.update('node', algNode.id).then())
            ]);
        }
        nodes.push([model, innerNodes]);
    }


    const items = ContextMenuPresets.classic.setup(nodes);

    return (context, plugin) => {
        const result = items(context, plugin);
        result.searchBar = false;
        return result;
    };
}

export function createAlgNode(decl: Declaration, socket: ClassicPreset.Socket, isReadOnly: boolean, updateArea: (a: AlgNode) => void): AlgNode {
    console.log(decl);

    const algNode = new AlgNode(decl.name, decl.numInputs);
    algNode.addInput('top', new ClassicPreset.Input(socket));

    const heights = {};
    for (const p of decl.posParams.concat(decl.kwParams)) {
        const c = getControl(p, null, isReadOnly, (height: number) => {
            algNode.updateControlHeight(p.name, height);
            updateArea(algNode);
        }, p.isMultiValued);
        heights[p.name] = c.getHeight();
        algNode.addControl(p.name, c);
    }
    algNode.updateControlHeights(heights);

    if (decl.numInputs > 0) {
        for (let i = 0; i < decl.numInputs; i++) {
            algNode.addOutput(i.toString(), new ClassicPreset.Output(socket));
        }
    } else if (decl.numInputs === -1) {
        algNode.addOutput('0', new ClassicPreset.Output(socket));
    }

    return algNode;
}



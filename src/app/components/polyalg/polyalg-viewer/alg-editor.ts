import {Injector} from '@angular/core';
import {ClassicPreset, GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin, BaseAreaPlugin} from 'rete-area-plugin';
import {ConnectionPlugin, Presets as ConnectionPresets} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/17';
import {PlanNode} from '../models/polyalg-plan.model';
import {ArrangeAppliers, AutoArrangePlugin, Presets as ArrangePresets} from 'rete-auto-arrange-plugin';
import {AlgNode, AlgNodeComponent} from '../algnode/alg-node.component';
import {addCustomBackground} from '../algnode/background';
import {ArgControl} from '../controls/arg-control';
import {CustomSocketComponent} from '../custom-socket/custom-socket.component';
import {CustomConnection, CustomConnectionComponent} from '../custom-connection/custom-connection.component';
import {ReadonlyPlugin} from 'rete-readonly-plugin';
import {ConnectionPathPlugin, Transformers} from 'rete-connection-path-plugin';
import {getDOMSocketPosition} from 'rete-render-utils';
import {ContextMenuExtra, ContextMenuPlugin, Presets as ContextMenuPresets} from 'rete-context-menu-plugin';
import {PolyAlgService} from '../polyalg.service';
import {DataModel} from '../../../models/ui-request.model';
import {DataflowEngine} from 'rete-engine';

type Schemes = GetSchemes<AlgNode, CustomConnection<AlgNode>>;
type AreaExtra = AngularArea2D<Schemes> | ContextMenuExtra;

export const SOCKET_PRESET = new ClassicPreset.Socket('socket');

export async function createEditor(container: HTMLElement, injector: Injector, registry: PolyAlgService, node: PlanNode, isReadOnly: boolean) {
    const readonlyPlugin = new ReadonlyPlugin<Schemes>();

    //const socket = new ClassicPreset.Socket('socket');
    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, AreaExtra>(container);
    const connection = new ConnectionPlugin<Schemes, AreaExtra>;
    const render = new AngularPlugin<Schemes, AreaExtra>({injector});
    const engine = new DataflowEngine<Schemes>();
    const arrange = new AutoArrangePlugin<Schemes>();
    const pathPlugin = new ConnectionPathPlugin({
        transformer: () => (
            (p) => Transformers.classic({vertical: true})(p)
        )
    });
    const contextMenu = new ContextMenuPlugin<Schemes>({
        items: getContextMenuItems(registry, isReadOnly, area)
    });

    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl()
    });

    render.addPreset(Presets.classic.setup<Schemes, AngularArea2D<Schemes>>({
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
    render.addPreset(Presets.contextMenu.setup({delay: 100}));

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
    editor.use(engine);
    area.use(readonlyPlugin.area);
    area.use(render);
    area.use(arrange);
    area.use(contextMenu);
    render.use(pathPlugin);

    AreaExtensions.simpleNodesOrder(area);
    addCustomBackground(area);

    const [nodes, connections] = addNode(registry, node, isReadOnly, area);
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

    //const result = await engine.fetch(nodes[nodes.length - 1].id);
    //console.log('result', result);


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

function addNode(registry: PolyAlgService, node: PlanNode, isReadOnly: boolean, area: AreaPlugin<Schemes, AreaExtra>): [AlgNode[], CustomConnection<AlgNode>[]] {
    const nodes = [];
    const connections = [];
    const algNode = new AlgNode(registry.getDeclaration(node.opName), node.arguments, isReadOnly,
        (a: AlgNode) => area.update('node', a.id).then());

    for (let i = 0; i < node.inputs.length; i++) {
        const [childNodes, childConnections] = addNode(registry, node.inputs[i], isReadOnly, area);
        const childNode = childNodes[childNodes.length - 1];
        nodes.push(...childNodes);
        connections.push(...childConnections);

        //algNode.addOutput(i.toString(), new ClassicPreset.Output(SOCKET_PRESET));
        connections.push(new CustomConnection(algNode, i.toString(), childNode, 'top'));
    }
    nodes.push(algNode);
    return [nodes, connections];
}

function getContextMenuItems(registry: PolyAlgService, isReadOnly: boolean, area: AreaPlugin<Schemes, AreaExtra>) {
    const nodes = [];
    for (const model of Object.keys(DataModel).map(key => DataModel[key])) {
        const innerNodes = [];
        for (const decl of registry.getSortedDeclarations(model)) {
            innerNodes.push([
                decl.name,
                () => new AlgNode(decl, null, isReadOnly,
                    (algNode) => area.update('node', algNode.id).then())
            ]);
        }
        nodes.push([model, innerNodes]);
    }


    const items = ContextMenuPresets.classic.setup(nodes);

    // adjust classic preset to hide the search bar and enable cloning (clone handler of the preset is broken)
    return (context: any, plugin: any) => {
        const result = items(context, plugin);
        result.searchBar = false;

        if (result.list[result.list.length - 1].key === 'clone') {
            const area = plugin.parentScope(BaseAreaPlugin);
            const editor = area.parentScope(NodeEditor);
            result.list[result.list.length - 1] = {
                label: 'Clone',
                key: 'clone',
                async handler() {
                    const node = context.clone(context);
                    await editor.addNode(node);
                    area.translate(node.id, area.area.pointer);
                }
            };
        }
        return result;
    };
}



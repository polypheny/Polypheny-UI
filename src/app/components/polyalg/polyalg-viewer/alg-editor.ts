import {Injector} from '@angular/core';
import {ClassicPreset, GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin, BaseAreaPlugin} from 'rete-area-plugin';
import {ConnectionPlugin, Presets as ConnectionPresets} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/17';
import {PlanNode} from '../models/polyalg-plan.model';
import {ArrangeAppliers, AutoArrangePlugin} from 'rete-auto-arrange-plugin';
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
import {Position} from 'rete-angular-plugin/17/types';
import {Subject} from 'rxjs';

type Schemes = GetSchemes<AlgNode, CustomConnection<AlgNode>>;
type AreaExtra = AngularArea2D<Schemes> | ContextMenuExtra;

export const SOCKET_PRESET = new ClassicPreset.Socket('socket');

export async function createEditor(container: HTMLElement, injector: Injector, registry: PolyAlgService, node: PlanNode | null,
                                   isReadOnly: boolean) {
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
            (p) => Transformers.classic({vertical: true})(p.reverse()) // reverse for correct UP direction
        )
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
    arrange.addPreset(() => {
        return {
            port(n) {
                return {
                    x: n.width / (n.ports + 1) * (n.index + 1),
                    y: 0,
                    width: 15,
                    height: 15,
                    side: 'output' === n.side ? 'NORTH' : 'SOUTH'
                };
            }
        };
    });
    const layoutOpts = {
        'elk.direction': 'UP'
    };

    const $modifyEvent = new Subject<void>();
    const updateSizeFct = (a: AlgNode, delta: Position) => updateSize(a, delta, area, readonlyPlugin,
        () => arrange.layout({applier: undefined, options: layoutOpts}), $modifyEvent);

    const contextMenu = new ContextMenuPlugin<Schemes>({
        items: getContextMenuItems(registry, isReadOnly, updateSizeFct)
    });

    editor.use(readonlyPlugin.root);
    editor.use(area);
    editor.use(engine);
    area.use(readonlyPlugin.area);
    area.use(render);
    area.use(arrange);
    render.use(pathPlugin);

    if (!isReadOnly) {
        area.use(connection);  // make connections editable
        area.use(contextMenu); // add context menu
    }

    AreaExtensions.simpleNodesOrder(area);
    addCustomBackground(area);

    const [nodes, connections] = addNode(registry, node, isReadOnly, updateSizeFct);
    for (const n of nodes) {
        await editor.addNode(n);
    }

    for (const c of connections) {
        await editor.addConnection(c);
    }

    await arrange.layout({
        applier: undefined, options: layoutOpts
    });

    AreaExtensions.zoomAt(area, editor.getNodes());

    const modifyingEventTypes = new Set(['nodecreated', 'noderemoved', 'connectioncreated', 'connectionremoved']);
    editor.addPipe(context => {
        if (modifyingEventTypes.has(context.type)) {
            if (context.type !== 'nodecreated' || editor.getNodes().length === 1) {
                $modifyEvent.next();
            }
        }
        return context;
    });

    if (isReadOnly) {
        readonlyPlugin.enable(); // disable interaction with nodes (control interaction is deactivated separately)
    }


    return {
        layout: async () => {
            await arrange.layout({
                applier, options: layoutOpts
            });
            AreaExtensions.zoomAt(area, editor.getNodes());
        },
        destroy: () => area.destroy(),
        toPolyAlg: async (): Promise<string> => {
            if (editor.getNodes().length === 0) {
                return '';
            }
            const rootId = findRootNodeId(editor.getNodes(), editor.getConnections());
            if (rootId) {
                engine.reset(); // clear cache
                return await engine.fetch(rootId).then(res => res['out']);
            }
            return null;
        },
        onModify: $modifyEvent.asObservable()
    };
}

function addNode(registry: PolyAlgService, node: PlanNode | null, isReadOnly: boolean, updateSize: (a: AlgNode, delta: Position) => void): [AlgNode[], CustomConnection<AlgNode>[]] {
    const nodes = [];
    const connections = [];
    if (!node) {
        return [nodes, connections];
    }
    const algNode = new AlgNode(registry.getDeclaration(node.opName), node.arguments, isReadOnly, updateSize);
    if (node.opName.endsWith('#')) {
        // TODO: handle implicit project correctly
        algNode.label = 'PROJECT#';
    }

    for (let i = 0; i < node.inputs.length; i++) {
        const [childNodes, childConnections] = addNode(registry, node.inputs[i], isReadOnly, updateSize);
        const childNode = childNodes[childNodes.length - 1];
        nodes.push(...childNodes);
        connections.push(...childConnections);

        const targetIn = algNode.hasVariableInputs ? '0' : i.toString();
        connections.push(new CustomConnection(childNode, 'out', algNode, targetIn));
    }
    nodes.push(algNode);
    return [nodes, connections];
}

function getContextMenuItems(registry: PolyAlgService, isReadOnly: boolean, updateSize: (a: AlgNode, delta: Position) => void) {
    const nodes = [];
    for (const model of Object.keys(DataModel).map(key => DataModel[key])) {
        const innerNodes = [];
        for (const decl of registry.getSortedDeclarations(model)) {
            innerNodes.push([
                decl.name,
                () => new AlgNode(decl, null, isReadOnly, updateSize)
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

function updateSize(algNode: AlgNode, {x, y}: Position, area: AreaPlugin<Schemes, AreaExtra>,
                    readonlyPlugin: ReadonlyPlugin<Schemes>,
                    arrange: () => Promise<any>, $modifyEvent: Subject<void>) {
    const oldPos = area.nodeViews.get(algNode.id).position;

    // update location of sockets
    area.update('node', algNode.id).then(
        () => {
            const isReadOnly = readonlyPlugin.enabled;
            if (isReadOnly) {
                readonlyPlugin.disable();
                arrange().then(() => readonlyPlugin.enable());
            } else {
                area.translate(algNode.id, {x: oldPos.x + x, y: oldPos.y + y}).then();
                $modifyEvent.next(); // size has changed, so the content has probably also changed (e.g. when list item is deleted)
            }
        }
    );
}

function findRootNodeId(nodes: AlgNode[], connections: CustomConnection<AlgNode>[]): string | null {
    if (connections.length === 0) {
        if (nodes.length === 1) {
            return nodes[0].id;
        }
        return null;
    }
    const visited = new Set<string>();

    let root: string = null;

    for (const c of connections) {
        visited.add(c.source);
        let curr = c.target;
        if (visited.has(curr)) {
            continue;
        }

        let next = c.target;
        while (next !== null) {
            if (visited.has(next)) {
                break;
            }
            curr = next;
            next = getSuccessor(curr, connections);
            visited.add(curr);
        }
        if (next === null) {
            // arrived at root of subtree
            if (root === null) {
                root = curr;
            } else if (root !== curr) {
                // found different root => multiple subtrees
                return null;
            }
        }
    }
    if (visited.size < nodes.length) {
        console.log('found orphan nodes');
    }
    return root;
}

function getSuccessor(nodeId: string, connections: CustomConnection<AlgNode>[]): string | null {
    const outgoing = connections.filter(c => c.source === nodeId);
    if (outgoing.length === 0) {
        return null;
    }
    return outgoing[0].target;
}

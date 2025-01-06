import {NodeEditor} from 'rete';
import {SocketData} from 'rete-connection-plugin';
import {Position} from 'rete-angular-plugin/17/types';
import {Schemes} from './workflow-editor';
import {EdgeModel} from '../../../models/workflows.model';
import {ActivityNode, IN_CONTROL_KEY, SUCCESS_CONTROL_KEY} from './activity/activity.component';
import {Subject} from 'rxjs';
import {Item, Items} from 'rete-context-menu-plugin/_types/types';
import {ContextMenuPlugin} from 'rete-context-menu-plugin';
import {BaseAreaPlugin} from 'rete-area-plugin';
import {ActivityPort} from './activity-port/activity-port.component';
import {Edge} from './edge/edge.component';


export function getMagneticConnectionProps(editor: NodeEditor<Schemes>, createEdgeSubject: Subject<EdgeModel>) {
    return {
        async createConnection(from: SocketData, to: SocketData) {
            if (from.side === to.side) {
                return;
            }
            const [source, target] = from.side === 'output' ? [from, to] : [to, from];

            if (!canCreateConnection(source, target, editor)) {
                return;
            }

            if (!ActivityNode.isControlPortKey(target.key)) {
                const connectionsToRemove = editor.getConnections().filter(c =>
                    c.target === target.nodeId && c.targetInput === target.key);
                for (const c of connectionsToRemove) {
                    await editor.removeConnection(c.id); // the edge add request could be sent before remove, but this is not a problem
                }
            }
            createEdgeSubject.next(socketsToEdgeModel(source, target, editor));
        },
        display(from: SocketData, to: SocketData) {
            const [source, target] = from.side === 'output' ? [from, to] : [to, from];
            return canCreateConnection(source, target, editor);
        },
        offset(socket: SocketData, position: Position) {

            return {
                x: position.x, //+ (socket.side === 'input' ? 3 : -3),
                y: position.y //+ (socket.side === 'input' ? 12 : -12)
            };
        },
        distance: 125
    };
}

export function socketsToEdgeModel(source: SocketData, target: SocketData, editor: NodeEditor<Schemes>) {
    const isControl = target.key === IN_CONTROL_KEY;
    return {
        fromId: editor.getNode(source.nodeId).activityId,
        toId: editor.getNode(target.nodeId).activityId,
        fromPort: isControl ? (source.key === SUCCESS_CONTROL_KEY ? 0 : 1) : ActivityNode.getDataPortIndexFromKey(source.key),
        toPort: isControl ? 0 : ActivityNode.getDataPortIndexFromKey(target.key),
        isControl: target.key === IN_CONTROL_KEY
    };
}

export function getContextMenuItems(removeEdgeSubject: Subject<EdgeModel>, removeActivitySubject: Subject<string>, cloneActivitySubject: Subject<string>): Items<Schemes> {
    const items: Item[] = [
        {label: 'Print Something', key: '0', handler: () => console.log('something was printed')},
    ];
    return (context: 'root' | Schemes['Node'] | Schemes['Connection'], plugin: ContextMenuPlugin<Schemes>) => {
        const area = plugin.parentScope(BaseAreaPlugin);
        const editor = area.parentScope(NodeEditor);

        if (context === 'root') {
            return {
                searchBar: false,
                list: items
            };
        }

        // TODO: change items depending on workflow state (possibly hide context menu? while executing?)
        const deleteItem: Item = {
            label: 'Delete',
            key: 'delete',
            handler: async () => {
                if ('source' in context && 'target' in context) {
                    // connection
                    removeEdgeSubject.next(context.toModel());
                } else {
                    // node
                    removeActivitySubject.next(context.activityId);
                }
            }
        };

        const cloneItem: Item = {
            label: 'Clone',
            key: 'clone',
            handler: () => {
                if (context instanceof ActivityNode) {
                    cloneActivitySubject.next(context.activityId);
                }
            }
        };

        return {
            searchBar: false,
            list: context instanceof ActivityNode ? [deleteItem, cloneItem] : [deleteItem]
        };
    };
}

export function canCreateConnection(source: SocketData, target: SocketData, editor: NodeEditor<Schemes>): boolean {
    if (!source || !target || source.side === target.side || source.nodeId === target.nodeId) {
        return false;
    }

    const sourceNode = editor.getNode(source.nodeId);
    const targetNode = editor.getNode(target.nodeId);
    const sourcePort: ActivityPort = sourceNode.outputs[source.key].socket as ActivityPort;
    const targetPort: ActivityPort = targetNode.inputs[target.key].socket as ActivityPort;

    if (!sourcePort.isCompatibleWith(targetPort)) {
        return false;
    }

    const connections = editor.getConnections();
    if (connections.find(c => c.source === source.nodeId && c.target === target.nodeId
        && c.sourceOutput === source.key && c.targetInput === target.key)) {
        return false;
    }
    // Detect cycle using BFS
    const queue = [targetNode.id];
    const visited = new Set<string>();
    while (queue.length > 0) {
        const successor = queue.shift();
        if (visited.has(successor)) {
            continue;
        }
        if (successor === sourceNode.id) {
            return false;
        }
        visited.add(successor);
        const successors = getSuccessors(successor, connections);
        if (successors) {
            queue.push(...successors);
        }
    }

    return true;
}

function getSuccessors(nodeId: string, connections: Edge<ActivityNode>[]): string[] | null {
    const outgoing = connections.filter(c => c.source === nodeId).map(c => c.target);
    if (outgoing.length === 0) {
        return null;
    }
    return outgoing;
}

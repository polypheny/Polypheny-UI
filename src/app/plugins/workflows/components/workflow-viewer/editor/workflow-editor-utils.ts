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


// TODO: implement workflow-editor specific changes
export function getMagneticConnectionProps(editor: NodeEditor<Schemes>, createEdgeSubject: Subject<EdgeModel>) {
    return {
        async createConnection(from: SocketData, to: SocketData) {
            if (from.side === to.side) {
                return;
            }
            const [source, target] = from.side === 'output' ? [from, to] : [to, from];

            createEdgeSubject.next(socketsToEdgeModel(source, target, editor));

            /*if (!canCreateConnection(editor, connection)) {
                return;
            }

            const connectionsToRemove = editor.getConnections().filter(c => {
                return (c.target === targetNode.id && c.targetInput === target.key && !targetNode.hasVariableInputs) || (c.source === sourceNode.id);
            });

            for (const c of connectionsToRemove) {
                await editor.removeConnection(c.id);
            }*/
        },
        display(from: SocketData, to: SocketData) {
            return from.side !== to.side; //&& areSocketsCompatible(editor, from, to);
        },
        offset(socket: SocketData, position: Position) {

            return {
                x: position.x, //+ (socket.side === 'input' ? 3 : -3),
                y: position.y //+ (socket.side === 'input' ? 12 : -12)
            };
        },
        distance: 75
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

export function getContextMenuItems(removeEdgeSubject: Subject<EdgeModel>, removeActivitySubject: Subject<string>): Items<Schemes> {
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

        const deleteItem: Item = {
            label: 'Delete',
            key: 'delete',
            handler: async () => {
                if ('source' in context && 'target' in context) {
                    // connection
                    const connectionId = context.id;
                    removeEdgeSubject.next(context.toModel());
                } else {
                    // node
                    const nodeId = context.id;
                    /*const connections = editor.getConnections().filter(c => {
                        return c.source === nodeId || c.target === nodeId
                    })

                    for (const connection of connections) {
                        await editor.removeConnection(connection.id)
                    }*/
                    removeActivitySubject.next(context.activityId);
                }
            }
        };

        // TODO: clone item

        return {
            searchBar: false,
            list: [deleteItem]
        };


        /*result.searchBar = false;
        console.log('result context items:', result);

        if (result.list[result.list.length - 1].key === 'clone') {
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
        return result;*/
    };
}

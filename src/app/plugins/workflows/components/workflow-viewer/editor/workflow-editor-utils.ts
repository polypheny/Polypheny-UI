import {NodeEditor} from 'rete';
import {SocketData} from 'rete-connection-plugin';
import {Position} from 'rete-angular-plugin/17/types';
import {Schemes} from './workflow-editor';
import {Edge} from './edge/edge.component';


// TODO: implement workflow-editor specific changes
export function getMagneticConnectionProps(editor: NodeEditor<Schemes>) {
    return {
        async createConnection(from: SocketData, to: SocketData) {
            if (from.side === to.side) {
                return;
            }
            const [source, target] = from.side === 'output' ? [from, to] : [to, from];
            const sourceNode = editor.getNode(source.nodeId);
            const targetNode = editor.getNode(target.nodeId);

            const connection = new Edge(
                sourceNode,
                source.key as never,
                targetNode,
                target.key as never
            );

            /*if (!canCreateConnection(editor, connection)) {
                return;
            }

            const connectionsToRemove = editor.getConnections().filter(c => {
                return (c.target === targetNode.id && c.targetInput === target.key && !targetNode.hasVariableInputs) || (c.source === sourceNode.id);
            });

            for (const c of connectionsToRemove) {
                await editor.removeConnection(c.id);
            }*/

            await editor.addConnection(
                connection
            );
        },
        display(from: SocketData, to: SocketData) {
            return from.side !== to.side; //&& areSocketsCompatible(editor, from, to);
        },
        offset(socket: SocketData, position: Position) {

            return {
                x: position.x + (socket.side === 'input' ? 3 : -3),
                y: position.y + (socket.side === 'input' ? 12 : -12)
            };
        },
        distance: 75
    };
}

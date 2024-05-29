import {AlgNodeSocket} from '../custom-socket/custom-socket.component';
import {ClassicPreset, NodeEditor} from 'rete';
import {Schemes} from './alg-editor';
import {AlgNode} from '../algnode/alg-node.component';
import {CustomConnection} from '../custom-connection/custom-connection.component';
import {DataModel} from '../../../models/ui-request.model';
import {SocketData} from 'rete-connection-plugin';

type Sockets = AlgNodeSocket;
type Input = ClassicPreset.Input<Sockets>;
type Output = ClassicPreset.Output<Sockets>;

function getConnectionSockets(source: AlgNode, target: AlgNode, connection: Schemes['Connection']) {

    const output = source && (source.outputs as Record<string, Input>)[connection.sourceOutput];

    // @ts-ignore
    const input = target && (target.inputs as Record<string, Output>)[connection.targetInput];

    return {
        source: output?.socket,
        target: input?.socket
    };
}

export function canCreateConnection(editor: NodeEditor<Schemes>, connection: Schemes['Connection']) {
    const sourceNode = editor.getNode(connection.source);
    const targetNode = editor.getNode(connection.target);
    const connections = editor.getConnections();
    let successor = targetNode.id;
    while (successor) {
        if (successor === sourceNode.id) {
            console.log('detected recursion!');
            return false;
        }
        successor = getSuccessor(successor, connections);
    }

    const {source, target} = getConnectionSockets(sourceNode, targetNode, connection);

    return source && target && source.isCompatibleWith(target);
}

export function areSocketsCompatible(editor: NodeEditor<Schemes>, from: SocketData, to: SocketData) {
    const fromNode = editor.getNode(from.nodeId);
    const toNode = editor.getNode(to.nodeId);
    return fromNode.decl.model === toNode.decl.model;
}

export function findRootNodeId(nodes: AlgNode[], connections: CustomConnection<AlgNode>[]): string | null {
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

export function getModelPrefix(model: DataModel) {
    switch (model) {
        case DataModel.DOCUMENT:
            return 'DOC';
        case DataModel.RELATIONAL:
            return 'REL';
        case DataModel.GRAPH:
            return 'LPG';
    }
}

export function getPredecessors(nodeId: string, connections: CustomConnection<AlgNode>[]): string[] {
    return connections.filter(c => c.target === nodeId).map(c => c.source);
}

function getSuccessor(nodeId: string, connections: CustomConnection<AlgNode>[]): string | null {
    const outgoing = connections.filter(c => c.source === nodeId);
    if (outgoing.length === 0) {
        return null;
    }
    return outgoing[0].target;
}

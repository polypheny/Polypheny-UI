import {AlgNodeSocket} from '../custom-socket/custom-socket.component';
import {ClassicPreset, NodeEditor} from 'rete';
import {Schemes} from './alg-editor';
import {AlgNode} from '../algnode/alg-node.component';
import {CustomConnection} from '../custom-connection/custom-connection.component';
import {SocketData} from 'rete-connection-plugin';
import {Position} from 'rete-angular-plugin/17/types';
import {OperatorModel, OperatorTag} from '../models/polyalg-registry';
import {PolyAlgService} from '../polyalg.service';
import {PlanType} from '../../../models/information-page.model';

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
    const fromModel = editor.getNode(from.nodeId).decl.model;
    const toModel = editor.getNode(to.nodeId).decl.model;
    return fromModel === toModel || fromModel === OperatorModel.COMMON || toModel === OperatorModel.COMMON;
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

export function getModelPrefix(model: OperatorModel) {
    switch (model) {
        case OperatorModel.DOCUMENT:
            return 'DOC';
        case OperatorModel.RELATIONAL:
            return 'REL';
        case OperatorModel.GRAPH:
            return 'LPG';
        default:
            return '';
    }
}

export function removeModelPrefix(name: string, model: OperatorModel) {
    if (model === OperatorModel.COMMON) {
        return name;
    }
    return name.substring(name.indexOf('_') + 1);
}

export function updateMultiConnAfterCreate(editor: NodeEditor<Schemes>, sourceId: string, targetId: string) {
    const target = editor.getNode(targetId);
    if (target.hasVariableInputs) {
        const nodeIds = getPredecessors(targetId, editor.getConnections());
        if (nodeIds.length > 0) {
            if (nodeIds.length === 1) {
                editor.getNode(nodeIds[0]).setMultiConnIdx(0);
            }
            editor.getNode(sourceId).setMultiConnIdx(nodeIds.length);
        }
    }
}

export function updateMultiConnAfterRemove(editor: NodeEditor<Schemes>, sourceId: string, targetId: string) {
    const source = editor.getNode(sourceId);
    const target = editor.getNode(targetId);
    if (target.hasVariableInputs) {
        let i = 0;
        const nodeIds = getPredecessors(targetId, editor.getConnections());
        for (const nodeId of nodeIds) {
            if (nodeId === sourceId) {
                source.setMultiConnIdx(null);
            } else {
                if (nodeIds.length - 1 === 1) {
                    // nodeId is the only node left -> do not show idx
                    editor.getNode(nodeId).setMultiConnIdx(null);
                } else {
                    editor.getNode(nodeId).setMultiConnIdx(i);
                    i++;
                }
            }
        }
    }
}

export function getPredecessors(nodeId: string, connections: CustomConnection<AlgNode>[]): string[] {
    return connections.filter(c => c.target === nodeId).map(c => c.source);
}

export function getMagneticConnectionProps(editor: NodeEditor<Schemes>) {
    return {
        async createConnection(from: SocketData, to: SocketData) {
            if (from.side === to.side) {
                return;
            }
            const [source, target] = from.side === 'output' ? [from, to] : [to, from];
            const sourceNode = editor.getNode(source.nodeId);
            const targetNode = editor.getNode(target.nodeId);

            const connection = new CustomConnection(
                sourceNode,
                source.key as never,
                targetNode,
                target.key as never,
                0
            );

            if (!canCreateConnection(editor, connection)) {
                return;
            }

            const connectionsToRemove = editor.getConnections().filter(c => {
                return (c.target === targetNode.id && c.targetInput === target.key && !targetNode.hasVariableInputs) || (c.source === sourceNode.id);
            });

            for (const c of connectionsToRemove) {
                await editor.removeConnection(c.id);
            }

            await editor.addConnection(
                connection
            );
        },
        display(from: SocketData, to: SocketData) {
            return from.side !== to.side && areSocketsCompatible(editor, from, to);
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

export function getContextMenuNodes(isSimpleMode: boolean, registry: PolyAlgService, planType: PlanType,
                                    isReadOnly: boolean, updateSize: (a: AlgNode, delta: Position) => void) {
    const nodes = [];
    for (const model of Object.keys(OperatorModel).map(key => OperatorModel[key])) {
        const innerNodes = [];
        for (const decl of registry.getSortedDeclarations(model)) {
            if (decl.tags.includes(OperatorTag[planType]) && !(isSimpleMode && decl.tags.includes(OperatorTag.ADVANCED))) {
                const displayName = decl.convention ? decl.name : removeModelPrefix(decl.name, decl.model);
                innerNodes.push([
                    displayName,
                    () => new AlgNode(decl, planType, null, null, isSimpleMode, isReadOnly, updateSize)
                ]);
            }
        }
        if (innerNodes.length > 0) {
            nodes.push([model, innerNodes]);
        }
    }
    return nodes;
}

function getSuccessor(nodeId: string, connections: CustomConnection<AlgNode>[]): string | null {
    const outgoing = connections.filter(c => c.source === nodeId);
    if (outgoing.length === 0) {
        return null;
    }
    return outgoing[0].target;
}

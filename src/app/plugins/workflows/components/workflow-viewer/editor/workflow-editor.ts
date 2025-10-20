import {effect, Injector, Signal} from '@angular/core';
import {GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin} from 'rete-area-plugin';
import {ClassicFlow, ConnectionPlugin, getSourceTarget} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/18';
import {EdgeModel, EdgeState, RenderModel, WorkflowState} from '../../../models/workflows.model';
import {ActivityComponent, ActivityNode} from './activity/activity.component';
import {Edge, EdgeComponent} from './edge/edge.component';
import {ActivityPortComponent} from './activity-port/activity-port.component';
import {addCustomBackground} from '../../../../../components/polyalg/polyalg-viewer/background';
import {ReadonlyPlugin} from 'rete-readonly-plugin';
import {setupPanningBoundary} from '../../../../../components/polyalg/polyalg-viewer/panning-boundary';
import {AutoArrangePlugin} from 'rete-auto-arrange-plugin';
import {debounceTime, Subject, Subscription} from 'rxjs';
import {Position} from 'rete-angular-plugin/18/types';
import {canCreateConnection, computeCenter, getContextMenuItems, getMagneticConnectionProps, socketsToEdgeModel} from './workflow-editor-utils';
import {Activity, edgeToString, Workflow} from '../workflow';
import {ContextMenuExtra, ContextMenuPlugin} from 'rete-context-menu-plugin';
import {useMagneticConnection} from '../../../../../components/polyalg/polyalg-viewer/magnetic-connection';
import {CustomZoom} from '../../../../../components/polyalg/polyalg-viewer/custom-zoom';
import {CustomDrag} from '../../../../../components/polyalg/polyalg-viewer/custom-drag';

export type Schemes = GetSchemes<ActivityNode, Edge<ActivityNode>>;
type AreaExtra = AngularArea2D<Schemes> | ContextMenuExtra;

export class WorkflowEditor {
    private readonly editor: NodeEditor<Schemes> = new NodeEditor<Schemes>();
    private readonly connection: ConnectionPlugin<Schemes, AreaExtra> = new ConnectionPlugin<Schemes, AreaExtra>();
    private readonly readonlyPlugin = new ReadonlyPlugin<Schemes>();
    private readonly area: AreaPlugin<Schemes, AreaExtra>;
    private readonly render: AngularPlugin<Schemes, AreaExtra>;
    private readonly arrange = new AutoArrangePlugin<Schemes>();
    private readonly nodeMap: Map<string, ActivityNode> = new Map(); // uuid to activitynode
    private readonly connectionMap: Map<string, Edge<ActivityNode>> = new Map(); // serialized EdgeModel (without state) to array of out edges
    private readonly nodeIdToActivityId: Map<string, string> = new Map();
    private panningBoundary: { destroy: any; };

    private workflow: Workflow;
    private readonly translateSubjects: { [key: string]: Subject<Position> } = {}; // debounce the translation of activities
    private readonly debouncedTranslateSubject = new Subject<{ activityId: string, pos: Position }>();
    private readonly DEBOUNCE_TIME_MS = 100;
    private readonly removeActivitySubject = new Subject<string>(); // activityId
    private readonly cloneActivitySubject = new Subject<string>(); // activityId
    private readonly removeEdgeSubject = new Subject<EdgeModel>();
    private readonly moveMultiEdgeSubject = new Subject<[EdgeModel, number]>(); // edge, targetIndex
    private readonly createEdgeSubject = new Subject<EdgeModel>();
    private readonly executeActivitySubject = new Subject<string>(); // activityId
    private readonly resetActivitySubject = new Subject<string>(); // activityId
    private readonly openSettingsSubject = new Subject<string>(); // activityId
    private readonly openNestedSubject = new Subject<string>(); // activityId
    private readonly openCheckpointSubject = new Subject<[string, boolean, number]>(); // activityId, isInput, portIdx
    private readonly reloadEditorSubject = new Subject<void>(); // activityId
    private readonly subscriptions = new Subscription();
    private checkConnectionsInterval: number;

    constructor(private injector: Injector, container: HTMLElement, private readonly isEditable: boolean) {
        this.area = new AreaPlugin<Schemes, AreaExtra>(container);
        this.render = new AngularPlugin<Schemes, AreaExtra>({injector});

        this.render.addPreset(
            Presets.classic.setup({
                customize: {
                    node() {
                        return ActivityComponent;
                    },
                    connection() {
                        return EdgeComponent;
                    },
                    socket() {
                        return ActivityPortComponent;
                    },
                },
            })
        );
        this.render.addPreset(Presets.contextMenu.setup({delay: 200})); // time in ms for context menu to close

        this.connection.addPreset(() => new ClassicFlow({
            canMakeConnection: (from, to): boolean => {
                const [source, target] = getSourceTarget(from, to) || [null, null];
                return canCreateConnection(source, target, this.editor);
            },
            makeConnection: (from, to) => {
                const [source, target] = getSourceTarget(from, to) || [null, null];
                if (source && target) {
                    this.createEdgeSubject.next(socketsToEdgeModel(source, target, this.editor));
                    return true;
                }
            }
        }));
        this.arrange.addPreset(() => {
            return {
                port(data) {
                    let y;
                    const firstData = 156;
                    const isControl = ActivityNode.isControlPortKey(data.key);
                    if (data.side === 'input') {
                        y = isControl ? 80 : firstData + 34 * (data.index - 1);
                    } else {
                        y = isControl ? firstData + 34 * (data.ports - 2) + 24 * (data.index) : firstData + 34 * (data.index - 2);
                    }
                    return {
                        x: 0,
                        y: y,
                        width: 15,
                        height: 15,
                        side: 'output' === data.side ? 'EAST' : 'WEST'
                    };
                }
            };
        });
        this.area.area.setZoomHandler(new CustomZoom(0.1, 0.3, false));
        this.area.area.setDragHandler(new CustomDrag(container)); // horizontal scrolling

        // Attach plugins
        this.editor.use(this.readonlyPlugin.root);
        this.editor.use(this.area);
        this.area.use(this.render);
        this.area.use(this.readonlyPlugin.area);
        this.area.use(this.arrange);

        AreaExtensions.restrictor(this.area, {scaling: {min: 0.03, max: 5}}); // Restrict Zoom
        AreaExtensions.simpleNodesOrder(this.area);
        addCustomBackground(this.area);

        this.editor.addPipe(context => {
            if (context.type === 'connectionremove') {
                const edgeModel = context.data.toModel();
                if (this.workflow.getEdgeState(edgeModel)) {
                    this.removeEdgeSubject.next(edgeModel); // additionally, the edge is deleted immediately to not cause any issues
                }
            }
            return context;
        });

        this.area.addPipe(context => {
            if (context.type === 'zoom' && context.data.source === 'dblclick') {
                return; // https://github.com/retejs/rete/issues/204
            } else if (context.type === 'nodetranslated') {
                this.translateSubjects[this.nodeIdToActivityId.get(context.data.id)].next(context.data.position);
            } else if (context.type === 'pointerdown' && context.data.event.button === 0) {
                document.body.style.userSelect = 'none'; // ensure dragging out of the area does not select activity notes
            } else if (context.type === 'pointerup' && context.data.event.button === 0) {
                document.body.style.userSelect = ''; // restore userSelect
            } /* else if (!['pointermove', 'render', 'rendered', 'rendered', 'zoom', 'zoomed', 'translate', 'translated', 'nodetranslate', 'unmount'].includes(context.type)) {
                console.log(context);
            } */
            return context;
        });

        this.render.addPipe(context => {
            if (context.type === 'connectionpath') {
                context.data.payload.center?.set(computeCenter(context.data.points));
            }
            return context;
        });
    }

    async initialize(workflow: Workflow): Promise<void> {
        if (this.workflow) {
            console.error('Workflow editor has already been initialized');
            return;
        }
        this.workflow = workflow;
        let requiresArranging = true;
        for (const activity of this.workflow.getActivities()) {
            const isInOrigin = await this.addNode(activity);
            if (!isInOrigin) {
                requiresArranging = false;
            }
        }
        for (const edgePair of this.workflow.getEdges()) {
            await this.addConnection(...edgePair);
        }
        this.editor.getNodes().forEach(n => this.area.update('node', n.id)); // ensure all node components are rendered

        this.addSubscriptions();

        const selector = AreaExtensions.selector();
        AreaExtensions.selectableNodes(this.area, selector, {
            accumulating: AreaExtensions.accumulateOnCtrl(),
        });

        if (this.isEditable) {
            this.area.use(this.connection);  // make connections editable

            const contextMenu: ContextMenuPlugin<Schemes> = new ContextMenuPlugin<Schemes>({
                items: getContextMenuItems(this.removeEdgeSubject, this.moveMultiEdgeSubject,
                    this.removeActivitySubject, this.cloneActivitySubject, this.workflow)
            });

            this.area.use(contextMenu); // add context menu
            useMagneticConnection(this.connection, getMagneticConnectionProps(this.editor, this.createEdgeSubject));
            this.panningBoundary = setupPanningBoundary({area: this.area, selector, padding: 40, intensity: 2});
        }


        setTimeout(async () => {
            if (requiresArranging) {
                await this.arrangeNodes();
            }
            await AreaExtensions.zoomAt(this.area, this.editor.getNodes());
            if (!this.isEditable) {
                this.readonlyPlugin.enable();
            }
        }, 100);

    }

    onActivityTranslate() {
        return this.debouncedTranslateSubject.asObservable();
    }

    onActivityRemove() {
        return this.removeActivitySubject.asObservable();
    }

    onActivityClone() {
        return this.cloneActivitySubject.asObservable();
    }

    onActivityExecute() {
        return this.executeActivitySubject.asObservable();
    }

    onActivityReset() {
        return this.resetActivitySubject.asObservable();
    }

    onOpenActivitySettings() {
        return this.openSettingsSubject.asObservable();
    }

    onOpenNestedActivity() {
        return this.openNestedSubject.asObservable();
    }

    onOpenCheckpoint() {
        return this.openCheckpointSubject.asObservable();
    }

    onEdgeRemove() {
        return this.removeEdgeSubject.asObservable();
    }

    onMoveMulti() {
        return this.moveMultiEdgeSubject.asObservable();
    }

    onEdgeCreate() {
        return this.createEdgeSubject.asObservable();
    }

    onReloadEditor() {
        return this.reloadEditorSubject.asObservable();
    }

    async arrangeNodes() {
        await this.arrange.layout({
            applier: undefined, options: {'elk.layered.spacing.nodeNodeBetweenLayers': '100'}
        });
    }

    getCenter(): Position {
        const box = this.area.container.getBoundingClientRect();
        return this.clientCoords2EditorCoords({x: box.width / 2, y: box.height / 2}, true);
    }

    clientCoords2EditorCoords(clientPos: Position, isRelative = false) {
        // https://retejs.org/docs/faq#viewport-center
        const box = this.area.container.getBoundingClientRect();
        const relPos = isRelative ? clientPos : {x: clientPos.x - box.x, y: clientPos.y - box.y};

        if (relPos.x < 0 || relPos.x > box.width || relPos.y < 0 || relPos.y > box.height) {
            return null;
        }

        const {x, y, k} = this.area.area.transform;
        const activityHalfWidth = 200 / 2; // approximation
        const activityHalfHeight = 300 / 2;
        return {x: (relPos.x - x) / k - activityHalfWidth, y: (relPos.y - y) / k - activityHalfHeight};
    }

    destroy(): void {
        this.subscriptions.unsubscribe();
        Object.values(this.translateSubjects).forEach((subject) => subject.complete());
        this.area.destroy();
        this.panningBoundary?.destroy();
        clearInterval(this.checkConnectionsInterval);
    }

    private async addNode(activity: Activity) {
        const node = new ActivityNode(activity, this.workflow.state,
            this.executeActivitySubject, this.resetActivitySubject,
            this.openSettingsSubject, this.openNestedSubject, this.openCheckpointSubject, this.isEditable);
        this.nodeMap.set(activity.id, node);
        this.nodeIdToActivityId.set(node.id, activity.id);
        const translateSubject = new Subject<Position>();
        translateSubject.pipe(
            debounceTime(this.DEBOUNCE_TIME_MS)
        ).subscribe(pos => this.debouncedTranslateSubject.next({activityId: activity.id, pos: pos}));
        this.translateSubjects[activity.id] = translateSubject;
        await this.editor.addNode(node);
        await this.area.resize(node.id, node.width, node.height); // ensure specified size is actually reflected visually
        if (activity.rendering().posX !== 0 || activity.rendering().posY !== 0) {
            await this.area.translate(node.id, {x: activity.rendering().posX, y: activity.rendering().posY});
            return false;
        }
        return true;
    }

    private setActivityPosition(id: string, rendering: RenderModel) {
        const node = this.nodeMap.get(id);
        if (this.editor.getNode(node?.id)) {
            this.area.translate(node.id, {x: rendering.posX, y: rendering.posY});
        }
    }

    private async addConnection(edge: EdgeModel, state: Signal<EdgeState>) {
        const from = this.nodeMap.get(edge.fromId);
        const to = this.nodeMap.get(edge.toId);

        const connection = edge.isControl ? Edge.createControlEdge(from, to, edge.fromPort, state) :
            Edge.createDataEdge(from, edge.fromPort, to, edge.toPort, state);

        const edgeString = edgeToString(edge);
        this.connectionMap.set(edgeString, connection);

        if (connection.isMulti) {
            // enforce adding the connections in the correct order
            setTimeout(() => this.editor.addConnection(connection), connection.multiIdx);
        } else {
            await this.editor.addConnection(connection);
        }
    }

    private removeNode(activityId: string) {
        const node = this.nodeMap.get(activityId);
        if (this.editor.getNode(node.id)) {
            this.editor.removeNode(node.id);
        }
        this.translateSubjects[activityId].complete();
        this.nodeMap.delete(activityId);
        delete this.translateSubjects[activityId];
    }

    private removeConnection(edgeString: string) {
        const connection = this.connectionMap.get(edgeString);
        if (this.editor.getConnection(connection.id)) { // connection might already have been deleted
            if (connection.isMulti) {
                // require because of a weird bug with rete.js => enforce ordered removal
                setTimeout(() => this.editor.removeConnection(connection.id), connection.multiIdx);
            } else {
                this.editor.removeConnection(connection.id);
            }
        }

        this.connectionMap.delete(edgeString);
    }

    private addSubscriptions() {
        effect(() => {
            if (this.isEditable) {
                const state = this.workflow.state();
                if (state !== WorkflowState.IDLE) {
                    setTimeout(() => this.readonlyPlugin.enable(), 20); // time for multi-edges to appear
                } else {
                    setTimeout(() => this.readonlyPlugin.disable(), 20);
                }
            }
        }, {injector: this.injector});

        this.subscriptions.add(this.workflow.onActivityChange().subscribe(activityId => {
            const node = this.nodeMap.get(activityId);
            this.area.update('node', node.id);
            this.setActivityPosition(activityId, this.workflow.getActivity(activityId).rendering());
        }));
        this.subscriptions.add(this.workflow.onActivityRemove().subscribe(activityId => {
            this.removeNode(activityId);
        }));
        this.subscriptions.add(this.workflow.onActivityAdd().subscribe(activity => {
            this.addNode(activity);
        }));
        this.subscriptions.add(this.workflow.onEdgeChange().subscribe(edgeString => {
            const connection = this.connectionMap.get(edgeString);
            this.area.update('connection', connection.id);
        }));
        this.subscriptions.add(this.workflow.onEdgeRemove().subscribe(edgeString => {
            this.removeConnection(edgeString);
        }));
        this.subscriptions.add(this.workflow.onEdgeAdd().subscribe(([edgeModel, state]) => {
            this.addConnection(edgeModel, state);
        }));

        if (this.isEditable) {
            this.checkConnectionsInterval = setInterval(() => {
                // Issue: sometimes the connection corresponding to a removed edge cannot be removed from the editor.
                // Current Solution (not ideal): reload entire editor
                if (this.editor.getConnections().length > this.workflow.getEdges().length) {
                    setTimeout(() => { // wait if problem resolves itself
                        if (this.editor.getConnections().length > this.workflow.getEdges().length) {
                            this.reloadEditorSubject.next();
                        }
                    }, 10);
                }
            }, 1000);
        }
    }
}

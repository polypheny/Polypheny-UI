import {effect, Injector, Signal} from '@angular/core';
import {GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin} from 'rete-area-plugin';
import {ClassicFlow, ConnectionPlugin, getSourceTarget} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/17';
import {EdgeModel, EdgeState, RenderModel, WorkflowState} from '../../../models/workflows.model';
import {ActivityComponent, ActivityNode} from './activity/activity.component';
import {Edge, EdgeComponent} from './edge/edge.component';
import {ActivityPortComponent} from './activity-port/activity-port.component';
import {addCustomBackground} from '../../../../../components/polyalg/polyalg-viewer/background';
import {ReadonlyPlugin} from 'rete-readonly-plugin';
import {setupPanningBoundary} from '../../../../../components/polyalg/polyalg-viewer/panning-boundary';
import {MagneticConnectionComponent} from '../../../../../components/polyalg/polyalg-viewer/magnetic-connection/magnetic-connection.component';
import {AutoArrangePlugin, Presets as ArrangePresets} from 'rete-auto-arrange-plugin';
import {WorkflowsService} from '../../../services/workflows.service';
import {ActivityRegistry} from '../../../models/activity-registry.model';
import {debounceTime, Subject, Subscription} from 'rxjs';
import {Position} from 'rete-angular-plugin/17/types';
import {canCreateConnection, getContextMenuItems, getMagneticConnectionProps, socketsToEdgeModel} from './workflow-editor-utils';
import {Activity, edgeToString, Workflow} from '../workflow';
import {ContextMenuExtra, ContextMenuPlugin} from 'rete-context-menu-plugin';
import {useMagneticConnection} from '../../../../../components/polyalg/polyalg-viewer/magnetic-connection';

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
    private readonly registry: ActivityRegistry;
    private readonly translateSubjects: { [key: string]: Subject<Position> } = {}; // debounce the translation of activities
    private readonly debouncedTranslateSubject = new Subject<{ activityId: string, pos: Position }>();
    private readonly DEBOUNCE_TIME_MS = 100;
    private readonly removeActivitySubject = new Subject<string>(); // activityId
    private readonly cloneActivitySubject = new Subject<string>(); // activityId
    private readonly removeEdgeSubject = new Subject<EdgeModel>();
    private readonly createEdgeSubject = new Subject<EdgeModel>();
    private readonly executeActivitySubject = new Subject<string>(); // activityId
    private readonly resetActivitySubject = new Subject<string>(); // activityId
    private readonly openSettingsSubject = new Subject<string>(); // activityId
    private readonly subscriptions = new Subscription();

    constructor(private injector: Injector, container: HTMLElement, private readonly _workflows: WorkflowsService, private readonly isReadOnly: boolean) {
        this.area = new AreaPlugin<Schemes, AreaExtra>(container);
        this.render = new AngularPlugin<Schemes, AreaExtra>({injector});
        this.registry = _workflows.getRegistry();

        this.render.addPreset(
            Presets.classic.setup({
                customize: {
                    node() {
                        return ActivityComponent;
                    },
                    connection(data) {
                        if (data.payload.isMagnetic) {
                            return MagneticConnectionComponent;
                        }
                        return EdgeComponent;
                    },
                    socket() {
                        return ActivityPortComponent;
                    },
                },
            })
        );
        this.render.addPreset(Presets.contextMenu.setup({delay: 100})); // time in ms for context menu to close

        this.connection.addPreset(() => new ClassicFlow({
            canMakeConnection: (from, to): boolean => {
                const [source, target] = getSourceTarget(from, to) || [null, null];
                return canCreateConnection(source, target, this.editor);
            },
            makeConnection: (from, to, context) => {
                const [source, target] = getSourceTarget(from, to) || [null, null];
                if (source && target) {
                    this.createEdgeSubject.next(socketsToEdgeModel(source, target, this.editor));
                    return true;
                }
            }
        }));

        this.arrange.addPreset(ArrangePresets.classic.setup({top: 100, bottom: 100}));
        /* TODO: customize according to definitive port positions
        this.arrange.addPreset(() => {
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
        }); */

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
            } else if (!['pointermove', 'render', 'rendered', 'rendered', 'zoom', 'zoomed', 'translate', 'translated', 'nodetranslate', 'unmount'].includes(context.type)) {
                //console.log(context);
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

        if (requiresArranging) {
            await this.arrangeNodes();
        }

        const selector = AreaExtensions.selector();
        AreaExtensions.selectableNodes(this.area, selector, {
            accumulating: AreaExtensions.accumulateOnCtrl(),
        });

        if (!this.isReadOnly) {
            this.area.use(this.connection);  // make connections editable

            const contextMenu: ContextMenuPlugin<Schemes> = new ContextMenuPlugin<Schemes>({
                items: getContextMenuItems(this.removeEdgeSubject, this.removeActivitySubject, this.cloneActivitySubject)
            });

            this.area.use(contextMenu); // add context menu
            useMagneticConnection(this.connection, getMagneticConnectionProps(this.editor, this.createEdgeSubject));
            this.panningBoundary = setupPanningBoundary({area: this.area, selector, padding: 40, intensity: 2});
        }

        AreaExtensions.zoomAt(this.area, this.editor.getNodes());
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

    onEdgeRemove() {
        return this.removeEdgeSubject.asObservable();
    }

    onEdgeCreate() {
        return this.createEdgeSubject.asObservable();
    }

    async arrangeNodes() {
        await this.arrange.layout({applier: undefined});
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
    }

    private async addNode(activity: Activity) {
        const node = new ActivityNode(activity, this.workflow.state,
            this.executeActivitySubject, this.resetActivitySubject, this.openSettingsSubject);
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
        await this.editor.addConnection(connection);
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
            this.editor.removeConnection(connection.id);
        }

        this.connectionMap.delete(edgeString);
    }

    private addSubscriptions() {
        effect(() => {
            if (!this.isReadOnly) {
                const state = this.workflow.state();
                if (state === WorkflowState.EXECUTING) {
                    this.readonlyPlugin.enable();
                } else {
                    this.readonlyPlugin.disable();
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
    }
}

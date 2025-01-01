import {Injector} from '@angular/core';
import {GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin} from 'rete-area-plugin';
import {ClassicFlow, ConnectionPlugin, getSourceTarget} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/15';
import {ActivityState, EdgeModel, EdgeState, RenderModel, WorkflowModel} from '../../../models/workflows.model';
import {ActivityComponent, ActivityNode, IN_CONTROL_KEY} from './activity/activity.component';
import {Edge, EdgeComponent} from './edge/edge.component';
import {ActivityPortComponent} from './activity-port/activity-port.component';
import {addCustomBackground} from '../../../../../components/polyalg/polyalg-viewer/background';
import {ReadonlyPlugin} from 'rete-readonly-plugin';
import {setupPanningBoundary} from '../../../../../components/polyalg/polyalg-viewer/panning-boundary';
import {MagneticConnectionComponent} from '../../../../../components/polyalg/polyalg-viewer/magnetic-connection/magnetic-connection.component';
import {AutoArrangePlugin, Presets as ArrangePresets} from 'rete-auto-arrange-plugin';
import {WorkflowsService} from '../../../services/workflows.service';
import {ActivityRegistry} from '../../../models/activity-registry.model';
import {debounceTime, Subject} from 'rxjs';
import {Position} from 'rete-angular-plugin/17/types';
import {useMagneticConnection} from '../../../../../components/polyalg/polyalg-viewer/magnetic-connection';
import {getMagneticConnectionProps} from './workflow-editor-utils';

export type Schemes = GetSchemes<ActivityNode, Edge<ActivityNode>>;
type AreaExtra = AngularArea2D<Schemes>;

export class WorkflowEditor {
    private readonly editor: NodeEditor<Schemes> = new NodeEditor<Schemes>();
    private readonly connection: ConnectionPlugin<Schemes, AreaExtra> = new ConnectionPlugin<Schemes, AreaExtra>();
    private readonly readonlyPlugin = new ReadonlyPlugin<Schemes>();
    private readonly area: AreaPlugin<Schemes, AreaExtra>;
    private readonly render: AngularPlugin<Schemes, AreaExtra>;
    private readonly arrange = new AutoArrangePlugin<Schemes>();
    private readonly nodeMap: Map<string, ActivityNode> = new Map(); // uuid to activitynode
    private readonly connectionMap: Map<string, Edge<ActivityNode>[]> = new Map(); // source uuid to array of out edges
    private readonly nodeIdToActivityId: Map<string, string> = new Map();
    private panningBoundary: { destroy: any; };

    private readonly registry: ActivityRegistry;
    private readonly translateSubjects: { [key: string]: Subject<Position> } = {}; // debounce the translation of activities
    private readonly debouncedTranslateSubject = new Subject<{ activityId: string, pos: Position }>();
    private readonly DEBOUNCE_TIME_MS = 200;

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
                            console.log('its magnetic!');
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

        this.connection.addPreset(() => new ClassicFlow({
            makeConnection(from, to, context) {
                const [source, target] = getSourceTarget(from, to) || [null, null];
                const {editor} = context;

                if (source && target) {
                    // TODO: inform backend about change (maybe wait with connection creation for response)
                    editor.addConnection(
                        new Edge(
                            editor.getNode(source.nodeId),
                            source.key,
                            editor.getNode(target.nodeId),
                            target.key,
                            target.key === IN_CONTROL_KEY,
                            EdgeState.IDLE
                        )
                    );
                    return true; // ensure that the connection has been successfully added
                }
            }
        }));
        this.arrange.addPreset(ArrangePresets.classic.setup());


        // Attach plugins
        this.editor.use(this.readonlyPlugin.root);
        this.editor.use(this.area);
        this.area.use(this.connection);
        this.area.use(this.render);
        this.area.use(this.readonlyPlugin.area);
        this.area.use(this.arrange);

        AreaExtensions.restrictor(this.area, {scaling: {min: 0.03, max: 5}}); // Restrict Zoom
        AreaExtensions.simpleNodesOrder(this.area);
        addCustomBackground(this.area);

        this.area.addPipe(context => {
            if (context.type === 'zoom' && context.data.source === 'dblclick') {
                return; // https://github.com/retejs/rete/issues/204
            } else if (context.type === 'nodetranslated') {
                this.translateSubjects[this.nodeIdToActivityId.get(context.data.id)].next(context.data.position);
            } else if (context.type !== 'pointermove') {
                //console.log(context);
            }
            return context;
        });
    }

    async initialize(workflow: WorkflowModel): Promise<void> {

        let requiresArranging = true;
        for (const activity of workflow.activities) {
            const node = new ActivityNode(this.registry.getDef(activity.type), activity.id, activity.state, 0);
            this.nodeMap.set(activity.id, node);
            this.nodeIdToActivityId.set(node.id, activity.id);
            const translateSubject = new Subject<Position>();
            translateSubject.pipe(
                debounceTime(this.DEBOUNCE_TIME_MS)
            ).subscribe(pos => this.debouncedTranslateSubject.next({activityId: activity.id, pos: pos}));
            this.translateSubjects[activity.id] = translateSubject;
            await this.editor.addNode(node);
            if (activity.rendering.posX !== 0 || activity.rendering.posY !== 0) {
                requiresArranging = false;
                await this.area.translate(node.id, {x: activity.rendering.posX, y: activity.rendering.posY});
            }
        }

        for (const edge of workflow.edges) {
            const from = this.nodeMap.get(edge.fromId);
            const to = this.nodeMap.get(edge.toId);

            const connection = edge.isControl ? Edge.createControlEdge(from, to, edge.fromPort, edge.state) :
                Edge.createDataEdge(from, edge.fromPort, to, edge.toPort, edge.state);

            const edges = this.connectionMap.get(edge.fromId) || [];
            edges.push(connection);
            this.connectionMap.set(edge.fromId, edges);
            await this.editor.addConnection(connection);
        }
        if (requiresArranging) {
            const res = await this.arrange.layout({applier: undefined});
            console.log(res);
        }

        AreaExtensions.zoomAt(this.area, this.editor.getNodes());

        const selector = AreaExtensions.selector();
        AreaExtensions.selectableNodes(this.area, selector, {
            accumulating: AreaExtensions.accumulateOnCtrl(),
        });


        if (!this.isReadOnly) {
            this.area.use(this.connection);  // make connections editable
            //this.area.use(this.contextMenu); // add context menu
            useMagneticConnection(this.connection, getMagneticConnectionProps(this.editor));
            this.panningBoundary = setupPanningBoundary({area: this.area, selector, padding: 40, intensity: 2});
        }
    }

    onActivityTranslate() {
        return this.debouncedTranslateSubject.asObservable();
    }

    setActivityState(id: string, state: ActivityState) {
        // TODO: handle unknown activity
        const node = this.nodeMap.get(id);
        node.state = state;
        this.area.update('node', node.id);
    }

    setEdgeState(edge: EdgeModel) {
        // TODO: handle unknown edge
        const connection = this.connectionMap.get(edge.fromId).find(connection => connection.isEquivalent(edge));
        connection.state.set(edge.state);
        this.area.update('connection', connection.id);
    }

    setActivityProgress(id: string, progress: number) {
        const node = this.nodeMap.get(id);
        node.progress = progress;
        this.area.update('node', node.id);
    }

    setActivityPosition(id: string, rendering: RenderModel) {
        const node = this.nodeMap.get(id);
        this.area.translate(node.id, {x: rendering.posX, y: rendering.posY});
    }

    destroy(): void {
        Object.values(this.translateSubjects).forEach((subject) => subject.complete());
        this.area.destroy();
        this.panningBoundary?.destroy();
    }
}

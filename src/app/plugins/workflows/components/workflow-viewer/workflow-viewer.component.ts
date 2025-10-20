import {Component, computed, effect, ElementRef, EventEmitter, Injector, Input, OnDestroy, OnInit, Output, signal, Signal, ViewChild, ViewEncapsulation} from '@angular/core';
import {WorkflowsService} from '../../services/workflows.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {WorkflowEditor} from './editor/workflow-editor';
import {ActivityUpdateResponse, ErrorResponse, ProgressUpdateResponse, RenderingUpdateResponse, ResponseType, StateUpdateResponse, WsResponse} from '../../models/ws-response.model';
import {filter, Subscription} from 'rxjs';
import {Position} from 'rete-angular-plugin/18/types';
import {Activity, Workflow} from './workflow';
import {ActivityState, SessionModel, WorkflowDefModel, WorkflowState} from '../../models/workflows.model';
import {RightMenuComponent} from './right-menu/right-menu.component';
import {switchMap, tap} from 'rxjs/operators';
import {WorkflowConfigEditorComponent} from './workflow-config-editor/workflow-config-editor.component';
import {WorkflowsWebSocketService} from '../../services/workflows-websocket.service';
import {JsonEditorComponent} from '../../../../components/json/json-editor.component';
import {CheckpointViewerService} from '../../services/checkpoint-viewer.service';
import {Router} from '@angular/router';
import {ExecutionMonitorComponent} from './execution-monitor/execution-monitor.component';
import {WorkflowHelpComponent} from './workflow-help/workflow-help.component';
import {WORKFLOW_DESCRIPTION_LENGTH} from '../workflows-dashboard/workflows-dashboard.component';

@Component({
    selector: 'app-workflow-viewer',
    templateUrl: './workflow-viewer.component.html',
    styleUrl: './workflow-viewer.component.scss',
    providers: [WorkflowsWebSocketService, CheckpointViewerService],
    encapsulation: ViewEncapsulation.None // required to be able to style the rete context menu
    ,
    standalone: false
})
export class WorkflowViewerComponent implements OnInit, OnDestroy {
    @Input() sessionId: string;
    @Input() isEditable: boolean;
    @Input() name: string;
    @Input() canTerminate = true;
    @Input() workflowDef?: WorkflowDefModel;

    @Output() saveWorkflowEvent = new EventEmitter<string>();
    @Output() close = new EventEmitter<void>();
    @Output() terminate = new EventEmitter<void>();
    @Output() openNested = new EventEmitter<SessionModel>();
    @Output() reloadViewer = new EventEmitter<void>();
    @Output() rename = new EventEmitter<{ name: string, description: string }>();

    @ViewChild('rete') container!: ElementRef;
    @ViewChild('leftMenu') leftMenu: RightMenuComponent;
    @ViewChild('rightMenu') rightMenu: RightMenuComponent;
    @ViewChild('workflowConfigEditor') workflowConfigEditor: WorkflowConfigEditorComponent;
    @ViewChild('executionMonitor') executionMonitor: ExecutionMonitorComponent;
    @ViewChild('variableEditor') variableEditor: JsonEditorComponent;
    @ViewChild('workflowHelp') workflowHelp: WorkflowHelpComponent;

    private readonly registry = this._workflows.getRegistry();
    private readonly subscriptions = new Subscription();
    private editor: WorkflowEditor;
    workflow: Workflow;
    isExecuting: Signal<boolean>;
    canExecute: Signal<boolean>;
    openedActivity: Signal<Activity>;

    readonly terminateConfirm = signal(false);
    private isTerminating = false;
    readonly showSaveModal = signal(false);
    saveMessage = '';
    readonly showVariableModal = signal(false);
    serializedVariables: Signal<string>;
    readonly editedVariables = signal<string>(null);
    readonly hasVariablesChanged = computed(() => this.serializedVariables?.() !== this.editedVariables());


    readonly showRenameModal = signal(false);
    readonly renameData = {name: '', description: ''};
    protected readonly WORKFLOW_DESCRIPTION_LENGTH = WORKFLOW_DESCRIPTION_LENGTH;


    constructor(
        private readonly _workflows: WorkflowsService,
        private readonly _toast: ToasterService,
        private readonly _websocket: WorkflowsWebSocketService,
        private readonly _router: Router,
        readonly _checkpoint: CheckpointViewerService,
        private injector: Injector) {

        effect(() => {
            if (!this._websocket.connected() && this.workflow) {
                this._toast.error('Lost the connection to the workflow session');
                this._router.navigate(['/views/workflows/dashboard']);
            }
        });
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            this.editor = new WorkflowEditor(this.injector, el, this.isEditable);
            this._workflows.getActiveWorkflow(this.sessionId).subscribe({
                next: res => {
                    this.workflow = new Workflow(res, this.registry, this.injector);
                    this.editor.initialize(this.workflow);
                    this._websocket.initWebSocket(this.sessionId);
                    this._websocket.onMessage().subscribe(msg => this.handleWsMsg(msg));
                    this.addSubscriptions();
                    this.isExecuting = computed(() => {
                        return this.workflow.state() !== WorkflowState.IDLE;
                    });
                    this.canExecute = computed(() => {
                        return !this.isExecuting() && this.workflow.hasUnfinishedActivities();
                    });
                    this.serializedVariables = computed(() => JSON.stringify(this.workflow?.variables()));
                    this.openedActivity = this.workflow.getOpenedActivity();
                }
            });
        }
    }

    execute() {
        if (!this.openedActivity() || [ActivityState.FINISHED, ActivityState.SAVED].includes(this.openedActivity().state())
            || this.rightMenu.canSafelyNavigate()) {
            this._websocket.execute();
        }
    }

    reset() {
        if (!this.openedActivity() || this.openedActivity().state() === ActivityState.IDLE
            || this.rightMenu.canSafelyNavigate()) {
            this._websocket.reset();
        }
    }

    interrupt() {
        this._websocket.interrupt();
    }

    arrangeNodes() {
        this.editor.arrangeNodes();
    }

    private addSubscriptions() {
        this.subscriptions.add(this.editor.onActivityTranslate().subscribe(
            ({activityId, pos}) => this.updateActivityPosition(activityId, pos)
        ));
        this.subscriptions.add(this.editor.onActivityRemove().subscribe(
            activityId => this._websocket.deleteActivity(activityId)
        ));
        this.subscriptions.add(this.editor.onActivityClone().subscribe(
            activityId => {
                if (this.openedActivity()?.id !== activityId || this.rightMenu.canSafelyNavigate()) {
                    const rendering = this.workflow.getActivity(activityId).rendering();
                    const delta = 50;
                    this._websocket.cloneActivity(activityId, rendering.posX + delta, rendering.posY + delta);
                }
            }
        ));
        this.subscriptions.add(this.editor.onEdgeRemove().subscribe(
            edge => this._websocket.deleteEdge(edge)
        ));
        this.subscriptions.add(this.editor.onMoveMulti().subscribe(
            ([edge, targetIndex]) => this._websocket.moveMultiEdge(edge, targetIndex)
        ));
        this.subscriptions.add(this.editor.onEdgeCreate().subscribe(
            edge => this._websocket.createEdge(edge)
        ));
        this.subscriptions.add(this.editor.onActivityExecute().subscribe(
            activityId => {
                if (!this.openedActivity() || (activityId !== this.openedActivity().id || this.rightMenu.canSafelyNavigate())) {
                    this._websocket.execute(activityId);
                }
            }
        ));
        this.subscriptions.add(this.editor.onActivityReset().subscribe(
            activityId => {
                if (!this.openedActivity() || (activityId !== this.openedActivity().id || this.rightMenu.canSafelyNavigate())) {
                    this._websocket.reset(activityId);
                }
            }
        ));
        this.subscriptions.add(this.editor.onOpenActivitySettings().subscribe(
            activityId => this.openActivitySettings(activityId)
        ));
        this.subscriptions.add(this.editor.onOpenNestedActivity().pipe(
            switchMap(activityId => this._workflows.getNestedSession(this.sessionId, activityId)),
            tap(sessionModel => {
                if (sessionModel) {
                    this.openNested.emit(sessionModel);
                } else {
                    this._toast.warn('Execute the activity to be able to access the nested workflow.');
                }
            })
        ).subscribe());
        this.subscriptions.add(this.editor.onOpenCheckpoint().subscribe(
            ([activityId, isInput, idx]) => {
                if (isInput) {
                    const edge = this.workflow.getInEdges(activityId, 'data').find(([edge,]) => edge.toPort === idx)?.[0];
                    if (edge) {
                        activityId = edge.fromId;
                        idx = edge.fromPort;
                    } else {
                        return;
                    }
                }
                const activity = this.workflow.getActivity(activityId);
                this._checkpoint.openCheckpoint(activity, idx, this.isEditable);
            }
        ));
        this.subscriptions.add(this.editor.onReloadEditor().subscribe(
            () => this.reloadViewer.emit()
        ));
        this.subscriptions.add(this.workflow.onActivityDirty().pipe(
            filter(activityId => this.openedActivity()?.id === activityId),
            switchMap(activityId => this._workflows.getActivity(this.sessionId, activityId)),
            tap(activityModel => this.workflow.updateOrCreateActivity(activityModel))
        ).subscribe());
    }

    private handleWsMsg(msg: { response: WsResponse, isDirect: boolean }) {
        const {response, isDirect} = msg;
        switch (response.type) {
            case ResponseType.STATE_UPDATE:
                const stateResponse = response as StateUpdateResponse;
                this.workflow.state.set(stateResponse.workflowState);
                if (!(this.workflow.updateActivityStates(stateResponse.activityStates,
                        stateResponse.rolledBack,
                        stateResponse.activityInvalidReasons,
                        stateResponse.activityInvalidSettings,
                        stateResponse.inTypePreviews,
                        stateResponse.outTypePreviews,
                        stateResponse.dynamicActivityNames)
                    && this.workflow.updateEdgeStates(stateResponse.edgeStates))) {
                    this.synchronizeWorkflow();
                }
                break;
            case ResponseType.PROGRESS_UPDATE:
                if (!this.workflow.updateProgress((response as ProgressUpdateResponse).progress)) {
                    this.synchronizeWorkflow();
                }
                break;
            case ResponseType.RENDERING_UPDATE:
                const renderResponse = response as RenderingUpdateResponse;
                if (!this.workflow.updateActivityRendering(renderResponse.activityId, renderResponse.rendering)) {
                    this.synchronizeWorkflow();
                }
                break;
            case ResponseType.ACTIVITY_UPDATE:
                this.workflow.updateOrCreateActivity((response as ActivityUpdateResponse).activity);
                break;
            case ResponseType.ERROR:
                if (isDirect) {
                    const errorResponse = response as ErrorResponse;
                    const cause = errorResponse.cause ? ': ' + errorResponse.cause : '';
                    this._toast.error(errorResponse.reason + cause, errorResponse.parentType + ' was unsuccessful');
                }
                break;
            case ResponseType.CHECKPOINT_DATA:
                break; // handled by checkpoint service
            default:
                console.warn('unhandled websocket response', response);
        }
    }

    openActivitySettings(activityId: string) {
        if (!this.openedActivity() || ((activityId !== this.openedActivity().id || !this.rightMenu.visible()) && this.rightMenu.canSafelyNavigate())) {
            this._workflows.getActivity(this.sessionId, activityId).subscribe(activityModel => {
                    this.workflow.updateOrCreateActivity(activityModel);
                    this.workflow.setOpenedActivity(activityModel.id);
                    this.rightMenu.visible.set(true);
                }
            );
        }
    }

    private synchronizeWorkflow() {
        // if workflow is not in sync, we get a consistent workflow by fetching and updating the entire workflow
        this._workflows.getActiveWorkflow(this.sessionId).subscribe(workflowModel =>
            this.workflow.update(workflowModel)
        );
    }

    private updateActivityPosition(activityId: string, pos: Position) {
        const rendering = this.workflow.getActivity(activityId).rendering();
        if (rendering.posX === pos.x && rendering.posY === rendering.posY) {
            return;
        }
        const modifiedRendering = {
            ...rendering,
            posX: pos.x,
            posY: pos.y
        };
        // the workflow is getting updated by the websocket broadcast
        this._websocket.updateActivity(activityId, null, null, modifiedRendering);
    }

    toggleSaveModal() {
        this.showSaveModal.update(b => !b);
    }

    saveWorkflow() {
        this.saveWorkflowEvent.emit(this.saveMessage || 'Manual Save');
        this.toggleSaveModal();
        this.saveMessage = '';
    }

    onTerminateClick() {
        if (!this.canTerminate) {
            return;
        }
        if (!this.terminateConfirm()) {
            if (this.isTerminating) {
                this._toast.warn('Termination is already in progress. Repeat the request regardless?');
            }
            this.terminateConfirm.set(true);
        } else {
            this.isTerminating = true;
            this.terminate.emit();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.editor?.destroy();
        this._websocket?.close();
    }

    showConfigModal() {
        this._workflows.getWorkflowConfig(this.sessionId).subscribe(config => {
            this.workflow.config.set(config);
            this.workflowConfigEditor.show();
        });
    }

    showMonitorModal() {
        this.executionMonitor.show();
    }

    showHelpModal() {
        this.workflowHelp.toggleHelpModal();
    }

    openVariableModal() {
        this._workflows.getWorkflowVariables(this.sessionId).subscribe(variables => {
            this.workflow.variables.set(variables);
            this.editedVariables.set(JSON.stringify(variables));
            setTimeout(() => { // wait for input of editor to change
                this.variableEditor?.addInitialValues(); // if not editable, nothing has to be added
                this.showVariableModal.set(true);
            }, 50);
        });

    }

    toggleVariableModal() {
        this.showVariableModal.update(b => !b);
    }

    saveVariables() {
        if (this.variableEditor.isValid()) {
            this._websocket.updateVariables(JSON.parse(this.editedVariables()));
            this.showVariableModal.set(false);
            this._workflows.getWorkflowVariables(this.sessionId).subscribe(variables =>
                this.workflow.variables.set(variables)
            );
        } else {
            this._toast.warn('Specified variables are invalid', 'Unable to save variables');
        }
    }

    createActivity(activityType: string) {
        const center = this.editor.getCenter();
        this._websocket.createActivity(activityType, {
            posX: center.x,
            posY: center.y,
            name: null,
            notes: null
        });
    }

    createActivityAt($event: [string, { x: number; y: number }]) {
        const [activityType, dropPos] = $event;
        const pos = this.editor.clientCoords2EditorCoords(dropPos);
        if (pos === null || !activityType) {
            return;
        }
        this._websocket.createActivity(activityType, {
            posX: pos.x,
            posY: pos.y,
            name: null,
            notes: null
        });
    }

    openRenameModal() {
        if (this.workflowDef) {
            this.renameData.name = this.workflowDef.name;
            this.renameData.description = this.workflowDef.description;
        }
        this.showRenameModal.set(true);
    }

    renameWorkflow() {
        this.rename.emit({...this.renameData});
        this.showRenameModal.set(false);
    }
}

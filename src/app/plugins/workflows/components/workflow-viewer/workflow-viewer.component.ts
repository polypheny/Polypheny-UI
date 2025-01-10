import {Component, computed, ElementRef, EventEmitter, Injector, Input, OnDestroy, OnInit, Output, signal, Signal, ViewChild} from '@angular/core';
import {WorkflowsService} from '../../services/workflows.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {WorkflowEditor} from './editor/workflow-editor';
import {ActivityUpdateResponse, ErrorResponse, ProgressUpdateResponse, RenderingUpdateResponse, ResponseType, StateUpdateResponse, WsResponse} from '../../models/ws-response.model';
import {filter, Subscription} from 'rxjs';
import {Position} from 'rete-angular-plugin/17/types';
import {Activity, Workflow} from './workflow';
import {WorkflowState} from '../../models/workflows.model';
import {RightMenuComponent} from './right-menu/right-menu.component';
import {switchMap, tap} from 'rxjs/operators';
import {WorkflowConfigEditorComponent} from './workflow-config-editor/workflow-config-editor.component';
import {WorkflowsWebSocketService} from '../../services/workflows-websocket.service';

@Component({
    selector: 'app-workflow-viewer',
    templateUrl: './workflow-viewer.component.html',
    styleUrl: './workflow-viewer.component.scss',
    providers: [WorkflowsWebSocketService]
})
export class WorkflowViewerComponent implements OnInit, OnDestroy {
    @Input() sessionId: string;
    @Input() isEditable: boolean;

    @Output() saveWorkflowEvent = new EventEmitter<string>();

    @ViewChild('rete') container!: ElementRef;
    @ViewChild('leftMenu') leftMenu: RightMenuComponent;
    @ViewChild('rightMenu') rightMenu: RightMenuComponent;
    @ViewChild('workflowConfigEditor') workflowConfigEditor: WorkflowConfigEditorComponent;

    private readonly registry = this._workflows.getRegistry();
    private readonly subscriptions = new Subscription();
    private editor: WorkflowEditor;
    workflow: Workflow;
    isExecuting: Signal<boolean>;
    canExecute: Signal<boolean>;
    readonly openedActivity = signal<Activity>(undefined);

    readonly showSaveModal = signal(false);
    saveMessage = '';


    constructor(
        private readonly _workflows: WorkflowsService,
        private readonly _toast: ToasterService,
        private readonly _websocket: WorkflowsWebSocketService,
        private injector: Injector) {
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            this.editor = new WorkflowEditor(this.injector, el, this._workflows, !this.isEditable);
            this._workflows.getActiveWorkflow(this.sessionId).subscribe({
                next: res => {
                    this.workflow = new Workflow(res, this.registry);
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
                }
            });
        }
    }

    execute() {
        this._websocket.execute();
    }

    reset() {
        this._websocket.reset();
    }

    interrupt() {
        this._websocket.interrupt();
    }

    arrangeNodes() {
        this.editor.arrangeNodes();
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

    private addSubscriptions() {
        this.subscriptions.add(this.editor.onActivityTranslate().subscribe(
            ({activityId, pos}) => this.updateActivityPosition(activityId, pos)
        ));
        this.subscriptions.add(this.editor.onActivityRemove().subscribe(
            activityId => this._websocket.deleteActivity(activityId)
        ));
        this.subscriptions.add(this.editor.onActivityClone().subscribe(
            activityId => {
                const rendering = this.workflow.getActivity(activityId).rendering();
                const delta = 50;
                this._websocket.cloneActivity(activityId, rendering.posX + delta, rendering.posY + delta);
            }
        ));
        this.subscriptions.add(this.editor.onEdgeRemove().subscribe(
            edge => this._websocket.deleteEdge(edge)
        ));
        this.subscriptions.add(this.editor.onEdgeCreate().subscribe(
            edge => this._websocket.createEdge(edge)
        ));
        this.subscriptions.add(this.editor.onActivityExecute().subscribe(
            activityId => this._websocket.execute(activityId)
        ));
        this.subscriptions.add(this.editor.onActivityReset().subscribe(
            activityId => this._websocket.reset(activityId)
        ));
        this.subscriptions.add(this.editor.onOpenActivitySettings().pipe(
            switchMap(activityId => this._workflows.getActivity(this.sessionId, activityId)),
            tap(activityModel => {
                this.workflow.updateOrCreateActivity(activityModel);
                this.openedActivity.set(this.workflow.getActivity(activityModel.id));
                this.rightMenu.showMenu();
            })
        ).subscribe());
        this.subscriptions.add(this.workflow.onActivityRemove().subscribe(
            activityId => {
                if (this.openedActivity()?.id === activityId) {
                    this.openedActivity.set(null);
                }
            }
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
                if (!(this.workflow.updateActivityStates(stateResponse.activityStates)
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
            default:
                console.warn('unhandled websocket response', response);
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
}

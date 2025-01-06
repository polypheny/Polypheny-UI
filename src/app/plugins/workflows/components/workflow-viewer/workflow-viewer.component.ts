import {Component, computed, ElementRef, EventEmitter, inject, Injector, Input, OnDestroy, OnInit, Output, signal, Signal, ViewChild} from '@angular/core';
import {WorkflowsService} from '../../services/workflows.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {WorkflowEditor} from './editor/workflow-editor';
import {WorkflowsWebSocket} from '../../services/workflows-webSocket';
import {ActivityUpdateResponse, ErrorResponse, ProgressUpdateResponse, RenderingUpdateResponse, ResponseType, StateUpdateResponse, WsResponse} from '../../models/ws-response.model';
import {Subscription} from 'rxjs';
import {Position} from 'rete-angular-plugin/17/types';
import {Workflow} from './workflow';
import {WorkflowState} from '../../models/workflows.model';

@Component({
    selector: 'app-workflow-viewer',
    templateUrl: './workflow-viewer.component.html',
    styleUrl: './workflow-viewer.component.scss'
})
export class WorkflowViewerComponent implements OnInit, OnDestroy {
    @Input() sessionId: string;
    @Input() isEditable: boolean;

    @Output() saveWorkflowEvent = new EventEmitter<string>();

    @ViewChild('rete') container!: ElementRef;

    private readonly _workflows = inject(WorkflowsService);
    private readonly _toast = inject(ToasterService);
    private readonly registry = this._workflows.getRegistry();
    private readonly subscriptions = new Subscription();
    private readonly sentRequests = new Set<string>(); // contains the ws request ID until a response for that ID was received
    private readonly responsesToIgnore = new Set<string>();
    private editor: WorkflowEditor;
    private websocket: WorkflowsWebSocket;
    workflow: Workflow;
    canExecute: Signal<boolean>;
    selectedActivityType: string;
    readonly activityTypes: string[];

    readonly showSaveModal = signal(false);
    saveMessage = '';


    constructor(private injector: Injector) {
        this.activityTypes = this.registry.getTypes();
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            this.editor = new WorkflowEditor(this.injector, el, this._workflows, false);
            this._workflows.getActiveWorkflow(this.sessionId).subscribe({
                next: res => {
                    this.workflow = new Workflow(res);
                    this.editor.initialize(this.workflow);
                    this.websocket = this._workflows.createWebSocket(this.sessionId);
                    this.websocket.onMessage().subscribe(response => this.handleWsMsg(response));
                    this.subscriptions.add(this.editor.onActivityTranslate().subscribe(
                        ({activityId, pos}) => this.updateActivityPosition(activityId, pos)
                    ));
                    this.subscriptions.add(this.editor.onActivityRemove().subscribe(
                        activityId => this.sentRequests.add(this.websocket.deleteActivity(activityId))
                    ));
                    this.subscriptions.add(this.editor.onActivityClone().subscribe(
                        activityId => {
                            const rendering = this.workflow.getActivity(activityId).rendering();
                            const delta = 50;
                            this.sentRequests.add(this.websocket.cloneActivity(activityId, rendering.posX + delta, rendering.posY + delta));
                        }
                    ));
                    this.subscriptions.add(this.editor.onEdgeRemove().subscribe(
                        edge => this.sentRequests.add(this.websocket.deleteEdge(edge))
                    ));
                    this.subscriptions.add(this.editor.onEdgeCreate().subscribe(
                        edge => this.sentRequests.add(this.websocket.createEdge(edge))
                    ));
                    this.subscriptions.add(this.editor.onActivityExecute().subscribe(
                        activityId => this.sentRequests.add(this.websocket.execute(activityId))
                    ));
                    this.subscriptions.add(this.editor.onActivityReset().subscribe(
                        activityId => this.sentRequests.add(this.websocket.reset(activityId))
                    ));
                    this.canExecute = computed(() => {
                        return this.workflow.state() !== WorkflowState.EXECUTING && this.workflow.hasUnfinishedActivities();
                    });
                }
            });
        }
    }

    execute() {
        this.sentRequests.add(this.websocket.execute());
    }

    reset() {
        this.sentRequests.add(this.websocket.reset());
    }

    interrupt() {
        this.sentRequests.add(this.websocket.interrupt());
    }

    arrangeNodes() {
        this.editor.arrangeNodes();
    }

    createActivity() {
        this.sentRequests.add(
            this.websocket.createActivity(this.selectedActivityType, {
                posX: 0,
                posY: 0,
                name: '',
                notes: ''
            })
        );
    }

    private handleWsMsg(response: WsResponse) {
        if (this.responsesToIgnore.has(response.parentId)) {
            this.responsesToIgnore.delete(response.parentId);
            if (response.type !== ResponseType.ERROR) {
                return; // only ignore non-error responses
            }
        }
        const isDirectResponse = this.sentRequests.has(response.parentId) || !response.parentId;
        this.sentRequests.delete(response.parentId); // this might cause issues if multiple responses for 1 request are sent

        switch (response.type) {
            case ResponseType.STATE_UPDATE:
                // TODO: handle missing activities
                const stateResponse = response as StateUpdateResponse;
                this.workflow.state.set(stateResponse.workflowState);
                if (!(this.workflow.updateActivityStates(stateResponse.activityStates)
                    && this.workflow.updateEdgeStates(stateResponse.edgeStates))) {
                    this.synchronizeWorkflow();
                }
                break;
            case ResponseType.PROGRESS_UPDATE:
                // TODO: handle missing activities
                this.workflow.updateProgress((response as ProgressUpdateResponse).progress);
                break;
            case ResponseType.RENDERING_UPDATE:
                const renderResponse = response as RenderingUpdateResponse;
                this.workflow.updateActivityRendering(renderResponse.activityId, renderResponse.rendering);
                break;
            case ResponseType.ACTIVITY_UPDATE:
                this.workflow.updateOrCreateActivity((response as ActivityUpdateResponse).activity);
                break;
            case ResponseType.ERROR:
                if (isDirectResponse) {
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
        console.log('synchronizing workflow...');
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
        this.sentRequests.add(this.websocket.updateActivity(activityId, null, null, modifiedRendering));
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
        this.websocket?.close();
    }
}

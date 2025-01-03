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
                        activityId => this.websocket.deleteActivity(activityId)
                    ));
                    this.subscriptions.add(this.editor.onEdgeRemove().subscribe(
                        edge => this.websocket.deleteEdge(edge)
                    ));
                    this.subscriptions.add(this.editor.onEdgeCreate().subscribe(
                        edge => this.websocket.createEdge(edge)
                    ));
                    this.canExecute = computed(() => {
                        console.log('computing can execute', this.workflow.hasUnfinishedActivities());
                        return this.workflow.state() !== WorkflowState.EXECUTING && this.workflow.hasUnfinishedActivities();
                    });
                }
            });
        }
    }

    execute() {
        this.websocket.execute();
    }

    reset() {
        this.websocket.reset();
    }

    interrupt() {
        this.websocket.interrupt();
    }

    createActivity() {
        this.websocket.createActivity(this.selectedActivityType, {
            posX: 0,
            posY: 0,
            name: '',
            notes: ''
        });
    }

    private handleWsMsg(response: WsResponse) {
        if (this.responsesToIgnore.has(response.parentId)) {
            this.responsesToIgnore.delete(response.parentId);
            if (response.type !== ResponseType.ERROR) {
                return; // only ignore non-error responses
            }
        }
        switch (response.type) {
            case ResponseType.STATE_UPDATE:
                // TODO: handle missing activities
                const stateResponse = response as StateUpdateResponse;
                this.workflow.updateActivityStates(stateResponse.activityStates);
                this.workflow.updateEdgeStates(stateResponse.edgeStates);
                this.workflow.state.set(stateResponse.workflowState);
                break;
            case ResponseType.PROGRESS_UPDATE:
                // TODO: handle missing activities
                this.workflow.updateProgress((response as ProgressUpdateResponse).progress);
                //Object.entries((response as ProgressUpdateResponse).progress).forEach(([id, progress]) => this.editor.setActivityProgress(id, progress));
                break;
            case ResponseType.RENDERING_UPDATE:
                const renderResponse = response as RenderingUpdateResponse;
                this.workflow.updateActivityRendering(renderResponse.activityId, renderResponse.rendering);
                this.editor.setActivityPosition(renderResponse.activityId, renderResponse.rendering); // TODO: update position reactively
                break;
            case ResponseType.ACTIVITY_UPDATE:
                this.workflow.updateOrCreateActivity((response as ActivityUpdateResponse).activity);
                break;
            case ResponseType.ERROR:
                const errorResponse = response as ErrorResponse;
                const cause = errorResponse.cause ? ': ' + errorResponse.cause : '';
                this._toast.error(errorResponse.reason + cause, errorResponse.parentType + ' was unsuccessful');
                break;
            default:
                console.warn('unhandled websocket response', response);
        }
    }

    private updateActivityPosition(activityId: string, pos: Position) {
        const rendering = this.workflow.getActivity(activityId).rendering();
        if (rendering.posX === pos.x && rendering.posY === rendering.posY) {
            return;
        }
        const modifiedRendering = {
            // TODO: decide whether to update the actual workflow or wait for update from backend
            // (the component already uses the updated value, so it probably makes sense to update immediately)
            ...rendering,
            posX: pos.x,
            posY: pos.y
        };
        this.responsesToIgnore.add(this.websocket.updateActivity(activityId, null, null, modifiedRendering));
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

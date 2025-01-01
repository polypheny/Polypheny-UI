import {Component, ElementRef, inject, Injector, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WorkflowsService} from '../../services/workflows.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {WorkflowModel} from '../../models/workflows.model';
import {WorkflowEditor} from './editor/workflow-editor';
import {WorkflowsWebSocket} from '../../services/workflows-webSocket';
import {ErrorResponse, ProgressUpdateResponse, RenderingUpdateResponse, ResponseType, StateUpdateResponse, WsResponse} from '../../models/ws-response.model';
import {Subscription} from 'rxjs';
import {Position} from 'rete-angular-plugin/17/types';

@Component({
    selector: 'app-workflow-viewer',
    templateUrl: './workflow-viewer.component.html',
    styleUrl: './workflow-viewer.component.scss'
})
export class WorkflowViewerComponent implements OnInit, OnDestroy {
    @Input() sessionId: string;
    @Input() isEditable: boolean;

    @ViewChild('rete') container!: ElementRef;

    private readonly _workflows = inject(WorkflowsService);
    private readonly _toast = inject(ToasterService);
    private readonly registry = this._workflows.getRegistry();
    private readonly subscriptions = new Subscription();
    private readonly responsesToIgnore = new Set<string>();
    private editor: WorkflowEditor;
    private websocket: WorkflowsWebSocket;
    workflow: WorkflowModel;

    constructor(private injector: Injector) {
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            this.editor = new WorkflowEditor(this.injector, el, this._workflows, false);
        }
        this._workflows.getActiveWorkflow(this.sessionId).subscribe({
            next: res => {
                this.workflow = res;
                this.editor.initialize(res);
                this.websocket = this._workflows.createWebSocket(this.sessionId);
                this.websocket.onMessage().subscribe(response => this.handleWsMsg(response));
                this.subscriptions.add(this.editor.onActivityTranslate().subscribe(
                    ({activityId, pos}) => this.updateActivityPosition(activityId, pos)
                ));
            }
        });
    }

    execute() {
        console.log('executing...');
        this.websocket.execute();
    }

    reset() {
        console.log('resetting...');
        this.websocket.reset();
    }

    interrupt() {
        console.log('interrupting...');
        this.websocket.interrupt();
    }

    private handleWsMsg(response: WsResponse) {
        console.log(response);
        if (this.responsesToIgnore.has(response.parentId)) {
            console.log('ignored response!');
            this.responsesToIgnore.delete(response.parentId);
            return;
        }
        switch (response.type) {
            case ResponseType.STATE_UPDATE:
                // TODO: perform update in a workflow class, possibly using signals to propagate state to nodes
                const stateResponse = response as StateUpdateResponse;
                Object.entries(stateResponse.activityStates).forEach(([id, state]) => this.editor.setActivityState(id, state));
                stateResponse.edgeStates.map(edge => this.editor.setEdgeState(edge));
                break;
            case ResponseType.PROGRESS_UPDATE:
                // TODO: perform update in a workflow class, possibly using signals to propagate state to nodes
                Object.entries((response as ProgressUpdateResponse).progress).forEach(([id, progress]) => this.editor.setActivityProgress(id, progress));
                break;
            case ResponseType.RENDERING_UPDATE:
                // TODO: perform update in a workflow class, possibly using signals to propagate state to nodes
                const renderResponse = response as RenderingUpdateResponse;
                this.workflow.activities.find(a => a.id === renderResponse.activityId).rendering = renderResponse.rendering;
                this.editor.setActivityPosition(renderResponse.activityId, renderResponse.rendering);
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
        const rendering = this.workflow.activities.find(a => a.id === activityId).rendering;
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

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.editor?.destroy();
        this.websocket?.close();
    }
}

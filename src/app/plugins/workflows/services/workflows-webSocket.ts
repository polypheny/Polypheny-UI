import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import {signal} from '@angular/core';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {Observable, Subject} from 'rxjs';
import {RequestType, WsResponse} from '../models/ws-response.model';
import {ActivityConfigModel, EdgeModel, RenderModel, WorkflowConfigModel} from '../models/workflows.model';
import * as uuid from 'uuid';

export class WorkflowsWebSocket {
    private socket: WebSocketSubject<WsResponse>;
    public readonly connected = signal(false);
    private msgSubject = new Subject<WsResponse>();
    private keepalive: number;

    constructor(private readonly _settings: WebuiSettingsService, private readonly sessionId: string) {
        this.initWebSocket();
        this.keepalive = setInterval(() => {
            if (this.connected) {
                // @ts-ignore
                this.sendMessage({type: 'KEEPALIVE', msgId: uuid.v4()});
            }
        }, +this._settings.getSetting('reconnection.timeout'));
    }


    private initWebSocket() {
        this.socket = webSocket<WsResponse>({
            url: this._settings.getConnection('workflows.socket') + `/${this.sessionId}`,
            openObserver: {
                next: (n) => {
                    this.connected.set(true);
                }
            }
        });
        this.socket.subscribe({
            next: msg => this.msgSubject.next(msg),
            error: err => {
                console.log(err);
                this.connected.set(false);
                /*setTimeout(() => {
                    this.initWebSocket();
                }, +this._settings.getSetting('reconnection.timeout'));*/
            },
            complete: () => {
                console.log('completed');
                this.connected.set(false);
                this.msgSubject.complete();
            }
        });
    }

    private sendMessage(obj: any) {
        if (!this.connected()) {
            throw new Error('not connected');
        }
        this.socket.next(obj);
    }

    createActivity(activityType: string, rendering: RenderModel): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.CREATE_ACTIVITY,
            msgId: id,
            activityType: activityType,
            rendering: rendering
        };
        this.sendMessage(msg);
        return id;
    }

    updateActivity(targetId: string, settings?: Record<string, any>, config?: ActivityConfigModel, rendering?: RenderModel): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.UPDATE_ACTIVITY,
            msgId: id,
            targetId,
            settings,
            config,
            rendering,
        };
        this.sendMessage(msg);
        return id;
    }

    deleteActivity(targetId: string): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.DELETE_ACTIVITY,
            msgId: id,
            targetId,
        };
        this.sendMessage(msg);
        return id;
    }

    createEdge(edge: EdgeModel): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.CREATE_EDGE,
            msgId: id,
            edge,
        };
        this.sendMessage(msg);
        return id;
    }

    deleteEdge(edge: EdgeModel): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.DELETE_EDGE,
            msgId: id,
            edge,
        };
        this.sendMessage(msg);
        return id;
    }

    execute(targetId?: string): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.EXECUTE,
            msgId: id,
            targetId,
        };
        this.sendMessage(msg);
        return id;
    }

    interrupt(): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.INTERRUPT,
            msgId: id,
        };
        this.sendMessage(msg);
        return id;
    }

    reset(rootId?: string): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.RESET,
            msgId: id,
            rootId,
        };
        this.sendMessage(msg);
        return id;
    }

    updateConfig(workflowConfig: WorkflowConfigModel): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.UPDATE_CONFIG,
            msgId: id,
            workflowConfig,
        };
        this.sendMessage(msg);
        return id;
    }

    onMessage(): Observable<WsResponse> {
        return this.msgSubject;
    }

    close() {
        if (this.keepalive) {
            clearInterval(this.keepalive);
        }
        this.socket.complete();
    }


}

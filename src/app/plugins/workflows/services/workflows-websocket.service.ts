import {Injectable, signal} from '@angular/core';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import {RequestType, WsResponse} from '../models/ws-response.model';
import {Observable, Subject} from 'rxjs';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {ActivityConfigModel, EdgeModel, RenderModel, Variables, WorkflowConfigModel} from '../models/workflows.model';
import * as uuid from 'uuid';

interface Request {
    msgId: string;

    [key: string]: any;
}

@Injectable()
export class WorkflowsWebSocketService {
    private socket: WebSocketSubject<WsResponse>;
    public readonly connected = signal(false);
    private msgSubject = new Subject<{ response: WsResponse, isDirect: boolean }>(); // whether it is a direct response to a request originating here
    private keepalive: number;
    private sessionId: string;
    private readonly sentRequests = new Set<string>(); // contains the ws request ID until a response for that ID was received

    constructor(private readonly _settings: WebuiSettingsService) {
    }


    initWebSocket(sessionId: string) {
        if (this.sessionId === sessionId) {
            return;
        }
        if (this.socket) {
            this.close();
        }
        this.sessionId = sessionId;

        this.socket = webSocket<WsResponse>({
            url: this._settings.getConnection('workflows.socket') + `/${this.sessionId}`,
            openObserver: {
                next: (n) => {
                    this.connected.set(true);
                }
            }
        });
        this.socket.subscribe({
            next: msg => {
                const isDirect = this.sentRequests.delete(msg.parentId) || !msg.parentId;
                this.msgSubject.next({response: msg, isDirect});
            },
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

        this.keepalive = setInterval(() => {
            if (this.connected) {
                // @ts-ignore
                this.sendMessage({type: 'KEEPALIVE', msgId: uuid.v4()});
            }
        }, +this._settings.getSetting('reconnection.timeout'));
    }

    private sendMessage(obj: Request) {
        if (!this.connected()) {
            throw new Error('not connected');
        }
        this.sentRequests.add(obj.msgId);
        this.socket.next(obj as any);
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

    cloneActivity(targetId: string, posX: number, posY: number): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.CLONE_ACTIVITY,
            msgId: id,
            targetId,
            posX,
            posY
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

    updateVariables(variables: Variables): string {
        const id = uuid.v4();
        const msg = {
            type: RequestType.UPDATE_VARIABLES,
            msgId: id,
            variables,
        };
        this.sendMessage(msg);
        return id;
    }

    onMessage(): Observable<{ response: WsResponse, isDirect: boolean }> {
        return this.msgSubject.asObservable();
    }

    close() {
        if (this.keepalive) {
            clearInterval(this.keepalive);
        }
        this.socket.complete();
    }
}

import {Subject} from 'rxjs';
import {webSocket} from 'rxjs/webSocket';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import * as uuid from 'uuid';
import {KernelMsg} from '../models/kernel-response.model';

export class NotebooksWebSocket {
    private socket;
    connected = false;
    private msgSubject = new Subject<KernelMsg>();

    constructor(private _settings: WebuiSettingsService, kernelId: string) {
        console.log('instantiating new websocket...');
        this.initWebSocket(kernelId);
    }

    private initWebSocket(kernelId: string) {
        console.log('init websocket...');
        this.socket = webSocket({
            url: this._settings.getConnection('notebooks.socket') + `/${kernelId}`,
            openObserver: {
                next: (n) => {
                    this.connected = true;
                }
            }
        });
        this.socket.subscribe(
            msg => {
                this.msgSubject.next(msg);
            },
            err => {
                this.connected = false;
                console.error('websocket error:', err);
            },
            () => {
                console.log('closed websocket...');
                this.connected = false;
                this.msgSubject.complete();
            }
        );
    }

    sendMessage(obj: any): boolean {
        this.socket.next(obj);
        return this.connected;
    }

    onMessage() {
        return this.msgSubject.pipe();
    }

    close() {
        this.socket.complete();
    }

    requestExecutionState() {
        const msg = {
            uuid: uuid.v4(),
            type: 'status',
            content: null
        };
        this.sendMessage(msg);
    }

    sendCode(code: string[] | string): string {
        const codeStr = (typeof code === 'string') ?
            code : code.join('/n');
        console.warn('sending', codeStr);

        const id = uuid.v4();
        const msg = {
            uuid: id,
            type: 'code',
            content: codeStr
        };
        this.sendMessage(msg);
        return id;
    }

    sendQuery(query: string[] | string, language: string, namespace: string, variable: string): string {
        const queryStr = (typeof query === 'string') ?
            query : query.join('/n');
        console.warn('sending', queryStr);

        const id = uuid.v4();
        const msg = {
            uuid: id,
            type: 'poly',
            content: queryStr,
            language: language,
            namespace: namespace,
            variable: variable
        };
        this.sendMessage(msg);
        return id;
    }
}

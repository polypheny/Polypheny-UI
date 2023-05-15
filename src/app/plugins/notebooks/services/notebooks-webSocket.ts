import {Subject} from 'rxjs';
import {webSocket} from 'rxjs/webSocket';
import {WebuiSettingsService} from '../../../services/webui-settings.service';

export class NotebooksWebSocket {
    private socket;
    connected = false;
    private msgSubject = new Subject();

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
}

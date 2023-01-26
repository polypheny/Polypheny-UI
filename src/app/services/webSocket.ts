import {Subject} from 'rxjs';
import {EventEmitter} from '@angular/core';
import {WebuiSettingsService} from './webui-settings.service';
import {webSocket} from 'rxjs/webSocket';

export class WebSocket {
    private socket;
    connected = false;
    private msgSubject = new Subject();
    private reconnected = new EventEmitter<boolean>();

    constructor(private _settings: WebuiSettingsService) {
        this.initWebSocket(false);
        setInterval(() => {
            if (this.connected) {
                this.socket.next('keepalive');
            }
        }, 10_000);
    }

    private initWebSocket(reconnect: boolean) {
        this.socket = webSocket({
            url: this._settings.getConnection('crud.socket'),
            openObserver: {
                next: (n) => {
                    this.connected = true;
                    if (reconnect) {
                        this.reconnected.emit(true);
                    }
                }
            }
        });
        this.socket.subscribe(
            msg => {
                this.msgSubject.next(msg);
            },
            err => {
                this.connected = false;
                setTimeout(() => {
                    this.initWebSocket(true);
                }, +this._settings.getSetting('reconnection.timeout'));
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

    onReconnect() {
        return this.reconnected;
    }

    close() {
        this.socket.complete();
        //this will unsubscribe all listeners, see https://stackoverflow.com/questions/52198240
        this.msgSubject.complete();
    }
}

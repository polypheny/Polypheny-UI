import {Injectable} from '@angular/core';
import * as io from 'socket.io-client';
import {Observable} from 'rxjs';
import {WebuiSettingsService} from './webui-settings.service';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {

    socket: any;
    running: boolean;

    constructor(private _settings: WebuiSettingsService) {
        this.running = false;
    }

    startConnection() {
        if (!this.running) {
            this.socket = io(this._settings.getConnection('websocketGestureRecognition'));
        } else {
            this.socket.off('event-name');
            this.socket.disconnect();
        }
        this.running = !this.running;
    }

    listen(eventName: string) {
        return new Observable((subscriber) => {
            this.socket.on(eventName, (data) => {
                subscriber.next(data);
            });
        });
    }
}

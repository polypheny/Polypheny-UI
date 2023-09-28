import {Injectable, signal, WritableSignal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {DbmsTypesService} from './dbms-types.service';
import {WebSocket} from './webSocket';
import {RegisterRequest} from '../models/ui-request.model';


@Injectable({
    providedIn: 'root'
})
export class AuthService {
    public readonly id: WritableSignal<string> = signal(null);
    private httpUrl = this._settings.getConnection('crud.rest');
    private readonly status: WritableSignal<ConnectionStatus> = signal(ConnectionStatus.INITIAL);
    public websocket: WebSocket;

    constructor(
        private _http: HttpClient,
        private _settings: WebuiSettingsService,
        private _types: DbmsTypesService,
    ) {
        this.websocket = new WebSocket(_settings);
        this.initWebsocket();
    }

    private initWebsocket() {
        console.log('hi');
        const msg = new RegisterRequest();
        this.websocket.sendMessage(msg);

        this.websocket.onMessage().subscribe(res => {
            console.log(res);
            this.id.set(res);
            this.status.set(ConnectionStatus.CONNECTED);
        });

    }
}


enum ConnectionStatus {
    DISCONNECTED,
    CONNECTED,
    INITIAL
}

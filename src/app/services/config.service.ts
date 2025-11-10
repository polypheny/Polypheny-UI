import {EventEmitter, inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {webSocket} from 'rxjs/webSocket';
import {WebuiSettingsService} from './webui-settings.service';
import {JavaUiConfig} from '../views/forms/form-generator/form-generator.component';
import {Observable} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {

    private readonly _http = inject(HttpClient);
    private readonly _settings = inject(WebuiSettingsService);

    private socket;
    public connected = false;
    private reconnected = new EventEmitter<boolean>();
    httpUrl;
    httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

    constructor() {
        this.initWebSocket();
        this.httpUrl = this._settings.getConnection('config.rest');
    }


    getPage(pageId: string) {
        return this._http.post(`${this.httpUrl}/getPage`, pageId, this.httpOptions);
    }

    getConfig(configKey: string): Observable<JavaUiConfig> {
        return this._http.post<JavaUiConfig>(`${this.httpUrl}/getConfig`, configKey, this.httpOptions);
    }

    getPageList() {
        return this._http.get(`${this.httpUrl}/getPageList`, this.httpOptions);
    }

    saveChanges(data) {
        return this._http.post(`${this.httpUrl}/updateConfigs`, data, this.httpOptions);
    }

    testConnection(dockerInstanceId: number) {
        // we only have a connection for the configs but this is a more general request and goes to crud
        return this._http.get(`${this._settings.getConnection('crud.rest')}/testDockerInstance/${dockerInstanceId}`, this.httpOptions);
    }


    //https://rxjs-dev.firebaseapp.com/api/webSocket/webSocket
    private initWebSocket() {
        this.socket = webSocket({
            url: this._settings.getConnection('config.socket'),
            openObserver: {
                next: (n) => {
                    this.reconnected.emit(true);
                    this.connected = true;
                }
            }
        });
        this.socket.subscribe(
            msg => {
            },
            err => {
                //this.reconnected.emit(false);
                this.connected = false;
                setTimeout(() => {
                    this.initWebSocket();
                }, +this._settings.getSetting('reconnection.timeout'));
            }
        );
    }

    socketSend(msg: string) {
        this.socket.next(msg);
    }

    onSocketEvent() {
        return this.socket;
    }

    closeSocket() {
        this.socket.complete();
    }

    onReconnection() {
        return this.reconnected;
    }

}

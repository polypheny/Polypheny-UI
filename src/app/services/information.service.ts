import {EventEmitter, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {webSocket} from 'rxjs/webSocket';
import {WebuiSettingsService} from './webui-settings.service';
import {InformationObject} from '../models/information-page.model';

@Injectable({
    providedIn: 'root'
})
export class InformationService {
    private enabledPlugins: [string] = null;

  constructor( private _http:HttpClient, private _settings:WebuiSettingsService ) {
    this.initWebSocket();
  }

  public connected = false;
  private reconnected = new EventEmitter<boolean>();
  private socket;
  httpUrl = this._settings.getConnection('information.rest');
  httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

  getPage(pageId: string) {
    return this._http.post(`${this.httpUrl}/getPage`, pageId, this.httpOptions);
  }

  getPageList() {
    return this._http.get(`${this.httpUrl}/getPageList`, this.httpOptions);
  }

  refreshPage(id: string) {
    return this._http.post(`${this.httpUrl}/refreshPage`, id, this.httpOptions);
  }

  refreshGroup(id: string) {
    return this._http.post(`${this.httpUrl}/refreshGroup`, id, this.httpOptions);
  }

  executeAction(i: InformationObject) {
    return this._http.post(`${this.httpUrl}/executeAction`, JSON.stringify(i), this.httpOptions);
  }

    getEnabledPlugins(): string[] {
        if( this.enabledPlugins == null ) {
            this._http.get(`${this.httpUrl}/getEnabledPlugins`, this.httpOptions)
                .subscribe(res => {
                    this.enabledPlugins = <[string]>res;
                });
            return [];
        }
        return this.enabledPlugins;
    }

    //websocket:
    //https://rxjs-dev.firebaseapp.com/api/webSocket/webSocket
    //openObserver:
    //https://rxjs-dev.firebaseapp.com/api/webSocket/WebSocketSubjectConfig
    //it's not possible to suppress the websocket exception during the reconnect:
    //https://stackoverflow.com/questions/31978298/suppress-websocket-connection-to-xyz-failed
    private initWebSocket() {
        this.socket = webSocket({
            url: this._settings.getConnection('information.socket'),
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

  onSocketEvent () {
    return this.socket;
  }

  closeSocket() {
    this.socket.complete();
  }

  onReconnection(){
    return this.reconnected;
  }

}

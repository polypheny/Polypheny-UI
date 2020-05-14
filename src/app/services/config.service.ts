import {EventEmitter, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {webSocket} from 'rxjs/webSocket';
import {WebuiSettingsService} from './webui-settings.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private socket;
  public connected = false;
  private reconnected = new EventEmitter<boolean>();
  httpUrl;
  httpOptions;

  constructor( private _http:HttpClient, private _settings:WebuiSettingsService) {
    this.initWebSocket();
    this.httpUrl = this._settings.getConnection('config.rest');
    this.httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};
  }


  getPage(pageId:string) {
    return this._http.post(`${this.httpUrl}/getPage`, pageId, this.httpOptions);
  }

  getPageList() {
    return this._http.get(`${this.httpUrl}/getPageList`, this.httpOptions);
  }

  saveChanges(data) {
    return this._http.post(`${this.httpUrl}/updateConfigs`, data, this.httpOptions);
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
      msg => {},
      err => {
        //this.reconnected.emit(false);
        this.connected = false;
        setTimeout(() => {
          this.initWebSocket();
        }, +this._settings.getSetting('reconnection.timeout'));
      }
    );
  }

  socketSend( msg: string ) {
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

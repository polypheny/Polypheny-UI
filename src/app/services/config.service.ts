import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {webSocket} from 'rxjs/webSocket';
import {WebuiSettingsService} from './webui-settings.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private socket;
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
    this.socket = webSocket(this._settings.getConnection('config.socket'));
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

}

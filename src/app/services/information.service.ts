import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {webSocket} from 'rxjs/webSocket';
import {WebuiSettingsService} from './webui-settings.service';
import {InformationObject} from '../models/information-page.model';

@Injectable({
  providedIn: 'root'
})
export class InformationService {

  constructor( private _http:HttpClient, private _settings:WebuiSettingsService ) {
    this.initWebSocket();
  }

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

  //https://rxjs-dev.firebaseapp.com/api/webSocket/webSocket
  private initWebSocket() {
    this.socket = webSocket(this._settings.getConnection('information.socket'));
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

}

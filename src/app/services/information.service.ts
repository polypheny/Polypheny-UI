import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {webSocket} from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class InformationService {

  constructor( private _http:HttpClient ) {
    this.initWebSocket();
  }

  private socket;
  httpUrl = 'http://localhost:8082';
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  getPage(pageId:number) {
    return this._http.post(`${this.httpUrl}/getPage`, pageId, this.httpOptions);
  }

  getPageList() {
    return this._http.get(`${this.httpUrl}/getPageList`, this.httpOptions);
  }


  //https://rxjs-dev.firebaseapp.com/api/webSocket/webSocket
  private initWebSocket() {
    this.socket = webSocket('ws://localhost:8082/informationWebSocket');
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

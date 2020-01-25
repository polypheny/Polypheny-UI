import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import {Observable} from "rxjs";
import {WebuiSettingsService} from "./webui-settings.service";

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  socket: any;

  constructor( private _settings:WebuiSettingsService ) {
    this.socket = io(this._settings.getConnection('websocketGestureRecogniton'));
  }

  listen(eventName: string) {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data) => {
        console.log(data);
        subscriber.next(data);
      })
    });
  }
  delete(){
    this.socket.emit('server_event', 'delete');
  }
}

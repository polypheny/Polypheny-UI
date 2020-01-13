import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  socket: any;

  constructor() {
    this.socket = io('ws://localhost:4999');
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

import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import {Observable} from "rxjs";
import {WebuiSettingsService} from "./webui-settings.service";

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  socket: any;
  running: boolean;

  constructor( private _settings:WebuiSettingsService ) {
    this.running = false;
  }

  startConnection(){
    if(!this.running) {
      this.socket = io(this._settings.getConnection('websocketGestureRecognition'));
    }else{
      this.socket.off('event-name');
      this.socket.disconnect();
    }
    this.running = !this.running;
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
//
//
// console.log('Killer funktioniert');
// console.log(this.socketOff);
//
// //let socket = io.connect('http://localhost:1234');
// // console.log('connecting to server');
// // this._chat.messages.subscribe(msg => {
// //   console.log(msg);
// // })
// if(this.socketOff){
//   this._webSocketService.listen('my_message');
//   this._webSocketService.delete();
//   this.socketOff = false;
// }else{
//   this._webSocketService.listen('my_message').subscribe((data) => {
//     if (data.toString() == "delete"){
//       this.deleteAll()
//     }
//     if (data.toString().startsWith("{")){
//       this.insertNode(data)}
//   });
//   this.socketOff = true;
//
// }
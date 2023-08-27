import {BehaviorSubject, Subject} from 'rxjs';
import {EventEmitter} from '@angular/core';
import {WebuiSettingsService} from './webui-settings.service';
import {WebSocketSubject, webSocket} from 'rxjs/webSocket';

export class WebSocket {
  private socket: WebSocketSubject<string>;
  public readonly connected = new BehaviorSubject(false );
  private readonly msgSubject: Subject<any> = new Subject();
  public readonly reconnecting = new Subject<boolean>();

  constructor(private _settings: WebuiSettingsService) {
    this.initWebSocket(false);
    setInterval(() => {
      if (this.connected) {
        this.socket.next('keepalive');
      }
    }, 10_000);
  }

  private initWebSocket(reconnect: boolean) {
    this.socket = webSocket({
      url: this._settings.getConnection('crud.socket'),
      openObserver: {
        next: (n) => {
          this.connected.next(true );
          if (reconnect) {
            this.reconnecting.next(true);
          }
        }
      }
    });
    this.socket.subscribe({
      next: msg => {
        this.msgSubject.next(msg);
      },
      error: err => {
        this.connected.next( false );
        setTimeout(() => {
          this.initWebSocket(true);
        }, +this._settings.getSetting('reconnection.timeout'));
      }
    });
  }

  sendMessage(obj: any): boolean {
    this.socket.next(obj);
    return this.connected.value;
  }

  onMessage() {
    return this.msgSubject;
  }

  close() {
    this.socket.complete();
    //this will unsubscribe all listeners, see https://stackoverflow.com/questions/52198240
    this.msgSubject.complete();
  }
}

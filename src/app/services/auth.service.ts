import {effect, Injectable, signal, WritableSignal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {DbmsTypesService} from './dbms-types.service';
import {WebSocket} from './webSocket';
import {RegisterRequest, RequestModel} from '../models/ui-request.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public readonly id: WritableSignal<string> = signal(null);
  private httpUrl = this._settings.getConnection('crud.rest');
  private readonly status: WritableSignal<ConnectionStatus> = signal(ConnectionStatus.INITIAL);
  public websocket: WebSocket;

  constructor(
      private _http: HttpClient,
      private _settings: WebuiSettingsService,
      private _types: DbmsTypesService,
  ) {
    this.websocket = new WebSocket(_settings);
    this.initWebsocket();
  }

  private readonly _key = 'auth/id';

  private initWebsocket() {
    console.log('init AUTH');
    const id = localStorage.getItem(this._key);
    effect(() => {
      const currentId = this.id();
      if (!currentId) {
        return;
      }
      localStorage.setItem(this._key, currentId);
    });

    this.websocket.onMessage().subscribe((res: RequestModel) => {
      console.log(res);
      switch (res.type) {
        case 'RegisterRequest':
          const register = res as RegisterRequest;
          console.log(res);
          this.id.set(register.source);
          this.status.set(ConnectionStatus.CONNECTED);
      }

    });

    this.websocket.reconnecting.subscribe(con =>{
      console.log("rcon");
    });

    const msg = new RegisterRequest(id, null);
    this.websocket.sendMessage(msg);

  }
}


enum ConnectionStatus {
  DISCONNECTED,
  CONNECTED,
  INITIAL
}

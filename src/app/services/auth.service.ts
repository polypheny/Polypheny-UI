import {effect, inject, Injectable, signal, WritableSignal} from '@angular/core';
import {WebuiSettingsService} from './webui-settings.service';
import {WebSocket} from './webSocket';
import {RegisterRequest, RequestModel} from '../models/ui-request.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _settings = inject(WebuiSettingsService);

  public readonly id: WritableSignal<string> = signal(null);
  private readonly status: WritableSignal<ConnectionStatus> = signal(ConnectionStatus.INITIAL);
  public websocket: WebSocket;

  constructor() {
    this.websocket = new WebSocket();
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
      switch (res.type) {
        case 'RegisterRequest':
          const register = res as RegisterRequest;

          this.id.set(register.source);
          this.status.set(ConnectionStatus.CONNECTED);
      }

    });

    this.websocket.reconnecting.subscribe(con => {
      const req = new RegisterRequest(id, null);
      this.websocket.sendMessage(req);
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

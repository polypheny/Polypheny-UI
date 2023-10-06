import {EventEmitter, Injectable, signal, WritableSignal} from '@angular/core';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class WebuiSettingsService {

    connections = new Map<string, string>();
    settings = new Map<string, Setting>();
    settingsGR = new Map<string, string>();
    host: string;

  constructor() {

    this.host = location.hostname;

    // tslint:disable:no-unused-expression
    new Setting(this.settings, 'webUI.port', '7659');
    new Setting(this.settings, 'config.prefix', '/config/v1');
    new Setting(this.settings, 'information.prefix', '/info/v1');
    new Setting(this.settings, 'httpServer.port', '13137');
    new Setting(this.settings, 'reconnection.timeout', '500');

    this.connections.set('config.rest',
        'http://' + this.host + ':' + localStorage.getItem('webUI.port') + localStorage.getItem('configServer.prefix'));
    this.connections.set('config.socket',
        'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/config');
    this.connections.set('information.rest',
        'http://' + this.host + ':' + localStorage.getItem('webUI.port') + localStorage.getItem('information.prefix'));
    this.connections.set('information.socket',
        'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/info');
    this.connections.set('crud.rest',
        'http://' + this.host + ':' + localStorage.getItem('webUI.port'));
    this.connections.set('crud.socket',
        'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/webSocket');
    this.connections.set('main.socket', 'http://' + this.host + ':' + localStorage.getItem('webUI.port'));
    this.connections.set('httpServer.rest',
        'http://' + this.host + ':' + localStorage.getItem('httpServer.port'));
    this.connections.set('notebooks.rest',
        'http://' + this.host + ':' + localStorage.getItem('webUI.port') + '/notebooks');
    this.connections.set('notebooks.socket',
        'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/notebooks/webSocket');
    this.connections.set('notebooks.file',
        'http://' + this.host + ':' + localStorage.getItem('webUI.port') + '/notebooks/file');

  }

  public getConnection(key: string) {
    return this.connections.get(key);
  }

  public getSettings() {
    return this.settings;
  }


  public setSetting(key: string, val: string) {
    this.settings.get(key).value = val;
    localStorage.setItem(key, val);
  }

  public getSetting(key: string) {
    return this.settings.get(key).value;
  }

  public getSettingsGR() {
    return this.settingsGR;
  }

  public setSettingGR(key: string, val: string) {
    this.settingsGR.set(key, val);
    localStorage.setItem(key, val);
  }

  public reset() {
    for (const s of this.settings.values()) {
      localStorage.setItem(s.key, s.default);
    }
    location.reload();
  }


}

export class Setting {
  key: string;
  value: string;
  default: string;

  constructor(map: Map<string, Setting>, key: string, defaultValue: string) {
    this.key = key;
    this.default = defaultValue;
    if (localStorage.getItem(key) === null) {
      this.value = defaultValue;
      localStorage.setItem(key, defaultValue);
    } else {
      this.value = localStorage.getItem(key);
    }
    map.set(key, this);
  }
}

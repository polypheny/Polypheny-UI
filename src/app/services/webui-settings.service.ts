import {Injectable} from '@angular/core';

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
        new Setting(this.settings, 'webUI.port', '8080');
        new Setting(this.settings, 'configServer.port', '8081');
        new Setting(this.settings, 'informationServer.port', '8082');
        new Setting(this.settings, 'httpServer.port', '13137');
        new Setting(this.settings, 'websocketGestureRecognition.ip:port', 'localhost:4999/index.php');
        new Setting(this.settings, 'reconnection.timeout', '5000');

        this.connections.set('config.rest',
            'http://' + this.host + ':' + localStorage.getItem('configServer.port'));
        this.connections.set('config.socket',
            'ws://' + this.host + ':' + localStorage.getItem('configServer.port') + '/configWebSocket');
        this.connections.set('information.rest',
            'http://' + this.host + ':' + localStorage.getItem('informationServer.port'));
        this.connections.set('information.socket',
            'ws://' + this.host + ':' + localStorage.getItem('informationServer.port') + '/informationWebSocket');
        this.connections.set('crud.rest',
            'http://' + this.host + ':' + localStorage.getItem('webUI.port'));
        this.connections.set('crud.socket',
            'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/webSocket');
        this.connections.set('httpServer.rest',
            'http://' + this.host + ':' + localStorage.getItem('httpServer.port'));
        this.connections.set('websocketGestureRecognition', 'ws://' + localStorage.getItem('websocketGestureRecognition.ip:port'));
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

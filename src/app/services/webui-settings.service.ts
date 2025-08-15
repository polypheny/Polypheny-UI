import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class WebuiSettingsService {

    connections = new Map<string, string>();
    settings = new Map<string, Setting>();
    settingsGR = new Map<string, string>();
    host: string;
    version = 'v1';

    constructor() {


        // tslint:disable:no-unused-expression
        new Setting(this.settings, 'host', 'localhost', true, 'Host');
        new Setting(this.settings, 'webUI.port', '7659', true, 'Port');
        new Setting(this.settings, 'config.prefix', 'config', false);
        new Setting(this.settings, 'information.prefix', 'info', false);
        new Setting(this.settings, 'reconnection.timeout', '500', true, 'Reconnection Timeout');
        new Setting(this.settings, 'websocket.keepalive', '10_000', false, 'Websocket Keepalive');

        this.host = localStorage.getItem('host');

        this.connections.set('config.rest',
            'http://' + this.host + ':' + localStorage.getItem('webUI.port') + '/' + localStorage.getItem('config.prefix') + '/' + this.version);
        this.connections.set('config.socket',
            'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/config');
        this.connections.set('information.rest',
            'http://' + this.host + ':' + localStorage.getItem('webUI.port') + '/' + localStorage.getItem('information.prefix') + '/' + this.version);
        this.connections.set('information.socket',
            'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/info');
        this.connections.set('crud.rest',
            'http://' + this.host + ':' + localStorage.getItem('webUI.port'));
        this.connections.set('crud.socket',
            'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/webSocket');
        this.connections.set('main.socket', 'http://' + this.host + ':' + localStorage.getItem('webUI.port'));
        this.connections.set('notebooks.rest',
            'http://' + this.host + ':' + localStorage.getItem('webUI.port') + '/notebooks');
        this.connections.set('notebooks.socket',
            'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/notebooks/webSocket');
        this.connections.set('notebooks.file',
            'http://' + this.host + ':' + localStorage.getItem('webUI.port') + '/notebooks/file');
        this.connections.set('workflows.rest',
            'http://' + this.host + ':' + localStorage.getItem('webUI.port') + '/workflows');
        this.connections.set('workflows.socket',
            'ws://' + this.host + ':' + localStorage.getItem('webUI.port') + '/workflows/webSocket');

    }

    public getConnection(key: string) {
        return this.connections.get(key);
    }

    public getConfigurableSettings() {
        return new Map(
            Array.from(this.settings.entries()).filter(
                ([_, value]) => value.configurable
            )
        );
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
    configurable: boolean; // if true, the user can change the value of this setting from the right sidebar
    displayName: string;
    order: number;

    constructor(map: Map<string, Setting>, key: string, defaultValue: string, configurable: boolean, displayName: string = null, order = 1) {
        this.key = key;
        this.default = defaultValue;
        this.configurable = configurable;
        this.displayName = displayName === null ? key : displayName;
        if (localStorage.getItem(key) === null) {
            this.value = defaultValue;
            localStorage.setItem(key, defaultValue);
        } else {
            this.value = localStorage.getItem(key);
        }
        this.order = order;

        map.set(key, this);
    }
}

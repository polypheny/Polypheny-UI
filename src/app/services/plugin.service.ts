import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {CrudService} from './crud.service';
import {inject, Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PluginService {

    private readonly _http = inject(HttpClient);
    private readonly _settings = inject(WebuiSettingsService);
    private readonly _crud = inject(CrudService);

    private httpUrl = this._settings.getConnection('crud.rest');

    private infoUrl = this._settings.getConnection('information.rest');

    private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

    constructor() {
    }


    private availablePlugins: [string] = null;
    private pluginRequestFired: number = null;
    private REQUEST_DELAY: number = 1000 * 20;


    getEnabledPlugins(): string[] {
        if (this.pluginRequestFired === null) {
            this.pluginRequestFired = Date.now() - (this.REQUEST_DELAY + 100);
        }
        if (this.availablePlugins === null) {
            const today = Date.now();
            if ((this.pluginRequestFired + this.REQUEST_DELAY) < today) {
                this.pluginRequestFired = today;
                this._http.get(`${this.httpUrl}/getEnabledPlugins`, this.httpOptions)
                    .subscribe(res => {
                        this.availablePlugins = <[string]>res;
                    });
            }
            return [];
        }
        return this.availablePlugins;
    }

    getAvailablePlugins(): string[] {
        if (this.pluginRequestFired === null) {
            this.pluginRequestFired = Date.now() - (this.REQUEST_DELAY + 100);
        }
        if (this.availablePlugins === null) {
            const today = Date.now();
            if ((this.pluginRequestFired + this.REQUEST_DELAY) < today) {
                this.pluginRequestFired = today;
                this._http.get(`${this.httpUrl}/getAvailablePlugins`, this.httpOptions)
                    .subscribe(res => {
                        this.availablePlugins = <[string]>res;
                    });
            }
            return [];
        }
        return this.availablePlugins;
    }

    loadPlugins(files: File[]) {
        return this._crud.loadPlugins(files);
    }
}

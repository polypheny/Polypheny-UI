import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {HubService} from './hub.service';
import {CrudService} from './crud.service';
import {Injectable} from '@angular/core';
import {PluginStatus} from '../models/ui-request.model';

@Injectable({
    providedIn: 'root'
})
export class PluginService{

    private httpUrl = this._settings.getConnection('crud.rest' );

    private infoUrl = this._settings.getConnection('information.rest');

    private httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

    constructor(
        private _http:HttpClient,
        private _settings:WebuiSettingsService,
        private _hub: HubService,
        private _crud: CrudService
    ) {


    }


    private availablePlugins: [PluginStatus] = null;
    private pluginRequestFired:number = null;
    private REQUEST_DELAY: number = 1000*20;


    getEnabledPlugins(): string[] {
        return this.getAvailablePlugins().map( p =>  p.id );
    }

    getAvailablePlugins(): PluginStatus[] {
        if( this.pluginRequestFired === null ){
            this.pluginRequestFired = Date.now() - (this.REQUEST_DELAY + 100);
        }
        if (this.availablePlugins === null) {
            const today = Date.now();
            if ( (this.pluginRequestFired + this.REQUEST_DELAY) < today ) {
                this.pluginRequestFired = today;
                this._http.get(`${this.httpUrl}/getAvailablePlugins`, this.httpOptions)
                    .subscribe(res => {
                        this.availablePlugins = <[PluginStatus]>res;
                    });
            }
            return [];
        }
        return this.availablePlugins;
    }
}

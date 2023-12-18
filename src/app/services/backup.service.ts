import {inject, Injectable, signal, WritableSignal} from '@angular/core';
import {ElementModel, ManifestModel} from '../models/backup.model';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';

@Injectable({
    providedIn: 'root'
})
export class BackupService {

    private _http: HttpClient = inject(HttpClient);
    private _settings: WebuiSettingsService = inject(WebuiSettingsService);
    private httpUrl = this._settings.getConnection('crud.rest') + '/backup/v1';
    private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

    public $currentRestore: WritableSignal<ManifestModel> = signal(null);

    public $currentBackup: WritableSignal<ElementModel[]> = signal(null);

    public $backups: WritableSignal<ManifestModel[]> = signal([]);


    public updateAvailableBackups() {
        this._http.get(`${this.httpUrl}/getBackups`, this.httpOptions).subscribe((res: ManifestModel[]) => {
            this.$backups.set(res);
        })
    }

    public deleteBackup(id: number) {
        return this._http.post(`${this.httpUrl}/deleteBackup`, id, this.httpOptions);
    }

    public restoreBackup(manifest: ManifestModel) {
        return this._http.post(`${this.httpUrl}/restoreBackup`, manifest, this.httpOptions);
    }

    public createBackup(elements: ElementModel[]) {
        return this._http.post(`${this.httpUrl}/createBackup`, elements, this.httpOptions);
    }

    public getCurrentStructure() {
        return this._http.get(`${this.httpUrl}/getCurrentStructure`, this.httpOptions);
    }

}

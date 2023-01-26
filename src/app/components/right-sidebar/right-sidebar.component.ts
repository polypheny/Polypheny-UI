import {Component, OnInit} from '@angular/core';
import {Setting, WebuiSettingsService} from '../../services/webui-settings.service';
import {FormControl, FormGroup} from '@angular/forms';
import {RightSidebarToRelationalalgebraService} from '../../services/right-sidebar-to-relationalalgebra.service';

@Component({
    selector: 'app-right-sidebar',
    templateUrl: './right-sidebar.component.html',
    styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit {

    settings: Map<string, Setting> = this._settings.getSettings();
    form: FormGroup;

    settingsGR = this._settings.getSettingsGR();
    formGR: FormGroup;
    public buttonName = 'connect';


    constructor(
        private _settings: WebuiSettingsService,
        private _RsToRa: RightSidebarToRelationalalgebraService
    ) {
        const controls = {};
        this.settings.forEach((val: Setting, key: string) => {
            controls[key] = new FormControl(<string>val.value);
        });
        this.form = new FormGroup(controls);

        const controlsGR = {};
        this.settingsGR.forEach((val, key) => {
            controlsGR[key] = new FormControl(val);
        });
        this.formGR = new FormGroup(controlsGR);

    }

    ngOnInit() {
    }

    saveSettings() {
        this.settings.forEach((val, key) => {
            this._settings.setSetting(key, this.form.value[key]);
        });
        location.reload();
    }

    resetSettings() {
        this._settings.reset();
        return false;
    }

    saveSettingsGR() {
        this.settingsGR.forEach((val, key) => {
            this._settings.setSettingGR(key, this.formGR.value[key]);
        });
        location.reload();
    }

    public connectToRA(): void {
        if (this.buttonName === 'connect') {
            this.buttonName = 'disconnect';
        } else {
            this.buttonName = 'connect';
        }
        this._RsToRa.toggle();
    }
}

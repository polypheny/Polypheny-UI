import {Component, OnInit} from '@angular/core';
import {Setting, WebuiSettingsService} from '../../services/webui-settings.service';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {RightSidebarToRelationalalgebraService} from '../../services/right-sidebar-to-relationalalgebra.service';

@Component({
    selector: 'app-right-sidebar',
    templateUrl: './right-sidebar.component.html',
    styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit {

    settings: Map<string, Setting> = this._settings.getSettings();
    form: UntypedFormGroup;

    settingsGR = this._settings.getSettingsGR();
    formGR: UntypedFormGroup;
    public buttonName = 'connect';


    constructor(
        private _settings: WebuiSettingsService,
        private _RsToRa: RightSidebarToRelationalalgebraService
    ) {
        const controls = {};
        this.settings.forEach((val: Setting, key: string) => {
            controls[key] = new UntypedFormControl(<string>val.value);
        });
        this.form = new UntypedFormGroup(controls);

        const controlsGR = {};
        this.settingsGR.forEach((val, key) => {
            controlsGR[key] = new UntypedFormControl(val);
        });
        this.formGR = new UntypedFormGroup(controlsGR);

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

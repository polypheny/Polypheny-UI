import {Component, computed, inject, Input, OnDestroy, OnInit, signal, WritableSignal} from '@angular/core';
import {Setting, WebuiSettingsService} from '../../services/webui-settings.service';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {RightSidebarToRelationalalgebraService} from '../../services/right-sidebar-to-relationalalgebra.service';
import {CrudService} from '../../services/crud.service';
import {round} from 'lodash';

@Component({
    selector: 'app-right-sidebar',
    templateUrl: './right-sidebar.component.html',
    styleUrls: ['./right-sidebar.component.scss'],
    standalone: false
})
export class RightSidebarComponent implements OnInit, OnDestroy {

    private readonly _settings = inject(WebuiSettingsService);
    private readonly _RsToRa = inject(RightSidebarToRelationalalgebraService);
    readonly _crud = inject(CrudService);


    @Input()
    reload: () => void;
    settings: Map<string, Setting> = this._settings.getConfigurableSettings();
    form: UntypedFormGroup;

    settingsGR = this._settings.getSettingsGR();
    formGR: UntypedFormGroup;
    public buttonName = 'connect';

    private latency: WritableSignal<number> = signal(null);
    formattedLatency = computed(() => `${round(this.latency())} ms`);
    latencyColor = computed(() => {
        if (this.latency() > 500) {
            return 'danger';
        } else if (this.latency() > 150) {
            return 'warning';
        } else {
            return 'success';
        }
    });
    latencyInterval: number;
    readonly LATENCY_MEASURE_DELAY_MS = 5000;
    readonly LATENCY_SMOOTH_FACTOR = 0.5;


    constructor() {
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
        this.updateLatency();
        this.latencyInterval = setInterval(() => this.updateLatency(), this.LATENCY_MEASURE_DELAY_MS);
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

    private updateLatency() {
        this._crud.measureLatency().subscribe(latency => {
            this.latency.update(lastLatency => {
                if (latency < 0) {
                    return null;
                }
                return lastLatency === null ? latency :
                    this.LATENCY_SMOOTH_FACTOR * lastLatency + (1 - this.LATENCY_SMOOTH_FACTOR) * latency;
            });
        });
    }

    ngOnDestroy(): void {
        clearInterval(this.latencyInterval);
    }
}

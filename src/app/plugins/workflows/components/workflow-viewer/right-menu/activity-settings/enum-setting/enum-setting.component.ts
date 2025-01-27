import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';

@Component({
    selector: 'app-enum-setting',
    templateUrl: './enum-setting.component.html',
    styleUrl: './enum-setting.component.scss'
})
export class EnumSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<EnumSettingDef>(() => this.settingDef() as EnumSettingDef);
    options = computed(() => {
        const displayOpts = this.def().displayOptions;
        return this.def().options.map((value, index) => [value, displayOpts[index]]);
    });
}

interface EnumSettingDef extends SettingDefModel {
    options: string[];
    displayOptions: string[];
    label: string;
}

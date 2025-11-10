import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';

@Component({
    selector: 'app-double-setting',
    templateUrl: './double-setting.component.html',
    styleUrl: './double-setting.component.scss'
})
export class DoubleSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>(); // not required for double
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<DoubleSettingDef>(() => this.settingDef() as DoubleSettingDef);
}

interface DoubleSettingDef extends SettingDefModel {
    minValue: number;
    maxValue: number;
}

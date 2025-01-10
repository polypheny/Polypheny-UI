import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDef} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';

@Component({
    selector: 'app-int-setting',
    templateUrl: './int-setting.component.html',
    styleUrl: './int-setting.component.scss'
})
export class IntSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDef>();
    inTypePreview = input.required<TypePreviewModel[]>(); // not required for int
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<IntSettingDef>(() => this.settingDef() as IntSettingDef);
    // TODO: change appearance if isList
}

interface IntSettingDef extends SettingDef {
    isList: boolean;
    minValue: number;
    maxValue: number;
}

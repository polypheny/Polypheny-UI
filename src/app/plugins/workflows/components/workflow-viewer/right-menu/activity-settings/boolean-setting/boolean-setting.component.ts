import {Component, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';

@Component({
    selector: 'app-boolean-setting',
    templateUrl: './boolean-setting.component.html',
    styleUrl: './boolean-setting.component.scss',
    standalone: false
})
export class BooleanSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>(); // not required for int
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

}

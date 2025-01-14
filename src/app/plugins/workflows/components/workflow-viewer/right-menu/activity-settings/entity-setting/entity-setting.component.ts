import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {DataModel} from '../../../../../../../models/ui-request.model';

@Component({
    selector: 'app-entity-setting',
    templateUrl: './entity-setting.component.html',
    styleUrl: './entity-setting.component.scss'
})
export class EntitySettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>(); // not required for int
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<EntitySettingDef>(() => this.settingDef() as EntitySettingDef);
    // TODO: change appearance if isList
    protected readonly DataModel = DataModel;
}

interface EntitySettingDef extends SettingDefModel {
    dataModel: DataModel;
    mustExist: boolean;
}

import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {getSuggestions} from '../../../workflow';

type Directions = 'ASCENDING' | 'STRICTLY_ASCENDING' | 'DESCENDING' | 'STRICTLY_DESCENDING' | 'CLUSTERED';

@Component({
    selector: 'app-collation-setting',
    templateUrl: './collation-setting.component.html',
    styleUrl: './collation-setting.component.scss'
})
export class CollationSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    val = computed(() => this.value() as FieldCollation[]); // like value, but with correct type
    def = computed(() => this.settingDef() as CollationSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    fieldType = computed(() => this.targetPreview().portType === 'REL' ? 'column' : 'field');
    suggestions = computed(() => getSuggestions(this.targetPreview(), 'props'));

    readonly dirChoices: Directions[] = ['ASCENDING', 'STRICTLY_ASCENDING', 'DESCENDING', 'STRICTLY_DESCENDING', 'CLUSTERED'];

    valueChanged() {
        setTimeout(() => this.hasChanged.emit(), 1);
    }

    addField() {
        this.val().push({name: '', direction: 'ASCENDING', regex: false});
        this.valueChanged();
    }

    deleteField(idx: number) {
        this.val().splice(idx, 1);
        this.valueChanged();
    }

    drop(event: CdkDragDrop<string[], any>) {
        if (event.previousIndex !== event.currentIndex) {
            moveItemInArray(this.val(), event.previousIndex, event.currentIndex);
            this.valueChanged();
        }
    }
}

interface CollationSettingDef extends SettingDefModel {
    targetInput: number;
    allowRegex: boolean;
}

interface FieldCollation {
    name: string;
    direction: Directions;
    regex: boolean;
}

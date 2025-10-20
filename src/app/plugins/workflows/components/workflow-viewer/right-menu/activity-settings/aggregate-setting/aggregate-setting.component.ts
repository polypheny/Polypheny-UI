import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {getSuggestions} from '../../../workflow';


@Component({
    selector: 'app-aggregate-setting',
    templateUrl: './aggregate-setting.component.html',
    styleUrl: './aggregate-setting.component.scss',
    standalone: false
})
export class AggregateSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    val = computed(() => this.value() as AggregateEntry[]); // like value, but with correct type
    def = computed(() => this.settingDef() as AggregateSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    fieldType = computed(() => this.targetPreview().portType === 'REL' ? 'column' : 'field');
    suggestions = computed(() => getSuggestions(this.targetPreview(), 'props'));

    readonly displayFunctions = {
        'MAX': 'Max',
        'MIN': 'Min',
        'AVG': 'Average',
        'SUM': 'Sum',
        'SUM0': 'Sum (0 if empty)',
        'COUNT': 'Count',
        'STDDEV': 'Standard Deviation',
        'VARIANCE': 'Variance'
    };

    valueChanged() {
        setTimeout(() => this.hasChanged.emit(), 1);
    }

    addField() {
        this.val().push({target: '', function: this.def().allowedFunctions[0], alias: ''});
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

interface AggregateSettingDef extends SettingDefModel {
    targetInput: number;
    allowedFunctions: string[];
}

interface AggregateEntry {
    target: string;
    function: string;
    alias: string;
}

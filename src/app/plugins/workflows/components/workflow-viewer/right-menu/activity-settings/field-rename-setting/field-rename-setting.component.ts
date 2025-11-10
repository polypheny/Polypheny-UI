import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {getSuggestions} from '../../../workflow';


@Component({
    selector: 'app-field-rename-setting',
    templateUrl: './field-rename-setting.component.html',
    styleUrl: './field-rename-setting.component.scss'
})
export class FieldRenameSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    rules = computed(() => this.value().rules as RenameRule[]); // like value, but with correct type
    def = computed(() => this.settingDef() as FieldRenameSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    fieldType = computed(() => this.targetPreview()?.portType === 'REL' ? 'column' : 'field');
    suggestions = computed(() => getSuggestions(this.targetPreview(), this.def().forLabels ? 'labels' : 'props'));
    modes = computed(() => {
        const modes: [RenameMode, String][] = [['EXACT', 'Exact']];
        if (this.def().allowRegex) {
            modes.push(['REGEX', 'Regex']);
        }
        if (this.def().allowIndex) {
            modes.push(['INDEX', 'Index']);
        }
        return modes;
    });

    valueChanged() {
        setTimeout(() => this.hasChanged.emit(), 1);
    }

    addRule() {
        switch (this.value().mode) {
            case 'EXACT':
            case 'REGEX':
                this.rules().push({source: '', replacement: ''});
                break;
            case 'INDEX':
                let highestIndex = -1;
                this.rules().forEach(r => {
                    const i = parseInt(r.source, 10);
                    if (i > highestIndex) {
                        highestIndex = i;
                    }
                });
                this.rules().push({source: '' + (highestIndex + 1), replacement: ''});
                break;
        }
        this.valueChanged();
    }

    deleteRule(idx: number) {
        this.rules().splice(idx, 1);
        this.valueChanged();
    }
}

type RenameMode = 'EXACT' | 'REGEX' | 'INDEX';

interface FieldRenameSettingDef extends SettingDefModel {
    defaultMode: RenameMode;
    allowRegex: boolean;
    allowIndex: boolean;
    targetInput: number;
    forLabels: boolean;
}

interface RenameRule {
    source: string;
    replacement: string;

}

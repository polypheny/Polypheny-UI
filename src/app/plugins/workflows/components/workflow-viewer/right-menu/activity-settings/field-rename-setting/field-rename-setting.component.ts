import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';


@Component({
    selector: 'app-field-rename-setting',
    templateUrl: './field-rename-setting.component.html',
    styleUrl: './field-rename-setting.component.scss'
})
export class FieldRenameSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>(); // not required for int
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    rules = computed(() => this.value().rules as RenameRule[]); // like value, but with correct type
    def = computed(() => this.settingDef() as FieldRenameSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    fieldType = computed(() => this.targetPreview().portType === 'REL' ? 'column' : 'field');
    suggestions = computed(() => {
        if (this.targetPreview().portType === 'REL') {
            return this.targetPreview().columns?.map(c => c.name) || [];
        } else if (this.targetPreview().portType === 'DOC') {
            return this.targetPreview().fields || [];
        }
        return [];
    });
    lastMode = null;

    readonly modes: [RenameMode, String][] = [
        ['CONSTANT', 'Constant'],
        ['REGEX', 'Regex'],
        ['INDEX', 'Index']
    ];

    valueChanged() {
        // TODO: fix changing mode to index
        /*const mode = this.value().mode;
        if (this.lastMode !== null && this.lastMode !== mode && mode === 'INDEX') {
            let i = 0; // switching to index, reset source
            for (const rule of this.rules()) {
                rule.source = i.toString(10);
                i++;
            }
        }
        this.lastMode = mode;*/
        setTimeout(() => this.hasChanged.emit(), 1);
    }

    addRule() {
        switch (this.value().mode) {
            case 'CONSTANT':
            case 'REGEX':
                this.rules().push({source: '', replacement: '', caseInsensitive: false});
                break;
            case 'INDEX':
                let highestIndex = -1;
                this.rules().forEach(r => {
                    const i = parseInt(r.source, 10);
                    if (i > highestIndex) {
                        highestIndex = i;
                    }
                });
                this.rules().push({source: '' + (highestIndex + 1), replacement: '', caseInsensitive: false});
                break;
        }
        this.valueChanged();
    }

    deleteRule(idx: number) {
        this.rules().splice(idx, 1);
        this.valueChanged();
    }
}

type RenameMode = 'CONSTANT' | 'REGEX' | 'INDEX';

interface FieldRenameSettingDef extends SettingDefModel {
    defaultMode: RenameMode;
    allowRegex: boolean;
    allowIndex: boolean;
    targetInput: number;
}

interface RenameRule {
    source: string;
    replacement: string;
    caseInsensitive: boolean; // not relevant for index

}

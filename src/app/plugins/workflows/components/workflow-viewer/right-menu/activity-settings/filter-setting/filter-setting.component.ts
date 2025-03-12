import {Component, computed, EventEmitter, input, model, Output} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {getSuggestions} from '../../../workflow';


@Component({
    selector: 'app-filter-setting',
    templateUrl: './filter-setting.component.html',
    styleUrl: './filter-setting.component.scss'
})
export class FilterSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    conditions = computed(() => this.value().conditions as Condition[]); // like value, but with correct type
    def = computed(() => this.settingDef() as FilterSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    fieldType = computed(() => this.targetPreview()?.portType === 'REL' ? 'column' : 'field');
    suggestions = computed(() => getSuggestions(this.targetPreview(), 'props'));
    modes = computed(() => this.def().modes.map(m => [m, m.toLowerCase()]));
    opChoices = computed(() => Object.entries(Operator).filter(([key]) => {
        return this.def().operators.includes(key as Operator);
    }));

    readonly showIgnoreCase = new Set(['EQUALS', 'NOT_EQUALS', 'REGEX', 'INCLUDED', 'NOT_INCLUDED', 'CONTAINS', 'NOT_CONTAINS', 'HAS_KEY']);
    readonly hideValue = new Set(['NULL', 'NON_NULL', 'IS_ARRAY', 'IS_OBJECT']);

    valueChanged() {
        setTimeout(() => this.hasChanged.emit(), 1);
    }

    addCondition() {
        this.conditions().push({field: '', operator: this.def().operators[0], value: '', ignoreCase: false});
        this.valueChanged();
    }

    deleteCondition(idx: number) {
        this.conditions().splice(idx, 1);
        this.valueChanged();
    }
}

type SelectMode = 'EXACT' | 'REGEX' | 'INDEX';

export enum Operator {
    EQUALS = '=',
    NOT_EQUALS = '!=',
    GREATER_THAN = '>',
    LESS_THAN = '<',
    GREATER_THAN_EQUALS = '≥',
    LESS_THAN_EQUALS = '≤',
    REGEX = 'Matches Regex',
    REGEX_NOT = 'Does Not Match Regex',
    NULL = 'Is Null',
    NON_NULL = 'Is Not Null',
    INCLUDED = 'In',
    NOT_INCLUDED = 'Not In',
    CONTAINS = 'Contains',
    NOT_CONTAINS = 'Does Not Contain',
    HAS_KEY = 'Has Key',
    IS_ARRAY = 'Is Array',
    IS_OBJECT = 'Is Document'
}


interface FilterSettingDef extends SettingDefModel {
    modes: SelectMode[];
    operators: Operator[];
    targetInput: number;
}

interface Condition {
    field: string;
    operator: Operator;
    value: string;
    ignoreCase: boolean;
}

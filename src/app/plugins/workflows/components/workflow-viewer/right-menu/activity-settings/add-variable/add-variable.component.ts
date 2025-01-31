import {Component, computed, EventEmitter, input, Output, signal} from '@angular/core';
import {VariableReference} from '../../../workflow';
import {envVarsKey, Variables, wfVarsKey} from '../../../../../models/workflows.model';
import JsonPointer from 'json-pointer';

@Component({
    selector: 'app-add-variable',
    templateUrl: './add-variable.component.html',
    styleUrl: './add-variable.component.scss'
})
export class AddVariableComponent {
    references = input.required<VariableReference[]>();
    activityVars = input.required<Variables>();
    workflowVars = input.required<Variables>();
    settingValue = input.required<any>();
    isEditable = input.required<boolean>();

    @Output() add = new EventEmitter<[string, string, string]>();
    @Output() delete = new EventEmitter<VariableReference>();

    variables = computed(() => {
        const localVars = Object.keys(this.activityVars()).filter(key => key !== wfVarsKey && key !== envVarsKey);
        const wfVars = Object.keys(this.workflowVars()).map(key => wfVarsKey + '/' + key);
        const envVars = Object.keys(this.activityVars()[envVarsKey] || {}).map(key => envVarsKey + '/' + key);
        return Array.from(new Set([...localVars, ...wfVars, ...envVars]));
    });
    variablePointers = computed(() => {
        const aVar = this.activityVars()[this.variableInput()];
        if (aVar !== undefined) {
            return Object.keys(JsonPointer.dict(aVar)).sort((a, b) => a.length - b.length);
        }
        const split = this.variableInput().split('/');
        if (split.length > 1 && split[0] === wfVarsKey) {
            const wVar = this.workflowVars()[split[1]];
            try {
                return Object.keys(JsonPointer.dict(wVar)).sort((a, b) => a.length - b.length);
            } catch (ignored) {
            }
        }
        return [];
    });
    targets = computed(() => {
        if (typeof this.settingValue() === 'string') {
            return [];
        }
        const leaves = Object.keys(JsonPointer.dict(this.settingValue()));
        const firstChildren = leaves.length > 0 ? Object.keys(this.settingValue()).map(k => '/' + k) : [];
        return Array.from(new Set([...leaves, ...firstChildren]))
        .sort((a, b) => a.length - b.length);
    });

    variableInput = signal('');

    showAdvanced = false;
    pointerInput = signal('');
    targetInput = signal('');
    isValid = computed(() => this.variableInput().length > 0);

    addVariableRef() {
        this.add.emit([this.variableInput(), this.pointerInput(), this.targetInput()]);
        this.variableInput.set('');
        this.pointerInput.set('');
        this.targetInput.set('');
    }
}

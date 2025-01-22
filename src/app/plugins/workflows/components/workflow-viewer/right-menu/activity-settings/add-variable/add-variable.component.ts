import {Component, computed, EventEmitter, input, Output, signal} from '@angular/core';
import {VariableReference} from '../../../workflow';
import {Variables} from '../../../../../models/workflows.model';
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

    variables = computed(() => Array.from(new Set([
        ...Object.keys(this.activityVars()),
        ...Object.keys(this.workflowVars())
    ])));
    variablePointers = computed(() => {

        const aVar = this.activityVars()[this.variableInput()];
        if (aVar !== undefined) {
            return Object.keys(JsonPointer.dict(aVar)).sort((a, b) => a.length - b.length);
        }
        const wVar = this.workflowVars()[this.variableInput()];
        if (wVar !== undefined) {
            return Object.keys(JsonPointer.dict(wVar)).sort((a, b) => a.length - b.length);
        }
        return [];
    });
    targets = computed(() => Array.from(new Set([
            ...Object.keys(JsonPointer.dict(this.settingValue())),
            ...Object.keys(this.settingValue()).map(k => '/' + k)
        ])).sort((a, b) => a.length - b.length)
    );

    variableInput = signal('');

    showAdvanced = false;
    pointerInput = signal('');
    targetInput = signal('');
    isValid = computed(() => this.variableInput().length > 0);

    addVariableRef() {
        console.log('adding', this.variableInput(), this.pointerInput(), this.targetInput());
        this.add.emit([this.variableInput(), this.pointerInput(), this.targetInput()]);
    }
}

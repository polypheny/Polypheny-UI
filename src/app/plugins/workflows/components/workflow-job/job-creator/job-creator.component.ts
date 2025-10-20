import {Component, inject, ViewChild} from '@angular/core';
import {JobCreatorService} from '../../../services/job-creator.service';
import {JsonEditorComponent} from '../../../../../components/json/json-editor.component';
import {ToasterService} from '../../../../../components/toast-exposer/toaster.service';

@Component({
    selector: 'app-job-creator',
    templateUrl: './job-creator.component.html',
    styleUrl: './job-creator.component.scss',
    standalone: false
})
export class JobCreatorComponent {
    @ViewChild('variableEditor') variableEditor: JsonEditorComponent;

    readonly _creator = inject(JobCreatorService);
    readonly _toast = inject(ToasterService);
    isExpanded = false;
    changedVariables: string;

    saveJob() {
        if (!this.variableEditor.isValid()) {
            this._toast.warn('The specified variables are invalid');
            return;
        }
        if (this.changedVariables !== undefined) {
            this._creator.variables = JSON.parse(this.changedVariables);
        }

        if (this._creator.isValid()) {
            this._creator.buildAndSave();
        }
    }

    resetVariables() {
        this._creator.variables = {};
        this.changedVariables = '{}';
        setTimeout(() => this.variableEditor?.addInitialValues(), 10);
    }
}

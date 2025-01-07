import {Component, computed, EventEmitter, input, OnInit, Output} from '@angular/core';
import {ActivityConfigModel, CommonType, ControlStateMerger} from '../../../../models/workflows.model';
import {JsonPipe, NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivityDef} from '../../../../models/activity-registry.model';
import {
    ButtonDirective,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    FormControlDirective,
    FormDirective,
    FormLabelDirective,
    FormSelectDirective
} from '@coreui/angular';

@Component({
    selector: 'app-activity-config-editor',
    standalone: true,
    imports: [
        JsonPipe,
        FormsModule,
        NgForOf,
        NgIf,
        FormControlDirective,
        FormDirective,
        FormLabelDirective,
        FormCheckComponent,
        FormCheckInputDirective,
        FormCheckLabelDirective,
        FormSelectDirective,
        ButtonDirective
    ],
    templateUrl: './activity-config-editor.component.html',
    styleUrl: './activity-config-editor.component.scss'
})
export class ActivityConfigEditorComponent implements OnInit {

    constructor() {
    }

    config = input.required<ActivityConfigModel>();
    def = input.required<ActivityDef>();
    @Output() save = new EventEmitter<ActivityConfigModel>();

    commonTypes = Object.values(CommonType);
    controlStateMergers = Object.values(ControlStateMerger);
    serializedConfig = computed(() => JSON.stringify(this.config()));
    editableConfig = computed<ActivityConfigModel>(() => JSON.parse(this.serializedConfig())); // we edit a copy of the actual config

    protected readonly JSON = JSON;

    ngOnInit(): void {
    }

    saveConfig() {
        for (const [i, store] of this.editableConfig().preferredStores.entries()) {
            if (store?.length === 0) {
                this.editableConfig().preferredStores[i] = null;
            }
        }
        this.save.emit(this.editableConfig());
    }
}

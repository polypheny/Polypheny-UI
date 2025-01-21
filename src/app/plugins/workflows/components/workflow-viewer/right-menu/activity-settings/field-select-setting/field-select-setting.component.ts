import {Component, computed, effect, EventEmitter, input, model, Output, signal, ViewChild} from '@angular/core';
import {ActivityDef, SettingDefModel} from '../../../../../models/activity-registry.model';
import {PK_COL, TypePreviewModel} from '../../../../../models/workflows.model';
import {EditorComponent} from '../../../../../../../components/editor/editor.component';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {ToasterService} from '../../../../../../../components/toast-exposer/toaster.service';

@Component({
    selector: 'app-field-select-setting',
    templateUrl: './field-select-setting.component.html',
    styleUrl: './field-select-setting.component.scss'
})
export class FieldSelectSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    activityDef = input.required<ActivityDef>();
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    @ViewChild('editor') editor: EditorComponent;

    val = computed(() => this.value() as FieldSelectValue); // like value, but with correct type
    def = computed<FieldSelectSettingDef>(() => this.settingDef() as FieldSelectSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    isRel = computed(() => this.activityDef().inPorts[this.def().targetInput].type === 'REL' || this.targetPreview().portType === 'REL');
    firstIsFixed = signal(false);

    constructor(private _toast: ToasterService) {
        effect(() => {
            const inTypeFields = this.targetPreview().fields;
            if (!this.def().simplified && this.val().exclude.length === 0 && this.val().include.length <= 1) {
                if (inTypeFields?.length > 0) {
                    this.val().include = inTypeFields.map(field => field.name);
                } else if (this.val().include.length === 0 && this.isRel()) {
                    this.val().include.push(PK_COL);
                }
            }
            this.firstIsFixed.set(this.isRel() && this.val().include?.[0] === PK_COL);
        }, {allowSignalWrites: true});
    }


    valueChanged() {
        this.hasChanged.emit();
    }

    drop(event: CdkDragDrop<string[], any>) {
        if (this.firstIsFixed() && event.currentIndex === 0 && event.container.id === 'list-include') {
            return;
        }
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex,
            );
        }
        this.valueChanged();
    }

    delete(target: 'exclude' | 'include', index: number) {
        if (target === 'exclude') {
            this.val().exclude.splice(index, 1);
        } else {
            this.val().include.splice(index, 1);
        }
        this.valueChanged();
    }

    add(target: 'exclude' | 'include', fieldName: string) {
        if (fieldName.length === 0) {
            this._toast.warn('Field names must not be empty');
            return;
        }
        if (this.val().include.includes(fieldName) || this.val().exclude.includes(fieldName)) {
            this._toast.warn('Duplicate field names are not permitted');
            return;
        }
        if (target === 'exclude') {
            this.val().exclude.push(fieldName);
        } else {
            this.val().include.push(fieldName);
        }
        this.valueChanged();

    }

    unknownChanged(event: Event) {
        if ((event.target as HTMLInputElement).checked) {
            this.val().unspecifiedIndex = this.val().include.length;
        } else {
            this.val().unspecifiedIndex = -1;
        }
        this.valueChanged();
    }
}

interface FieldSelectSettingDef extends SettingDefModel {
    simplified: boolean;
    reorder: boolean;
    defaultAll: boolean;
    targetInput: number;
}

interface FieldSelectValue {
    include: string[];
    exclude: string[];
    unspecifiedIndex: number; // -1 if excluded by default (should always be the case for simplified
}

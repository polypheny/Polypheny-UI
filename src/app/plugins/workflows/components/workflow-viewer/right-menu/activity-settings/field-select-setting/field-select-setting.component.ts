import {Component, computed, effect, EventEmitter, input, model, Output, signal, ViewChild} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
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
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    @ViewChild('editor') editor: EditorComponent;

    val = computed(() => this.value() as FieldSelectValue); // like value, but with correct type
    def = computed<FieldSelectSettingDef>(() => this.settingDef() as FieldSelectSettingDef);
    targetPreview = computed(() => this.inTypePreview()[this.def().targetInput]);
    isRel = computed(() => this.targetPreview().portType === 'REL');
    firstIsFixed = signal(false);
    isInitialized = false;

    // simple
    dropdownData = computed(() => this.targetPreview().fields?.map(field => {
        return {id: field.name, itemName: field.name};
    }));
    includeData: { id: string; itemName: string; }[] = [];
    private changed = signal(false); // dummy signal to trigger recomputation


    // https://www.npmjs.com/package/angular2-multiselect-dropdown
    readonly dropdownSettings = {
        singleSelection: false,
        text: 'Fields to include',
        noDataLabel: 'No fields found',
        searchPlaceholderText: 'Search or add new',
        enableSearchFilter: true,
        enableCheckAll: true,
        enableFilterSelectAll: false,
        addNewItemOnFilter: true
    };

    constructor(private _toast: ToasterService) {
        effect(() => {
            this.changed();
            const inTypeFields = this.targetPreview().fields;

            if (this.def().simplified) {
                this.includeData = this.val().include.map(fieldName => {
                    return {id: fieldName, itemName: fieldName};
                });
            } else if (!this.isInitialized && this.val().exclude.length === 0 && this.val().include.length <= 1 && this.isRel()) {
                if (inTypeFields?.length > 0) {
                    this.val().include = inTypeFields.map(field => field.name);
                    this.isInitialized = true;
                    this.valueChanged();
                } else if (this.val().include.length === 0) {
                    this.val().include.push(PK_COL);
                }
            }
            this.firstIsFixed.set(this.isRel() && this.val().include?.[0] === PK_COL);
        }, {allowSignalWrites: true});
    }


    valueChanged() {
        this.hasChanged.emit();
        this.changed.update(v => !v);
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

    // simple

    includeDataChange(event: { id: string; itemName: string; }[]) {
        this.val().include = event.map(e => e.id);
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

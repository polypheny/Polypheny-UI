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
    isRel = computed(() => this.targetPreview()?.portType === 'REL');
    canInitialize = computed(() => {
        this.changed();
        return this.val().include.length === 0 && this.val().exclude.length === 0 && this.fields().length > 0;
    });

    addExclude = '';
    addInclude = '';

    fields = computed(() => {
        const tp = this.targetPreview();
        if (tp?.portType === 'REL') {
            return tp.columns?.map(c => c.name).filter(name => name !== PK_COL) || [];
        } else if (tp?.portType === 'DOC') {
            return tp.fields || [];
        } else if (tp?.portType === 'LPG') {
            return [...(tp.nodeLabels || []), ...(tp.edgeLabels || [])];
        }
        return [];
    });
    notExcludedFields = computed(() => {
        this.changed();
        return this.fields().filter(f => !this.val().exclude.includes(f));
    });
    notIncludedFields = computed(() => {
        this.changed();
        return this.fields().filter(f => !this.val().include.includes(f));
    });


    // simple
    dropdownData = computed(() => this.fields().map(field => {
        return {id: field, itemName: field};
    }));
    includeData: { id: string; itemName: string; }[] = [];
    private changed = signal(false); // dummy signal to trigger recomputation


    // https://www.npmjs.com/package/angular2-multiselect-dropdown
    readonly dropdownSettings = {
        singleSelection: false,
        text: 'Select...',
        noDataLabel: 'No fields found',
        searchPlaceholderText: 'Search or add new',
        enableSearchFilter: true,
        enableCheckAll: true,
        enableFilterSelectAll: false,
        addNewItemOnFilter: true,
        tagToBody: false,
        position: 'bottom', // Top currently has bug: https://github.com/CuppaLabs/angular2-multiselect-dropdown/issues/584, https://github.com/CuppaLabs/angular2-multiselect-dropdown/issues/605
        autoPosition: false
    };

    constructor(private _toast: ToasterService) {
        effect(() => {
            this.changed();

            if (this.def().simplified) {
                this.includeData = this.val().include.map(fieldName => {
                    return {id: fieldName, itemName: fieldName};
                });
            }
        });
    }


    valueChanged() {
        this.hasChanged.emit();
        this.changed.update(v => !v);
    }

    initialize() {
        this.val().include = [...this.fields()];
        this.valueChanged();
    }

    drop(event: CdkDragDrop<string[], any>) {
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
        if (this.isRel() && fieldName === PK_COL) {
            this._toast.warn(`Cannot add primary key column ${PK_COL}`);
            return;
        }
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

    moveAllTo(target: 'exclude' | 'include') {
        const [sourceArr, targetArr] = target === 'exclude' ?
            [this.val().include, this.val().exclude] :
            [this.val().exclude, this.val().include];
        if (sourceArr.length > 0) {
            targetArr.push(...sourceArr);
            sourceArr.splice(0, sourceArr.length);
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

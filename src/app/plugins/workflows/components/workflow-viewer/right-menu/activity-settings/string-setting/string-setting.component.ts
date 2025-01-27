import {Component, computed, EventEmitter, input, model, Output, Signal} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {DataModel} from '../../../../../../../models/ui-request.model';
import {AdapterModel} from '../../../../../../../views/adapters/adapter.model';
import {CatalogService} from '../../../../../../../services/catalog.service';

@Component({
    selector: 'app-string-setting',
    templateUrl: './string-setting.component.html',
    styleUrl: './string-setting.component.scss'
})
export class StringSettingComponent {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>();
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<StringSettingDef>(() => this.settingDef() as StringSettingDef);
    usesAutocomplete = computed(() => this.def().autoComplete !== 'NONE');
    targetPreview = computed(() => this.inTypePreview()[this.def().autoCompleteInput]);
    suggestions = computed(() => {
        if (this.usesAutocomplete()) {
            switch (this.def().autoComplete) {
                case 'FIELD_NAMES':
                    return this.targetPreview().fields.map(field => field.name);
                case 'ADAPTERS':
                    return this.adapters().map(a => a.name);
            }
        }
        return [];
    });
    adapters: Signal<AdapterModel[]>;
    protected readonly DataModel = DataModel;

    constructor(private _catalog: CatalogService) {
        this.adapters = computed(() => {
            this._catalog.listener();
            return [...this._catalog.getStores().filter(store =>
                // mvcc currently results in deadlocks with concurrent schema changes
                store.adapterName !== 'HSQLDB' || store.settings['trxControlMode'] !== 'mvcc'
            )];
        });
    }

    valueChanged() {
        setTimeout(() => {
            this.hasChanged.emit();
        }, 10); // short delay to ensure this.value() has updated when selecting an autocomplete entry
    }
}

type AutoCompleteType = 'NONE' | 'FIELD_NAMES' | 'VALUES' | 'ADAPTERS';

interface StringSettingDef extends SettingDefModel {
    minLength: number;
    maxLength: number;
    autoComplete: AutoCompleteType;
    autoCompleteInput: number;
}

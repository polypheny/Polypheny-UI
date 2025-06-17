import {Component, computed, EventEmitter, inject, input, model, OnInit, Output, signal, Signal} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';
import {DataModel} from '../../../../../../../models/ui-request.model';
import {CatalogService} from '../../../../../../../services/catalog.service';

@Component({
    selector: 'app-entity-setting',
    templateUrl: './entity-setting.component.html',
    styleUrl: './entity-setting.component.scss'
})
export class EntitySettingComponent implements OnInit {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>(); // not required for int
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<EntitySettingDef>(() => this.settingDef() as EntitySettingDef);

    protected readonly DataModel = DataModel;
    private readonly _catalog = inject(CatalogService);
    private readonly changed = signal(false); // dummy signal to trigger recomputation
    namespaces: Signal<string[]>;
    names: Signal<string[]>;

    ngOnInit(): void {
        this.namespaces = computed(() =>
            this._catalog.getNamespaces().filter(ns => ns.dataModel === this.def().dataModel).map(ns => ns.name)
        );
        this.names = computed(() => {
            this.changed();
            const catalog = this._catalog.listener();
            if (this.value().namespace) {
                const namespace = catalog.getNamespaceFromName(this.value().namespace);
                if (namespace) {
                    return catalog.getEntities(namespace.id).map(e => e.name);
                }
            }
            return [];
        });
    }


    valueChanged() {
        setTimeout(() => {
            this.hasChanged.emit();
        }, 10); // short delay to ensure this.value().? updated correctly when selecting an autocomplete entry
        this.changed.update(v => !v);
    }
}

interface EntitySettingDef extends SettingDefModel {
    dataModel: DataModel; // non-null!
    mustExist: boolean;
}

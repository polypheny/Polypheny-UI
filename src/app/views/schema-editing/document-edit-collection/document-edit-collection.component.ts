import {Component, HostListener, effect, inject, Input, OnDestroy, OnInit, Signal, untracked} from '@angular/core';
import * as $ from 'jquery';
import {CrudService} from '../../../services/crud.service';
import {PolyType, RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {Method, QueryRequest} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {AdapterModel} from '../../adapters/adapter.model';
import {Subscription} from 'rxjs';
import {CatalogService} from '../../../services/catalog.service';
import {
    AllocationEntityModel,
    AllocationPartitionModel,
    AllocationPlacementModel,
    NamespaceModel,
    TableModel
} from '../../../models/catalog.model';
import {SchemaBuilderSave, ValidationAction} from '../document-schema-builder/document-schema-builder.component';

@Component({
    selector: 'app-document-edit-collection',
    templateUrl: './document-edit-collection.component.html',
    styleUrls: ['./document-edit-collection.component.scss']
})
export class DocumentEditCollectionComponent implements OnInit, OnDestroy {

    public readonly _crud = inject(CrudService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);
    private readonly _toast = inject(ToasterService);

    constructor() {
        // Reload schema whenever the selected entity/namespace changes
        effect(() => {
            const ns = this.namespace?.();
            const ent = this.entity?.();
            if (!ns || !ent) {
                return;
            }
            untracked(() => this.loadSchema());
        });
    }

    @Input() readonly entity: Signal<TableModel>;
    @Input() readonly namespace: Signal<NamespaceModel>;
    @Input() readonly currentRoute: Signal<string>;

    @Input() readonly placements: Signal<AllocationPlacementModel[]>;
    @Input() readonly partitions: Signal<AllocationPartitionModel[]>;
    @Input() readonly allocations: Signal<AllocationEntityModel[]>;
    @Input() readonly stores: Signal<AdapterModel[]>;
    @Input() readonly addableStores: Signal<AdapterModel[]>;

    types: PolyType[] = [];
    editColumn = -1;
    createColumn = new UiColumnDefinition(-1, '', false, true, 'text', '', null, null, null);
    confirm = -1;
    updateColumn = new UntypedFormGroup({name: new UntypedFormControl('')});

    selectedStore: AdapterModel;
    placementMethod: Method;
    isAddingPlacement = false;

    subscriptions = new Subscription();
    protected readonly Method = Method;

    // Schema UI state
    schemaLoading = false;
    hasSchema = false;
    currentDocSchema: any | null = null;
    currentValidationAction: ValidationAction = 'off';
    schemaBuilderVisible = false;

    ngOnInit() {
        this.getFixedFields();
        this.loadSchema();
    }

    ngOnDestroy() {
        $(document).off('click');
        this.subscriptions.unsubscribe();
    }

    // see https://medium.com/claritydesignsystem/1b66d45b3e3d
    @HostListener('window:click', ['$event.target'])
    onClick(targetElement: string) {
        const self = this;
        if ($(targetElement).parents('.editing').length === 0) {
            self.editColumn = -1;
        }
    }

    getFixedFields() {
        return [];
    }

    // Schema helpers

    private normalizeValidationAction(v: any): ValidationAction {
        const s = (v ?? 'off').toString().trim().toLowerCase();
        if (s === 'strict' || s === 'error') {
            return 'strict';
        }
        if (s === 'warn' || s === 'warning') {
            return 'warn';
        }
        return 'off';
    }

    private parseJsonIfString(v: any): any {
        if (typeof v !== 'string') {
            return v;
        }
        try {
            return JSON.parse(v);
        } catch {
            return v;
        }
    }

    private unwrapAnyQueryResponse(res: any): any {
        if (Array.isArray(res)) {
            return res.length > 0 ? res[0] : null;
        }
        return res;
    }

    // Load / apply schema

    loadSchema() {
        const ns = this.namespace?.();
        const ent = this.entity?.();
        if (!ns || !ent) {
            return;
        }

        this.schemaLoading = true;

        const query = `db.getCollectionSchema(${JSON.stringify(ent.name)})`;

        const request = new QueryRequest(query, false, false, 'mongo', ns.name);

        this._crud.anyQueryBlocking(request).subscribe({
            next: (res: any) => {
                const r = this.unwrapAnyQueryResponse(res);

                if (!r) {
                    this.hasSchema = false;
                    this.currentDocSchema = null;
                    this.currentValidationAction = 'off';
                    return;
                }
                if (r.error || r.exception) {
                    this._toast.exception(r, 'Could not load collection schema:');
                    this.hasSchema = false;
                    this.currentDocSchema = null;
                    this.currentValidationAction = 'off';
                    return;
                }

                // response: r.data is array of JSON strings
                const raw0 = r?.data?.[0];
                const row = this.parseJsonIfString(raw0);

                // payload: row.schema.docSchema + row.schema.validationAction
                const schemaObj = this.parseJsonIfString(row?.schema);
                const docSchema = this.parseJsonIfString(schemaObj?.docSchema);
                const va = schemaObj?.validationAction ?? schemaObj?.enforcement ?? 'OFF';

                this.currentValidationAction = this.normalizeValidationAction(va);
                this.currentDocSchema = docSchema ?? null;
                this.hasSchema = !!(docSchema && typeof docSchema === 'object' && docSchema.properties);
            },
            error: err => {
                this._toast.error('Could not load collection schema due to an unknown error.');
                console.log(err);
                this.hasSchema = false;
                this.currentDocSchema = null;
                this.currentValidationAction = 'off';
            }
        }).add(() => {
            this.schemaLoading = false;
        });
    }

    openSchemaBuilder() {
        this.schemaBuilderVisible = true;
    }

    applySchemaFromBuilder(e: SchemaBuilderSave) {
        const ns = this.namespace?.();
        const ent = this.entity?.();
        if (!ns || !ent) {
            return;
        }

        const docSchemaLiteral = JSON.stringify(e.docSchema);
        const query =
            `db.alterCollectionSchema(${JSON.stringify(ent.name)}, { docSchema: ${docSchemaLiteral}, validationAction: "${e.validationAction}" })`;

        // IMPORTANT: cache=false, lang="mongo"
        const request = new QueryRequest(query, false, false, 'mongo', ns.name);

        this.schemaLoading = true;
        this._crud.anyQueryBlocking(request).subscribe({
            next: (res: any) => {
                const r = this.unwrapAnyQueryResponse(res);
                if (r?.error || r?.exception) {
                    this._toast.exception(r ?? res, 'Could not alter collection schema:');
                    return;
                }
                this._toast.success('Updated schema for ' + ent.name, r?.query ?? query);
                this.loadSchema();
            },
            error: err => {
                this._toast.error('Could not alter collection schema due to an unknown error.');
                console.log(err);
            }
        }).add(() => {
            this.schemaLoading = false;
        });
    }

    // Placements

    modifyPlacement(method: Method, storeId: number = null) {
        this.placementMethod = method;
        if (storeId != null) {
            this.selectedStore = this._catalog.getAdapter(storeId);
        }
        if (!this.stores) {
            return;
        }
        this.isAddingPlacement = true;
        this._crud.addDropCollectionPlacement(this.namespace().name, this.entity().name, this.selectedStore.name, this.placementMethod).subscribe({
                next: (result: RelationalResult) => {
                    if (result.error) {
                        this._toast.exception(result);
                    } else {
                        if (this.placementMethod === Method.ADD) {
                            this._toast.success('Added placement on store ' + this.selectedStore.name, result.query, 'Added placement');
                        } else if (this.placementMethod === Method.MODIFY) {
                            this._toast.success('Modified placement on store ' + this.selectedStore.name, result.query, 'Modified placement');
                        }
                    }
                    this.selectedStore = null;
                }, error: err => {
                    this._toast.error('Could not ' + this.placementMethod.toLowerCase() + ' placement on store ' + this.selectedStore.name);
                }
            }
        ).add(() => {
            this.isAddingPlacement = false;
        });
    }

    /*validate(defaultValue: any) {
        if (defaultValue === null) {
            return '';
        } else if (isNaN(defaultValue) || defaultValue === '') {
            return 'is-invalid';
        } else {
            return 'is-valid';
        }
    }*/
}
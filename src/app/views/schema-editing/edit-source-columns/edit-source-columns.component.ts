import {Component, computed, inject, input, Input, OnDestroy, OnInit, Signal} from '@angular/core';
import {RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ColumnRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import * as $ from 'jquery';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {ForeignKey} from '../../uml/uml.model';
import {CatalogService} from '../../../services/catalog.service';
import {AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, EntityType, ForeignKeyModel, NamespaceModel, TableModel} from '../../../models/catalog.model';
import {AdapterModel} from '../../adapters/adapter.model';

const tabs = ['column', 'source', 'foreign', 'statistics'] as const;
type Tabs = (typeof tabs)[number]; // returns the type of any element in the tabs array

@Component({
    selector: 'app-edit-source-columns',
    templateUrl: './edit-source-columns.component.html',
    styleUrls: ['./edit-source-columns.component.scss'],
    standalone: false
})
export class EditSourceColumnsComponent implements OnInit, OnDestroy {

    private readonly _crud = inject(CrudService);
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);

    constructor() {

        this.foreignKeys = computed(() => {
            const catalog = this._catalog.listener();
            const namespace = this.namespace();
            const entity = this.entity();
            if (!namespace || !entity) {
                return this.foreignKeys();
            }

            const fks = new Map<string, ForeignKeyModel>();
            this._catalog.getKeys(entity.id).filter(k => !k.isPrimary).map(k => <ForeignKeyModel>k).forEach(k => {
                fks.set(catalog.getConstraintName(k.id), k);
                return [...fks.values()];
            });
        });


        this.columns = computed(() => {
            const catalog = this._catalog.listener();
            if (!this.entity) {
                return [];
            }

            const entity = this.entity();
            if (!entity) {
                return this.columns();
            }
            const columns = this._catalog.getColumns(entity.id);

            return columns.map(c => {
                const primaries: number[] = this._catalog.getPrimaryKey(c.entityId)?.columnIds || [];
                return UiColumnDefinition.fromModel(c, primaries);
            });
        });
    }

    @Input()
    readonly entity: Signal<TableModel>;
    @Input()
    readonly namespace: Signal<NamespaceModel>;
    @Input()
    readonly placements: Signal<AllocationPlacementModel[]>;
    @Input()
    readonly partitions: Signal<AllocationPartitionModel[]>;
    @Input()
    readonly allocations: Signal<AllocationEntityModel[]>;
    @Input()
    readonly stores: Signal<AdapterModel[]>;
    @Input()
    readonly addableStores: Signal<AdapterModel[]>;

    currentRoute = input.required<string>();
    currentTab = input.required<string>();

    activeTab = computed<Tabs>(() =>
        (tabs.includes(this.currentTab() as Tabs) ? this.currentTab() : 'column') as Tabs
    );

    readonly columns: Signal<UiColumnDefinition[]>;
    readonly foreignKeys: Signal<ForeignKey[]>;
    errorMsg: string;
    editingCol: string;
    subscriptions = new Subscription();

    public readonly EntityType = EntityType;

    ngOnInit(): void {
        //this.getPlacements();
        const self = this;
        $(document).on('click', function (e) {
            if ($(e.target).hasClass('rename') || $(e.target).hasClass('add-col')) {
                return;
            }
            if ($(e.target).parents('.editing').length === 0) {
                self.editingCol = undefined;
            }
        });
    }

    ngOnDestroy() {
        $(document).off('click');
        this.subscriptions.unsubscribe();
    }


    getAddableColumns(): Observable<UiColumnDefinition[]> {
        const cols: UiColumnDefinition[] = [];

        for (const col of this.columns()) {
            if (!this._catalog.getColumns(this.entity().id).find(h => h.name === col.name)) {
                cols.push(col);
            }
        }

        return new BehaviorSubject(cols);
    }

    dropColumn(col: UiColumnDefinition) {
        const oldColumn = new ColumnRequest(this.entity().id, col);
        this._crud.dropColumn(oldColumn).subscribe({
            next: (res: RelationalResult) => {
                if (res.error) {
                    this._toast.exception(res);
                } else {
                    this._toast.success('The source column was dropped');
                }
                //this._catalog.updateIfNecessary();
            }, error: err => {
                console.log(err);
            }
        });
    }

    renameColumn(input: HTMLInputElement, oldCol: UiColumnDefinition, newName: string, tableType: string) {
        if (newName.trim() === '') {
            this._toast.error('Name can not be empty.');
            return;
        }
        const newCol = Object.assign({}, oldCol);
        newCol.name = newName;
        console.log(newCol);
        const request = new ColumnRequest(this.entity().id, oldCol, newCol, true, tableType);
        this._crud.updateColumn(request).subscribe({
            next: (res: RelationalResult) => {
                if (res.error) {
                    this._toast.exception(res);
                } else {
                    this._toast.success('Renamed column "' + oldCol.name + '" to "' + newName + '"');
                }
                this.editingCol = undefined;
                input.value = '';
                //this._catalog.updateIfNecessary();
            }, error: err => {
                this._toast.error('Could not rename the column "' + oldCol.name + '" to "' + newName + '"');
                console.log(err);
            }
        });
    }

    addColumn(col: UiColumnDefinition, newName: string, newDefault: string) {
        const request = new ColumnRequest(this.entity().id, null, new UiColumnDefinition(-1, col.name, null, null, col.dataType, '', null, null, newDefault, -1, -1, newName));
        this._crud.createColumn(request).subscribe({
            next: res => {
                const result = <RelationalResult>res;
                if (result.error) {
                    this._toast.exception(result);
                } else {
                    this._toast.success('Added column "' + newName + '"');
                }
                //this._catalog.updateIfNecessary();
                this.editingCol = undefined;
            }, error: err => {
                this._toast.error('Could not add the column "' + newName + '"');
                console.log(err);
            }
        });
    }


    validTableName(name: string): boolean {
        return name.trim() !== '';
    }

    getTitle() {
        return this._route.params['id'];
    }

    getAdapters(): Signal<AdapterModel[]> {
        return computed(() => this.placements()?.map(a => this._catalog.getAdapter(a.adapterId)).filter(a => a));
    }

    openDataView() {
        this._router.navigate(['/views/data-table/' + this.currentRoute()]).then();
    }

    setTab(tab: Tabs) {
        this._router.navigate(['/views/schema-editing/', this.currentRoute(), tab]).then();
    }
}

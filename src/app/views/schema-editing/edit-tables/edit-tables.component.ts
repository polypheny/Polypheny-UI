import {Component, computed, ElementRef, inject, Input, OnDestroy, OnInit, QueryList, Renderer2, Signal, ViewChildren} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {EditTableRequest} from '../../../models/ui-request.model';
import {Router} from '@angular/router';
import {EntityMeta, PolyType, RelationalResult, Status, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToasterService} from '../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {Subscription} from 'rxjs';
import {DbTable} from '../../uml/uml.model';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {CatalogService} from '../../../services/catalog.service';
import {AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, EntityType, NamespaceModel, TableModel} from '../../../models/catalog.model';
import {AdapterModel} from '../../adapters/adapter.model';

const INITIAL_TYPE = 'BIGINT';

@Component({
    selector: 'app-edit-tables',
    templateUrl: './edit-tables.component.html',
    styleUrls: ['./edit-tables.component.scss']
})
export class EditTablesComponent implements OnInit, OnDestroy {

    public readonly _crud = inject(CrudService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);
    public readonly _breadcrumb = inject(BreadcrumbService);
    private readonly _toast = inject(ToasterService);
    private readonly _router = inject(Router);
    private readonly _leftSidebar = inject(LeftSidebarService);
    private readonly _settings = inject(WebuiSettingsService);
    private readonly _render = inject(Renderer2);

    @ViewChildren('editing', {read: ElementRef}) inputGroup: QueryList<ElementRef>;
    types: PolyType[] = [];

    @Input()
    readonly entity: Signal<TableModel>;
    @Input()
    readonly namespace: Signal<NamespaceModel>;
    @Input()
    readonly currentRoute: Signal<string>;

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

    readonly tables: Signal<Table[]>; //= signal([]);

    counter = 0;
    newColumns = new Map<number, UiColumnDefinition>();
    newTableName = '';
    selectedStore: AdapterModel;
    creatingTable = false;

    editOpen = false;

    //export table
    exportProgress = 0.0;
    private subscriptions = new Subscription();

    constructor() {
        this._render.listen('document', 'click', (e: Event) => {
            if (!this.inputGroup || this.inputGroup.length === 0) {
                return;
            }
            if (this.editOpen && !this.inputGroup.get(0).nativeElement.contains(e.target)) {
                this.tables().map(t => {
                    t.editing = false;
                    return t;
                });
                this.editOpen = false;
            } else {
                this.editOpen = true;
            }
        });

        this.tables = computed(() => {
            const catalog = this._catalog.listener();
            if (!this.namespace) {
                return;
            }
            const namespace = this.namespace();
            if (!namespace) {
                return;
            }
            const entities = this._catalog.getEntities(namespace.id);
            return entities.map(e => Table.fromModel(<TableModel>e)).sort((a, b) => a.name.localeCompare(b.name));
        });
    }

    ngOnInit() {
        this.newColumns.set(this.counter++, new UiColumnDefinition(-1, '', true, false, INITIAL_TYPE, '', null, null));
        this.getTypeInfo();

        this.initSocket();
        const sub2 = this._crud.onReconnection().subscribe((b) => {
            if (b) {
                this.onReconnect();
            }
        });
        this.subscriptions.add(sub2);
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    onReconnect() {
        //this._catalog.updateIfNecessary();
        this.getTypeInfo();
        this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
    }

    /**
     * enable the button if the confirm-text is equal to the table-name or to 'drop table-name' respectively 'truncate table-name'
     */
    isDropTruncateEnabled(action: 'drop' | 'truncate', table: Table) {
        return action === 'drop' && (table.drop === table.name || table.drop === 'drop ' + table.name) ||
            action === 'truncate' && (table.truncate === table.name || table.truncate === 'truncate ' + table.name);
    }

    /**
     * send a request to either drop or truncate a table
     */
    sendDropTruncateRequest(action: 'drop' | 'truncate', table: Table) {
        let request: EditTableRequest;
        let type: string;
        if (!this.isDropTruncateEnabled(action, table)) {
            return;
        }

        if (table.tableType !== EntityType.VIEW) {
            request = new EditTableRequest(this.namespace().id, table.id, null, action);
            console.log(request);
            type = ' the Table ';
        } else {
            request = new EditTableRequest(this.namespace().id, table.id, null, action, null, null, EntityType.VIEW);
            type = ' the View ';
        }

        this._crud.dropTruncateTable(request).subscribe({
            next: (result: RelationalResult) => {

                if (result.error) {
                    this._toast.exception(result, 'Could not ' + action + type + table + ':');
                } else {
                    let toastAction = 'Truncated';
                    if (request.getAction() === 'drop') {
                        toastAction = 'Dropped';
                        this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
                    }
                    table.truncate = '';
                    table.drop = '';
                    this._toast.success(toastAction + type + table.name);
                    //this._catalog.updateIfNecessary();
                }
            }, error: err => {
                this._toast.error('Could not ' + action + type + table + ' due to an unknown error');
                console.log(err);
            }
        });
    }

    createTable() {
        if (this.newTableName === '') {
            this._toast.warn('Please provide a name for the new table. The new table was not created.', 'missing table name', ToastDuration.INFINITE);
            return;
        }
        if (!this._crud.nameIsValid(this.newTableName)) {
            this._toast.warn('Please provide a valid name for the new table. The new table was not created.', 'invalid table name', ToastDuration.INFINITE);
            return;
        }
        if (this.tables().filter((t) => {
            return this.namespace().caseSensitive ? t.name === this.newTableName : t.name.toLowerCase() === this.newTableName.toLowerCase();
        }).length > 0) {
            this._toast.warn('A table with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
            return;
        }
        let valid = true;
        //clear precision/scale for types where it is not applicable
        //delete columns with no column name
        let hasPk = false;
        this.newColumns.forEach((v, k) => {
            if (!this._types.supportsPrecision(v.dataType) && v.precision !== null) {
                v.precision = null;
            }
            if (!this._types.supportsScale(v.dataType) && v.scale !== null) {
                v.scale = null;
            }
            //clear cardinality and dimension if it is not an array
            if (v.collectionsType !== 'ARRAY') {
                v.cardinality = null;
                v.dimension = null;
            }
            if (v.name === '') {
                this.newColumns.delete(k);
            }
            if (!this._crud.nameIsValid(v.name)) {
                valid = false;
                return;
            }

            if (v.primary) {
                hasPk = true;
            }
        });
        if (!hasPk) {
            this._toast.warn('Please specify a primary key. The new table was not created.', 'missing primary key', ToastDuration.INFINITE);
            return;
        }
        if (!valid) {
            this._toast.warn('Please make sure all column names are valid. The new table was not created.', 'invalid column name', ToastDuration.INFINITE);
            return;
        }
        const request = new EditTableRequest(this.namespace().id, null, this.newTableName, 'create', Array.from(this.newColumns.values()), this.selectedStore?.id);
        this.creatingTable = true;
        this._crud.createTable(request).subscribe({
            next: (result: RelationalResult) => {
                if (result.error) {
                    this._toast.exception(result, 'Could not generate table:');
                } else {
                    this._toast.success('Generated table ' + request.entityName, result.query);
                    this.newColumns.clear();
                    this.counter = 0;
                    this.newColumns.set(this.counter++, new UiColumnDefinition(-1, '', true, false, INITIAL_TYPE, '', null, null));
                    this.newTableName = '';
                    this.selectedStore = null;
                    this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
                }
                //this._catalog.updateIfNecessary();
            }, error: err => {
                this._toast.error('Could not generate table');
                console.log(err);
            }
        }).add(() => this.creatingTable = false);
    }

    rename(table: Table) {
        const meta = new EntityMeta(this.namespace().id, table.id, table.newName, []);
        const type = table.tableType === EntityType.VIEW ? ' View ' : ' Table ';
        this._crud.renameTable(meta).subscribe({
            next: (r: RelationalResult) => {
                if (r.exception) {
                    this._toast.exception(r);
                } else {
                    this._toast.success('Renamed' + type + table.name + ' to ' + table.newName);
                    //this._catalog.updateIfNecessary();
                    this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
                }
            }, error: err => {
                this._toast.error('Could not rename the' + type + table.name);
                console.log(err);
            }
        });
    }

    /**
     * Check if the new table name is valid
     */
    canRename(table: Table) {
        //table.name !== table.newName  not necessary, since the filter will catch it as well
        return this.tables().filter((t) => t.name === table.newName).length === 0 &&
            this._crud.nameIsValid(table.newName);
    }

    initSocket() {
        const sub = this._crud.onSocketEvent().subscribe(
            (msg: Status) => {
                if (msg.context === 'tableExport') {
                    this.exportProgress = msg.status;
                }
            }, err => {
                setTimeout(() => {
                    this.initSocket();
                }, +this._settings.getSetting('reconnection.timeout'));
            });
        this.subscriptions.add(sub);
    }

    createTableValidation(name: string) {
        const regex = this._crud.getValidationRegex();
        if (name === '') {
            return '';
        } else if (regex.test(name) && name.length <= 100 && this.tables().filter((t) => {
            return this.namespace().caseSensitive ? t.name === name : t.name.toLowerCase() === name.toLowerCase();
        }).length === 0) {
            return 'is-valid';
        } else {
            return 'is-invalid';
        }
    }

    columnValidation(columnName: string, editing: string) {
        if (columnName.length === 0) {
            return '';
        }
        if (Array.from(this.newColumns.values()).filter((h) => h.name.toLowerCase() === columnName.toLowerCase()).length > 1) {
            return 'is-invalid';
        }
        return this._crud.getValidationClass(columnName);
    }

    addNewColumn() {
        this.newColumns.set(this.counter++, new UiColumnDefinition(-1, '', false, true, INITIAL_TYPE, '', null, null));
    }

    removeNewColumn(i: number) {
        if (this.newColumns.size === 1) {
            this.counter = 0;
            this.newColumns.clear();
            this.newColumns.set(this.counter++, new UiColumnDefinition(-1, '', true, false, INITIAL_TYPE, '', null, null));
        } else {
            //don't change the counter here!
            this.newColumns.delete(i);
        }
    }

    triggerDefaultNull(col: UiColumnDefinition) {
        if (col.defaultValue === null) {
            if (this._types.isNumeric(col.dataType)) {
                col.defaultValue = 0;
            } else if (this._types.isBoolean(col.dataType)) {
                col.defaultValue = false;
            } else {
                col.defaultValue = '';
            }
        } else {
            col.defaultValue = null;
        }
    }

    getTypeInfo() {
        this._types.getTypes().subscribe(
            t => {
                this.types = t;
                this.newColumns.get(0).dataType = INITIAL_TYPE;
            }
        );
    }

    openDetails(table: Table) {
        this._router.navigate(['/views/schema-editing/' + this.namespace().name + '.' + table.name]).then();
    }
}

export class Table {
    id: number;
    name: string;
    truncate = '';
    drop = '';
    export = false;
    editing = false;
    newName: string;
    modifiable: boolean;
    tableType: EntityType;

    constructor(id: number, name: string, newName: string, modifiable: boolean, entityType: EntityType) {
        this.id = id;
        this.name = name;
        this.newName = newName;
        this.modifiable = modifiable;
        this.tableType = entityType;
    }

    static fromDb(table: DbTable) {
        return new Table(null, table.tableName, table.tableName, table.modifiable, table.tableType);
    }

    static fromModel(table: TableModel) {
        return new Table(table.id, table.name, table.name, table.modifiable, table.entityType);
    }

}


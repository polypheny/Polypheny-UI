import {Component, computed, ElementRef, inject, Input, OnDestroy, OnInit, QueryList, Renderer2, Signal, ViewChildren} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {Method, QueryRequest} from '../../../models/ui-request.model';
import {Router} from '@angular/router';
import {EntityMeta, RelationalResult, Result} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToasterService} from '../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {Subscription} from 'rxjs';
import {DbTable} from '../../uml/uml.model';
import {AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, CollectionModel, EntityType, NamespaceModel, TableModel} from '../../../models/catalog.model';
import {CatalogService} from '../../../services/catalog.service';
import {AdapterModel} from '../../adapters/adapter.model';

@Component({
    selector: 'app-document-edit-collections',
    templateUrl: './document-edit-collections.component.html',
    styleUrls: ['./document-edit-collections.component.scss']
})
export class DocumentEditCollectionsComponent implements OnInit, OnDestroy {

    public readonly _crud = inject(CrudService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);
    private readonly _toast = inject(ToasterService);
    private readonly _router = inject(Router);
    private readonly _leftSidebar = inject(LeftSidebarService);
    private readonly _render = inject(Renderer2);

    constructor() {
        this._render.listen('document', 'click', (e: Event) => {
            if (!this.inputGroup || this.inputGroup.length === 0) {
                return;
            }
            if (this.editOpen && !this.inputGroup.get(0).nativeElement.contains(e.target)) {
                this.collections().map(t => {
                    t.editing = false;
                    return t;
                });
                this.editOpen = false;
            } else {
                this.editOpen = true;
            }
        });

        this.collections = computed(() => {
            const catalog = this._catalog.listener();
            if (!this.namespace) {
                return;
            }
            const namespace = this.namespace();
            if (!namespace) {
                return;
            }
            const collections = this._catalog.getEntities(namespace.id);
            return collections.map(c => Collection.fromModel(<CollectionModel>c)).sort((a, b) => a.name.localeCompare(b.name));
        });

        this.stores = computed(() => {
            const catalog = this._catalog.listener();
            return this._catalog.getStores();
        });
    }

    @ViewChildren('editing', {read: ElementRef}) inputGroup: QueryList<ElementRef>;

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

    readonly collections: Signal<Collection[]>;

    newCollectionName: string;
    selectedStore: AdapterModel;
    creatingCollection = false;

    private subscriptions = new Subscription();

    private editOpen = false;

    protected readonly Method = Method;

    ngOnInit() {

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
        this._leftSidebar.setSchema(this._router, '/views/schema-editing/', false, 2, true);
    }

    /**
     * Enable the button if the confirm-text is equal to the table-name or to 'drop table-name' respectively 'truncate table-name'
     */
    isDropTruncateEnabled(action: Method, coll: Collection) {
        return action === Method.DROP && (coll.drop === coll.name || coll.drop === 'drop ' + coll.name) ||
            action === Method.TRUNCATE && (coll.truncate === coll.name || coll.truncate === 'truncate ' + coll.name);
    }

    /**
     * send a request to either drop or truncate a table
     */
    sendRequest(action: Method, collection: Collection) {
        if (!this.isDropTruncateEnabled(action, collection)) {
            return;
        }

        let query;
        switch (action) {
            case Method.DROP:
                query = `db.${collection.name}.drop()`;
                break;
            case Method.TRUNCATE:
                query = `db.${collection.name}.remove({})`;
                break;
            default:
                return;
        }

        const request = new QueryRequest(query, false, true, 'mql', this.namespace().name);

        this._crud.anyQueryBlocking(request).subscribe({
            next: (result: Result<any, any>) => {
                if (result.error) {
                    this._toast.exception(result, 'Could not ' + action + ' the table ' + collection + ':');
                } else {
                    //this._catalog.updateIfNecessary();
                    let toastAction = 'Truncated';
                    if (action === Method.DROP) {
                        toastAction = 'Dropped';
                        this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
                    }
                    collection.drop = '';
                    collection.truncate = '';
                    this._toast.success(toastAction + ' collection ' + collection.name);
                }

            }, error: err => {
                this._toast.error('Could not ' + action + ' the table ' + collection + ' due to an unknown error');
                console.log(err);
            }
        });
    }

    createCollection() {
        if (this.newCollectionName === '') {
            this._toast.warn('Please provide a name for the new collection. The new collection was not created.', 'missing table name', ToastDuration.INFINITE);
            return;
        }
        if (!this._crud.nameIsValid(this.newCollectionName)) {
            this._toast.warn('Please provide a valid name for the new collection. The new collection was not created.', 'invalid table name', ToastDuration.INFINITE);
            return;
        }
        if (this.collections().filter((t) => t.name === this.newCollectionName).length > 0) {
            //if (this.tables.indexOf(this.newTableName) !== -1) {
            this._toast.warn('A collection with this name already exists. Please choose another name.', 'invalid collection name', ToastDuration.INFINITE);
            return;
        }
        const query = 'db.createCollection(' + this.newCollectionName + ')';
        const entityName = this.newCollectionName;
        //const request = new EditCollectionRequest(this.namespace.value.id, this.newCollectionName, null, 'create', this.selectedStore);
        this.creatingCollection = true;
        this._crud.anyQueryBlocking(new QueryRequest(query, false, true, 'mql', this.namespace().name)).subscribe({
            next: (result: Result<any, any>) => {
                if (result.error) {
                    this._toast.exception(result, 'Could not generate collection:');
                } else {
                    this._toast.success('Generated collection ' + entityName, result.query);
                    this.newCollectionName = '';
                    this.selectedStore = null;
                    this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
                }
                //this._catalog.updateIfNecessary();
            }, error: err => {
                this._toast.error('Could not generate collection');
                console.log(err);
            }
        }).add(() => this.creatingCollection = false);
    }

    rename(table: Collection) {
        const t = new EntityMeta(this.namespace().id, table.id, table.newName, []);
        this._crud.renameTable(t).subscribe({
            next: res => {
                const r = <RelationalResult>res;
                if (r.exception) {
                    this._toast.exception(r);
                } else {
                    this._toast.success('Renamed table ' + table.name + ' to ' + table.newName);
                    //this._catalog.updateIfNecessary();
                    this._leftSidebar.setSchema(this._router, '/views/schema-editing/', false, 2, true);
                }
            }, error: err => {
                this._toast.error('Could not rename the collection ' + table.name);
                console.log(err);
            }

        });
    }

    /**
     * Check if the new table name is valid
     */
    canRename(table: Collection) {
        //table.name !== table.newName  not necessary, since the filter will catch it as well
        return this.collections().filter((t) => t.name === table.newName).length === 0 &&
            this._crud.nameIsValid(table.newName);
    }

    createTableValidation(name: string) {
        const regex = this._crud.getValidationRegex();
        if (name === '') {
            return '';
            //} else if (regex.test(name) && name.length <= 100 && this.tables.indexOf(name) === -1) {
        } else if (regex.test(name) && name.length <= 100 && this.collections().filter((t) => t.name === name).length === 0) {
            return 'is-valid';
        } else {
            return 'is-invalid';
        }
    }

    openDetails(collection: Collection) {
        this._router.navigate(['/views/schema-editing/' + this.namespace().name + '.' + collection.name]).then();

    }
}

class Collection {
    id: number;
    name: string;
    truncate = '';
    drop = '';
    export = false;
    editing = false;
    newName: string;
    modifiable: boolean;
    tableType: EntityType;

    constructor(name: string, newName: string, modifiable: boolean, entityType: EntityType) {
        this.name = name;
        this.newName = newName;
        this.modifiable = modifiable;
        this.tableType = entityType;
    }

    static fromDB(collection: DbTable) {
        return new Collection(collection.tableName, collection.tableName, collection.modifiable, collection.tableType);
    }

    static fromModel(collection: CollectionModel) {
        return new Collection(collection.name, collection.name, collection.modifiable, collection.entityType);
    }
}

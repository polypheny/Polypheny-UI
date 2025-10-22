import {Component, computed, effect, EventEmitter, inject, Input, OnDestroy, OnInit, Signal, signal, untracked, WritableSignal} from '@angular/core';
import {RelationalResult, Result, UiColumnDefinition} from '../models/result-set.model';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {CatalogService} from '../../../services/catalog.service';
import {EntityModel, EntityType} from '../../../models/catalog.model';
import {WebSocket} from '../../../services/webSocket';
import {EntityConfig} from '../data-table/entity-config';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {toSignal} from '@angular/core/rxjs-interop';
import {LeftSidebarService} from '../../left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {PaginationElement} from '../models/pagination-element.model';
import {DataModel, DeleteRequest, EntityRequest, Method, QueryRequest} from '../../../models/ui-request.model';
import {ToastDuration, ToasterService} from '../../toast-exposer/toaster.service';
import {SortState} from '../models/sort-state.model';
import {HttpEventType} from '@angular/common/http';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import * as $ from 'jquery';
import {CombinedResult} from '../data-view.model';

const INITIAL_TYPE = 'BIGINT';

@Component({
    selector: 'data-template',
    templateUrl: './data-template.component.html',
    styleUrls: ['./data-template.component.scss'],
    standalone: false
})
export abstract class DataTemplateComponent implements OnInit, OnDestroy {

    protected readonly _settings: WebuiSettingsService = inject(WebuiSettingsService);
    protected readonly _router: Router = inject(Router);
    protected readonly _route: ActivatedRoute = inject(ActivatedRoute);
    protected readonly _sidebar: LeftSidebarService = inject(LeftSidebarService);
    protected readonly _catalog: CatalogService = inject(CatalogService);
    protected readonly _crud: CrudService = inject(CrudService);
    protected readonly _toast: ToasterService = inject(ToasterService);
    protected readonly _types: DbmsTypesService = inject(DbmsTypesService);

    protected readonly webSocket: WebSocket;

    @Input() set inputConfig(config: EntityConfig) {
        if (!config) {
            return;
        }
        this.entityConfig.set(config);
    }

    protected readonly entityConfig: WritableSignal<EntityConfig> = signal({
        create: true,
        search: true,
        sort: true,
        update: true,
        delete: true,
        exploring: false,
        hideCreateView: false,
        cardRelWidth: false
    });
    protected readonly currentRoute: WritableSignal<string> = signal(this._route.snapshot.paramMap.get('id'));
    protected readonly routeParams = toSignal(this._route.params);
    protected readonly entity: Signal<EntityModel>;

    protected readonly $result: WritableSignal<CombinedResult> = signal(null);
    protected readonly loading: WritableSignal<boolean> = signal(false);
    protected readonly subscriptions = new Subscription();

    @Input() set result(result: Result<any, any>) {
        if (!result) {
            return;
        }
        this.$result.set(CombinedResult.from(result));
    }

    pagination: PaginationElement[] = [];
    currentPage: WritableSignal<number> = signal(1);
    editing = -1;//-1 if not editing any row, else the index of that row
    sortStates = new Map<string, SortState>();
    filter = new Map<string, string>();
    protected focusId: string;

    insertValues = new Map<string, any>();
    insertDirty = new Map<string, boolean>();//check if field has been edited (if yes, it is "dirty")
    updateValues = new Map<string, any>();

    /** -1 if not uploading, 0 or 100: striped, else: showing progress */
    uploadProgress = -1;
    downloadProgress = -1;
    downloadingIthRow = -1;
    confirm = -1;


    protected constructor() {
        this.webSocket = new WebSocket();
        this._route.params.subscribe(route => {
            this.currentRoute.set(route['id']);
            this.stopEditing();
        });

        this.entity = computed(() => {
            const catalog = this._catalog.listener();
            if (!this.currentRoute || !this.currentRoute()) {
                return null;
            }
            const route = this.currentRoute();
            if (!route) {
                return null;
            }
            const splits = route.split('.');
            return catalog.getEntityFromName(splits[0], splits[1]);
        });

        // to get the correct insert defaults
        effect(() => {
            if (!this.$result || !this.$result() || this.$result().error) {
                return;
            }
            untracked(() => {
                this.buildInsertObject();
                this.setPagination();
            });
        });
    }

    ngOnInit() {
        //this._sidebar.open();
        //listen to results
        this.initWebsocket();

        this.currentPage.set(+this._route.snapshot.paramMap.get('page') || 1);

        if (this.$result && this.$result()) {
            this.$result().currentPage = this.currentPage();
        }

        //listen to parameter changes
        this._route.params.subscribe(() => {
            this.currentPage.set(+this._route.snapshot.paramMap.get('page') || 1);

            this.$result?.update(res => {
                if (!res) {
                    return res;
                }
                res.currentPage = this.currentPage();
                return res;
            });

        });
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }


    protected initWebsocket() {
        const sub = this.webSocket.onMessage().subscribe({
            next: (result: Result<any, any>) => {
                if (!result) {
                    return;
                }

                //go to the highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
                if (this.$result && +this._route.snapshot.paramMap.get('page') > this.$result()?.highestPage) {
                    this._router.navigate(['/views/data-table/' + this.entity()?.name + '/' + this.$result().highestPage]).then(null);
                }
                this.editing = -1;
                this.buildInsertObject();

                this.entityConfig.update(conf => {
                    if (this.entity().entityType === EntityType.ENTITY) {
                        conf.create = true;
                        conf.update = true;
                        conf.delete = true;
                    } else {
                        conf.create = false;
                        conf.update = false;
                        conf.delete = false;
                    }
                    return conf;
                });

                this.$result.set(CombinedResult.from(result));
                this.loading.set(false);
            }, error: err => {
                console.log(err);
                this.loading.set(false);
                this.$result.set(CombinedResult.fromRelational(new RelationalResult('Server is not available')));
            }
        });
        this.subscriptions.add(sub);
    }

    removeNull(dataType: string) {
        return dataType.replace(' NOT NULL', '');
    }

    setPagination() {
        if (!this.$result()) {
            return;
        }
        const activePage = this.$result().currentPage;
        const highestPage = this.$result().highestPage;
        this.pagination = [];
        if (highestPage < 2) {
            return;
        }
        if (!this.entity || !this.entity()) {
            return;
        }
        const entity = this.entity();
        const entityId = entity.id;

        const neighbors = 1;//from active page, show n neighbors to the left and n neighbors to the right.
        const prev = new PaginationElement().withPage(entityId, Math.max(1, activePage - 1)).withLabel('<');

        if (activePage === 1) {
            prev.setDisabled();
        }

        this.pagination.push(prev);
        if (activePage === 1) {
            this.pagination.push(new PaginationElement().withPage(entityId, 1).setActive());
        } else {
            this.pagination.push(new PaginationElement().withPage(entityId, 1));
        }
        if (activePage - neighbors > 2) {
            this.pagination.push(new PaginationElement().withLabel('..').setDisabled());

        }
        let counter = Math.max(2, activePage - neighbors);
        while (counter <= activePage + neighbors && counter <= highestPage) {
            if (counter === activePage) {
                this.pagination.push(new PaginationElement().withPage(entityId, counter).setActive());
            } else {
                this.pagination.push(new PaginationElement().withPage(entityId, counter));
            }
            counter++;
        }
        counter--;
        if (counter < highestPage) {
            if (counter + neighbors < highestPage) {
                this.pagination.push(new PaginationElement().withLabel('..').setDisabled());
            }
            this.pagination.push(new PaginationElement().withPage(entityId, highestPage));
        }
        const next = new PaginationElement().withPage(entityId, Math.min(highestPage, activePage + 1)).withLabel('>');
        if (activePage === highestPage) {
            next.setDisabled();
        }

        this.pagination.push(next);

        return this.pagination;
    }

    paginate(p: PaginationElement) {
        this.$result().currentPage = p.page;
        this.getEntityData();
    }

    public getEntityData() {
        const filterObj = this.mapToObject(this.filter);
        const sortState = {};
        this.$result()?.header?.forEach((h: UiColumnDefinition) => {
            this.sortStates.set(h.name, h.sort);
            sortState[h.name] = h.sort;
        });
        const request = new EntityRequest(this.entity()?.id, this._catalog.getNamespaceFromId(this.entity()?.namespaceId).name, this.currentPage(), filterObj, sortState);

        if (!this._crud.getEntityData(this.webSocket, request)) {
            this.$result.set(CombinedResult.fromRelational(new RelationalResult('Could not establish a connection with the server.')));
        }
    }

    mapToObject(map: Map<any, any>) {
        const obj = {};
        map.forEach((v, k) => {
            obj[k] = v;
        });
        return obj;
    }

    deleteRow(values: string[], i: number | null) {
        if (i !== null && this.confirm !== i) { // confirm functionality may be delegated to app-delete-confirm component
            this.confirm = i;
            return;
        }
        if (this.$result().dataModel === DataModel.DOCUMENT) {
            this.adjustDocument(Method.DROP, values[0]);
            return;
        }

        const rowMap = new Map<string, string>();
        values.forEach((val, key) => {
            rowMap.set(this.$result().header[key].name, val);
        });
        const row = this.mapToObject(rowMap);
        const request = new DeleteRequest(this.entity()?.id, row);
        const emitResult = new EventEmitter<RelationalResult>();
        this._crud.deleteTuple(request).subscribe({
            next: (result: RelationalResult) => {
                emitResult.emit(result);
                if (result.error) {
                    this._toast.exception(result, 'Could not delete this tuple:');
                } else {
                    this.getEntityData();
                }
            }, error: err => {
                this._toast.error('Could not delete this tuple.');
                console.log(err);
                emitResult.emit(new RelationalResult('Could not delete this tuple.'));
            }
        });
        return emitResult;
    }


    /**
     * In the card and carousel view, show mm data first (only image, video and audio columns)
     */
    showFirst(dataType: string) {
        switch (dataType) {
            case 'IMAGE':
            case 'VIDEO':
            case 'AUDIO':
                return true;
        }
        return false;
    }

    getFileLink(data: string) {
        return this._crud.getFileUrl(data);
    }

    getFile(data: string, index: number) {
        this.downloadingIthRow = index;
        this.downloadProgress = 0;
        this._crud.getFile(data).subscribe({
            next: res => {
                if (res.type && res.type === HttpEventType.DownloadProgress) {
                    this.downloadProgress = Math.round(100 * res.loaded / res.total);
                } else if (res.type === HttpEventType.Response) {
                    //see https://stackoverflow.com/questions/51960172/
                    const url = window.URL.createObjectURL(<any>res.body);
                    window.open(url);
                }
            },
            error: err => {
                console.log(err);
            }
        }).add(() => {
            this.downloadingIthRow = -1;
            this.downloadProgress = -1;
        });

    }

    triggerEditing(i) {
        if (this.confirm !== -1) {
            //when double-clicking the delete btn
            return;
        }
        if (this.entityConfig().update) {
            this.updateValues.clear();
            this.$result().data[i].forEach((v, k) => {
                if (this.$result().header[k].dataType === 'bool') {
                    this.updateValues.set(this.$result().header[k].name, this.getBoolean(v));
                }
                    //assign multimedia types: null if the item is NULL, else undefined
                //null items will be submitted and updated, undefined items will not be part of the UPDATE statement
                else if (this._types.isMultimedia(this.$result().header[k].dataType)) {
                    if (v === null) {
                        this.updateValues.set(this.$result().header[k].name, null);
                    } else {
                        this.updateValues.set(this.$result().header[k].name, undefined);
                    }
                } else {
                    this.updateValues.set(this.$result().header[k].name, v);
                }
            });
            this.editing = i;
        }
    }

    stopEditing() {
        this.editing = -1;
    }

    getBoolean(value: any): Boolean {
        switch (value) {
            case true:
            case 'true':
            case 't':
            case 1:
            case '1':
            case 'on':
            case 'yes':
                return true;
            case 'null':
            case 'NULL':
            case null:
                return null;
            default:
                return false;
        }
    }

    inputChange(name: string, e) {
        this.insertValues.set(name, e);
        this.insertDirty.set(name, true);
    }

    insertTuple() {
        if (this.$result().dataModel === DataModel.DOCUMENT) {
            this.adjustDocument(Method.ADD);
            return;
        }
        const formData = new FormData();
        this.insertValues.forEach((v, k) => {
            //only values with dirty state will be submitted. Columns that are not nullable are already set dirty
            if (this.insertDirty.get(k) === true && v !== null) { // null check prevents null being inserted as string "null"
                let value;
                if (isNaN(v)) {
                    value = v;
                } else {
                    value = String(v);
                }
                formData.append(k, value);
            }
        });
        formData.append('entityId', String(this.entity().id));
        this.uploadProgress = 100;//show striped progressbar
        const emitResult = new EventEmitter<RelationalResult>();

        this._crud.insertTuple(formData).subscribe({
            next: res => {
                if (res.type && res.type === HttpEventType.UploadProgress) {
                    this.uploadProgress = Math.round(100 * res.loaded / res.total);
                } else if (res.type === HttpEventType.Response) {
                    this.uploadProgress = -1;
                    const result = <RelationalResult>res.body;
                    emitResult.emit(result);
                    if (result.error) {
                        if (result.error.includes('PRIMARY KEY')) {
                            this._toast.warn(`Insert failed: Duplicate primary key value.`);
                        } else {
                            this._toast.exception(result, 'Insert failed:');
                        }
                    } else if (result.affectedTuples === 1) {
                        $('.insert-input').val('');
                        this.insertValues.clear();
                        this.buildInsertObject();
                        this.getEntityData();
                    }
                }
            },
            error: err => {
                this._toast.error('Insert failed.');
                console.log(err);
                emitResult.emit(new RelationalResult('Insert failed.'));
            }
        }).add(() => this.uploadProgress = -1);
        return emitResult;
    }

    private adjustDocument(method: Method, initialData: string = '') {
        const entity = this.entity();
        switch (method) {
            case Method.ADD:
                const data = this.insertValues.get('Document');
                const add = `db.${entity.name}.insert(${data})`;

                this._crud.anyQuery(this.webSocket, new QueryRequest(add, false, true, 'mql', this.$result().namespace));
                this.insertValues.clear();
                this.getEntityData();
                break;
            case Method.MODIFY:
                const values = new Map<string, string>();//previous values
                for (let i = 0; i < this.$result().header.length; i++) {
                    values.set(this.$result().header[i].name, this.$result().data[this.editing][i]);
                    i++;
                }
                const updated = this.updateValues.get('Document');
                const parsed = JSON.parse(updated);
                if (parsed.hasOwnProperty('_id')) {
                    const modify = `db.${entity.name}.updateMany({"_id": "${parsed['_id']}"}, {"$set": ${updated}})`;
                    this._crud.anyQuery(this.webSocket, new QueryRequest(modify, false, true, 'mql', this.$result().namespace));
                    this.insertValues.clear();
                    this.getEntityData();
                }
                break;
            case Method.DROP:
                const parsedDelete = JSON.parse(initialData);
                if (parsedDelete.hasOwnProperty('_id')) {
                    const modify = `db.${entity.name}.deleteMany({"_id": "${parsedDelete['_id']}" })`;
                    this._crud.anyQuery(this.webSocket, new QueryRequest(modify, false, true, 'mql', this.$result().namespace));
                    this.insertValues.clear();
                    this.getEntityData();
                }
                break;
        }
    }

    buildInsertObject() {
        if (this.entityConfig && !this.entityConfig().create || !this.$result()) {
            return;
        }
        this.insertValues.clear();
        this.insertDirty.clear();

        if (this.$result().header) {
            for (const g of this.$result().header) {
                //set insertDirty
                if (!g.nullable && g.dataType !== 'serial' && g.defaultValue === undefined) {
                    //set dirty if not nullable, so it will be submitted, except if it has autoincrement (dataType 'serial') or a default value
                    this.insertDirty.set(g.name, true);
                } else {
                    this.insertDirty.set(g.name, false);
                }
                //set insertValues
                if (g.nullable) {
                    this.insertValues.set(g.name, null);
                    continue;
                }

                if (this._types.isNumeric((g.dataType))) {
                    this.insertValues.set(g.name, 0);
                } else if (this._types.isBoolean(g.dataType)) {
                    this.insertValues.set(g.name, false);
                } else {
                    this.insertValues.set(g.name, '');
                }
            }
        }
    }


    newUpdateValue(key, val) {
        this.updateValues.set(key, val);
    }

    updateTuple() {
        if (this.$result().dataModel === DataModel.DOCUMENT) {
            this.adjustDocument(Method.MODIFY);
            return;
        }

        const oldValues = new Map<string, string>();//previous values
        for (let i = 0; i < this.$result().header.length; i++) {
            oldValues.set(this.$result().header[i].name, this.$result().data[this.editing][i]);
            i++;
        }
        const formData = new FormData();
        formData.append('entityId', String(this.entity()?.id));
        formData.append('oldValues', JSON.stringify(this.mapToObject(oldValues)));
        for (const [k, v] of this.updateValues) {
            if (v === undefined) {
                //don't add undefined file inputs, but if they are null, they need to be added
                continue;
            }
            if (!(v instanceof File)) {
                //stringify to distinguish between null and 'null'
                formData.append(k, JSON.stringify(v));
            } else {
                formData.append(k, v);
            }
        }
        this.uploadProgress = 100;//show striped progressbar
        //const req = new UpdateRequest(this.resultSet.table, this.mapToObject(this.updateValues), this.mapToObject(oldValues));
        this._crud.updateTuple(formData).subscribe({
            next: res => {
                if (res.type && res.type === HttpEventType.UploadProgress) {
                    this.uploadProgress = Math.round(100 * res.loaded / res.total);
                } else if (res.type === HttpEventType.Response) {
                    this.uploadProgress = -1;
                    const result = <RelationalResult>res.body;
                    if (result.affectedTuples) {
                        this.getEntityData();
                        let rows = ' tuples';
                        if (result.affectedTuples === 1) {
                            rows = ' tuple';
                        }
                        this._toast.success('Updated ' + result.affectedTuples + rows, result.query, 'update', ToastDuration.SHORT);
                    } else if (result.error) {
                        if (result.error.includes('PRIMARY KEY')) {
                            this._toast.warn(`Update failed: Duplicate primary key value.`);
                        } else {
                            this._toast.exception(result, 'Update failed:');
                        }
                    }
                }
            },
            error: err => {
                this._toast.error('Could not update the data.');
                console.log(err);
            }
        }).add(() => this.uploadProgress = -1);
    }


}


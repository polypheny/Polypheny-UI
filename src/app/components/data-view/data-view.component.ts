import {Component, effect, EventEmitter, Input, OnDestroy, Output, signal, TemplateRef, ViewChild, WritableSignal} from '@angular/core';
import {DataPresentationType, DocumentResult, FieldDefinition, GraphResult, QueryLanguage, RelationalResult, Result, ResultException, UiColumnDefinition} from './models/result-set.model';
import {TableConfig} from './data-table/table-config';
import {CrudService} from '../../services/crud.service';
import {ToastDuration, ToasterService} from '../toast-exposer/toaster.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../services/dbms-types.service';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {DeleteRequest, NamespaceType, QueryRequest, TableRequest} from '../../models/ui-request.model';
import {PaginationElement} from './models/pagination-element.model';
import {SortState} from './models/sort-state.model';
import * as Plyr from 'plyr';
import {BehaviorSubject, Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';
import {HttpEventType} from '@angular/common/http';
import * as $ from 'jquery';
import {Table} from '../../views/schema-editing/edit-tables/edit-tables.component';
import {LeftSidebarService} from '../left-sidebar/left-sidebar.service';
import {UntypedFormGroup} from '@angular/forms';
import {CatalogService} from '../../services/catalog.service';
import {EntityType, TableModel} from '../../models/catalog.model';
import {AdapterModel} from '../../views/adapters/adapter.model';

export class ViewInformation {
  freshness: string;
  fullQuery: string;
  tableType: string;
  newViewName: string;
  initialQuery: string;
  stores: string;
  interval: number;
  timeUnit: string;


  constructor(tableType: string, newViewName: string) {
    this.tableType = tableType;
    this.newViewName = newViewName;
  }

}


@Component({
  selector: 'app-data-view',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.scss']
})
export class DataViewComponent implements OnDestroy {

  constructor(
      public _crud: CrudService,
      public _toast: ToasterService,
      public _route: ActivatedRoute,
      public _router: Router,
      public _types: DbmsTypesService,
      public _settings: WebuiSettingsService,
      public _sidebar: LeftSidebarService,
      public _catalog: CatalogService,
      public modalService: BsModalService
  ) {
    this.webSocket = new WebSocket(_settings);
    this.initWebsocket();

    effect(() => {
      console.log(this.combinedResult());
    });
  }

  @Input() set result(result: Result<any, any>) {
    if (!result) {
      return;
    }

    switch (result.language) {
      case QueryLanguage.SQL:
        this.combinedResult.set(CombinedResult.fromRelational(<RelationalResult>result));
        this.presentationType = DataPresentationType.TABLE;
        break;
      case QueryLanguage.MQL:
        this.combinedResult.set(CombinedResult.fromDocument(<DocumentResult>result));
        this.presentationType = DataPresentationType.CARD;
        break;
      case QueryLanguage.CYPHER:
        this.combinedResult.set(CombinedResult.fromGraph(<GraphResult>result));
        if (result.header.filter(h => h.dataType === 'GRAPH').length > 0) {
          this.presentationType = DataPresentationType.GRAPH;
        }

        break;
    }

    this.setPagination();
    this.buildInsertObject();
  }
  protected focusId: string;

  @Input() config: TableConfig;
  @Input() entityId?: number;
  @Input() loading?: boolean;
  @ViewChild('createView', {static: false}) public createView: TemplateRef<any>;
  @ViewChild('viewEditor', {static: false}) viewEditor;
  @Output() viewEditorCode = new EventEmitter();
  @Output() executeView = new EventEmitter();
  @Input() exploreId?: number;
  @Input() tutorialMode: boolean;

  combinedResult: WritableSignal<CombinedResult> = signal(null);


  ViewType = ViewType;
  presentationType: DataPresentationType = DataPresentationType.TABLE;
  presentationTypes: typeof DataPresentationType = DataPresentationType;

  pagination: PaginationElement[] = [];
  insertValues = new Map<string, any>();
  insertDirty = new Map<string, boolean>();//check if field has been edited (if yes, it is "dirty")
  updateValues = new Map<string, any>();
  sortStates = new Map<string, SortState>();
  filter = new Map<string, string>();
  /** -1 if not uploading, 0 or 100: striped, else: showing progress */
  uploadProgress = -1;
  downloadProgress = -1;
  downloadingIthRow = -1;
  confirm = -1;
  editing = -1;//-1 if not editing any row, else the index of that row
  player: Plyr;
  webSocket: WebSocket;
  subscriptions = new Subscription();
  resultSetEvent = new EventEmitter<Result<any, any>>();
  modalRefCreateView: BsModalRef;
  viewName = 'viewname';
  query: string;
  exploringShowView = false;
  creatingView = false;
  newViewName = '';
  tables: BehaviorSubject<Table[]> = new BehaviorSubject([]);
  gotTables = false;
  namespaceType: string;
  viewOptions = 'view';
  freshnessSelected = Freshness.INTERVAL;
  timeUniteSelected = TimeUnits.MINUTES;
  intervalSelected = 10;
  stores: AdapterModel[];
  storeOptions: Array<String>;
  storeSelected: string;
  chooseNameForView: UntypedFormGroup;

  showView: ViewType;

  protected readonly NamespaceType = NamespaceType;
  protected readonly Freshness = Freshness;
  protected readonly TimeUnits = TimeUnits;

  removeNull(dataType: string) {
    return dataType.replace(' NOT NULL', '');
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.webSocket.close();
  }

  deactivateGraphButton(resultSet: Result<any, any>) {
    return resultSet.namespaceType === NamespaceType.GRAPH || !this.containsGraphObject(resultSet);
  }

  containsGraphObject(resultSet: Result<any, any>) {
    const includes = resultSet.header.map(d => d.dataType.toLowerCase().includes('graph') || d.dataType.toLowerCase().includes('node'));
    return includes.includes(true);
  }

  documentListener() {
    const self = this;
    $(document).on('click', function (e) {
      if ($(e.target).parents('.editing').length === 0) {
        //don't close editing row during upload
        if (self.uploadProgress < 0) {
          self.editing = -1;
        }
      }
    });
  }

  initWebsocket() {
    const sub = this.webSocket.onMessage().subscribe({
      next: res => {
        this.result = <Result<any, any>>res;

        //go to the highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.result.highestPage) {
          this._router.navigate(['/views/data-table/' + this.entityId + '/' + this.result.highestPage]);
        }
        this.setPagination();
        this.editing = -1;
        if (this.result.namespaceType === NamespaceType.RELATIONAL || this.result.namespaceType === NamespaceType.DOCUMENT) {
          this.config.create = true;
          this.config.update = true;
          this.config.delete = true;
        } else {
          this.config.create = false;
          this.config.update = false;
          this.config.delete = false;
        }
        this.resultSetEvent.emit(this.result);
        // if we had a focus set we render it in the next DOM update
        if (this.focusId != null) {
          setTimeout(_ => {
            const focus = document.getElementById(this.focusId);
            if (focus != null) {
              focus.focus();
            }
            this.focusId = null;
          });
        }

      }, error: err => {
        this._toast.error('Could not load the data.');
        console.log(err);
      }
    });
    this.subscriptions.add(sub);
  }

  mapToObject(map: Map<any, any>) {
    const obj = {};
    map.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }

  getTable() {
    const filterObj = this.mapToObject(this.filter);
    const sortState = {};
    this.result.header.forEach((h) => {
      this.sortStates.set(h.name, h.sort);
      sortState[h.name] = h.sort;
    });
    const request = new TableRequest(this.entityId, this.result.currentPage, filterObj, sortState);
    if (!this._crud.getTable(this.webSocket, request)) {
      this.result = new RelationalResult('Could not establish a connection with the server.');
    }
  }

  deleteRow(values: string[], i) {
    if (this.confirm !== i) {
      this.confirm = i;
      return;
    }
    if (this.result.namespaceType === NamespaceType.DOCUMENT) {
      this.adjustDocument('DELETE', values[0]);
      return;
    }

    const rowMap = new Map<string, string>();
    values.forEach((val, key) => {
      rowMap.set(this.result.header[key].name, val);
    });
    const row = this.mapToObject(rowMap);
    const request = new DeleteRequest(this.combinedResult().entityId, row);
    const emitResult = new EventEmitter<RelationalResult>();
    this._crud.deleteRow(request).subscribe({
      next: (result: RelationalResult) => {
        emitResult.emit(result);
        if (result.error) {
          this._toast.exception(result, 'Could not delete this row:');
        } else {
          this.getTable();
        }
      }, error: err => {
        this._toast.error('Could not delete this row.');
        console.log(err);
        emitResult.emit(new RelationalResult('Could not delete this row.'));
      }
    });
    return emitResult;
  }

  setPagination() {
    if (!this.result) {
      return;
    }
    const activePage = this.result.currentPage;
    const highestPage = this.result.highestPage;
    this.pagination = [];
    if (highestPage < 2) {
      return;
    }
    const neighbors = 1;//from active page, show n neighbors to the left and n neighbors to the right.
    this.pagination.push(new PaginationElement().withPage(this.entityId, Math.max(1, activePage - 1)).withLabel('<'));
    if (activePage === 1) {
      this.pagination.push(new PaginationElement().withPage(this.entityId, 1).setActive());
    } else {
      this.pagination.push(new PaginationElement().withPage(this.entityId, 1));
    }
    if (activePage - neighbors > 2) {
      this.pagination.push(new PaginationElement().withLabel('..').setDisabled());

    }
    let counter = Math.max(2, activePage - neighbors);
    while (counter <= activePage + neighbors && counter <= highestPage) {
      if (counter === activePage) {
        this.pagination.push(new PaginationElement().withPage(this.entityId, counter).setActive());
      } else {
        this.pagination.push(new PaginationElement().withPage(this.entityId, counter));
      }
      counter++;
    }
    counter--;
    if (counter < highestPage) {
      if (counter + neighbors < highestPage) {
        this.pagination.push(new PaginationElement().withLabel('..').setDisabled());
      }
      this.pagination.push(new PaginationElement().withPage(this.entityId, highestPage));
    }
    this.pagination.push(new PaginationElement().withPage(this.entityId, Math.min(highestPage, activePage + 1)).withLabel('>'));

    return this.pagination;
  }

  paginate(p: PaginationElement) {
    this.result.currentPage = p.page;
    this.getTable();
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
    if (this.config.update) {
      this.updateValues.clear();
      this.result.data[i].forEach((v, k) => {
        if (this.result.header[k].dataType === 'bool') {
          this.updateValues.set(this.result.header[k].name, this.getBoolean(v));
        }
            //assign multimedia types: null if the item is NULL, else undefined
        //null items will be submitted and updated, undefined items will not be part of the UPDATE statement
        else if (this._types.isMultimedia(this.result.header[k].dataType)) {
          if (v === null) {
            this.updateValues.set(this.result.header[k].name, null);
          } else {
            this.updateValues.set(this.result.header[k].name, undefined);
          }
        } else {
          this.updateValues.set(this.result.header[k].name, v);
        }
      });
      this.editing = i;
    }
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

  insertRow() {
    if (this.result.namespaceType === NamespaceType.DOCUMENT) {
      this.adjustDocument('ADD');
      return;
    }
    const formData = new FormData();
    this.insertValues.forEach((v, k) => {
      //only values with dirty state will be submitted. Columns that are not nullable are already set dirty
      if (this.insertDirty.get(k) === true) {
        let value;
        if (isNaN(v)) {
          value = v;
        } else {
          value = String(v);
        }
        formData.append(k, value);
      }
    });
    formData.append('tableId', String(this.combinedResult().entityName));
    this.uploadProgress = 100;//show striped progressbar
    const emitResult = new EventEmitter<RelationalResult>();
    this._crud.insertRow(formData).subscribe({
      next: res => {
        if (res.type && res.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * res.loaded / res.total);
        } else if (res.type === HttpEventType.Response) {
          this.uploadProgress = -1;
          const result = <RelationalResult>res.body;
          emitResult.emit(result);
          if (result.error) {
            this._toast.exception(result, 'Could not insert the data', 'insert error');
          } else if (result.affectedRows === 1) {
            $('.insert-input').val('');
            this.insertValues.clear();
            this.buildInsertObject();
            this.getTable();
          }
        }
      },
      error: err => {
        this._toast.error('Could not insert the data.');
        console.log(err);
        emitResult.emit(new RelationalResult('Could not insert the data.'));
      }
    }).add(() => this.uploadProgress = -1);
    return emitResult;
  }

  private adjustDocument(method: 'ADD' | 'MODIFY' | 'DELETE', initialData: string = '') {
    const entity = this._catalog.getEntity(this.entityId);
    switch (method) {
      case 'ADD':
        const data = this.insertValues.get('d');
        const add = `db.${entity.value.name}.insert(${data})`;
        this._crud.anyQuery(this.webSocket, new QueryRequest(add, false, true, 'mql', this.result.namespaceId));
        this.insertValues.clear();
        this.getTable();
        break;
      case 'MODIFY':
        const values = new Map<string, string>();//previous values
        for (let i = 0; i < this.result.header.length; i++) {
          values.set(this.result.header[i].name, this.result.data[this.editing][i]);
          i++;
        }
        const updated = this.updateValues.get('d');
        const parsed = JSON.parse(updated);
        if (parsed.hasOwnProperty('_id')) {
          const modify = `db.${entity.value.name}.updateMany({"_id": "${parsed['_id']}"}, {"$set": ${updated}})`;
          this._crud.anyQuery(this.webSocket, new QueryRequest(modify, false, true, 'mql', this.result.namespaceId));
          this.insertValues.clear();
          this.getTable();
        }
        break;
      case 'DELETE':
        const parsedDelete = JSON.parse(initialData);
        if (parsedDelete.hasOwnProperty('_id')) {
          const modify = `db.${entity.value.name}.deleteMany({"_id": "${parsedDelete['_id']}" })`;
          this._crud.anyQuery(this.webSocket, new QueryRequest(modify, false, true, 'mql', this.result.namespaceId));
          this.insertValues.clear();
          this.getTable();
        }
        break;
    }
  }

  buildInsertObject() {
    if (this.config && !this.config.create || !this.result) {
      return;
    }
    this.insertValues.clear();
    this.insertDirty.clear();
    if (this.result.header) {
      this.result.header.forEach((g, idx) => {
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
        } else {
          if (this._types.isNumeric((g.dataType))) {
            this.insertValues.set(g.name, 0);
          } else if (this._types.isBoolean(g.dataType)) {
            this.insertValues.set(g.name, false);
          } else {
            this.insertValues.set(g.name, '');
          }
        }
      });
    }
  }


  newUpdateValue(key, val) {
    this.updateValues.set(key, val);
  }

  updateRow() {
    if (this.result.namespaceType === NamespaceType.DOCUMENT) {
      this.adjustDocument('MODIFY');
      return;
    }

    const oldValues = new Map<string, string>();//previous values
    for (let i = 0; i < this.result.header.length; i++) {
      oldValues.set(this.result.header[i].name, this.result.data[this.editing][i]);
      i++;
    }
    const formData = new FormData();
    formData.append('tableId', this.combinedResult().entityName);
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
    this._crud.updateRow(formData).subscribe({
      next: res => {
        if (res.type && res.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * res.loaded / res.total);
        } else if (res.type === HttpEventType.Response) {
          this.uploadProgress = -1;
          const result = <RelationalResult>res.body;
          if (result.affectedRows) {
            this.getTable();
            let rows = ' rows';
            if (result.affectedRows === 1) {
              rows = ' row';
            }
            this._toast.success('Updated ' + result.affectedRows + rows, result.query, 'update', ToastDuration.SHORT);
          } else if (result.error) {
            this._toast.exception(result, 'Could not update this row');
          }
        }
      },
      error: err => {
        this._toast.error('Could not update the data.');
        console.log(err);
      }
    }).add(() => this.uploadProgress = -1);
  }

  openCreateView(createView: TemplateRef<any>, sqlQuery: string) {
    this.getStores();
    this.showView = null;
    this.viewOptions = 'view';
    this.getAllTables();
    this.modalRefCreateView = this.modalService.show(createView);
    this.query = sqlQuery;

  }


  createViewCode(isView: boolean, doExecute: boolean) {
    if (this.checkIfPossible()) {
      const info = new ViewInformation(isView ? 'MATERIALIZED' : 'VIEW', this.newViewName);
      info.initialQuery = this.query;
      let fullQuery;

      if (!isView) {
        if (this.result.namespaceType === NamespaceType.DOCUMENT) {
          this._toast.error('Materialized views are not jet supported for document queries.');
          return;
        }

        fullQuery = this.getMaterializedViewQuery(info);
        info.tableType = 'MATERIALIZED';

      } else {
        fullQuery = this.getViewQuery();
        info.tableType = 'VIEW';

      }

      info.fullQuery = fullQuery;

      if (doExecute) {
        this.executeView.emit(info);
      } else {
        this.viewEditorCode.emit(info);
      }

      this.modalRefCreateView.hide();
      this.gotTables = false;

    }
  }


  private getViewQuery() {
    if (this.result.namespaceType.toLowerCase() === 'document') {
      let source;
      let pipeline;

      const temp = this.query.trim().split('.');
      if (temp[0] === 'db') {
        temp.shift(); // remove db
      }
      source = temp[0];
      if (temp[0].includes('getCollection(')) {
        source = source
        .replace('getCollection(', '')
        .replace(')', '');
      }
      temp.shift(); // remove collection
      temp[0] = temp[0].replace('aggregate(', '').replace('find(', '');
      temp[temp.length - 1] = temp[temp.length - 1].slice(0, -1); // remove last bracket

      if (this.query.includes('.aggregate(')) {

        pipeline = temp.join('.');
      } else if (this.query.includes('.find(')) {
        const json = JSON.parse('[' + temp.join('.') + ']');

        pipeline = '[';
        if (json.length > 0) {
          pipeline += `{ "$match": ${JSON.stringify(json[0])} }`;
        }
        if (json.length > 1) {
          pipeline += `, { "$project": ${JSON.stringify(json[1])} }`;
        }
        pipeline += ']';
      } else {
        this._toast.error('This query cannot be used to create a view.');
        return;
      }

      return `db.createView(\n\t"${this.newViewName}",\n\t"${source.replace('"', '')}",\n\t${pipeline}\n)`;
    } else {
      if (this.query.startsWith('\n')) {
        this.query = this.query.replace('\n', '');
      }
      return `CREATE VIEW ${this.newViewName} AS\n${this.query} `;
    }
  }

  private getMaterializedViewQuery(info: ViewInformation) {
    if (this.query.startsWith('\n')) {
      this.query = this.query.replace('\n', '');
    }
    let query = `CREATE MATERIALIZED VIEW ${this.newViewName} AS\n${this.query}\nON STORE ${this.storeSelected}\nFRESHNESS ${this.freshnessSelected}`;


    info.stores = this.storeSelected;
    info.freshness = this.freshnessSelected;

    if (this.freshnessSelected === 'UPDATE') {
      query += ` ${this.intervalSelected}`;
      info.interval = this.intervalSelected;

    } else if (this.freshnessSelected === 'INTERVAL') {
      query += ` ${this.intervalSelected} ${this.timeUniteSelected}`;
      info.interval = this.intervalSelected;
      info.timeUnit = this.timeUniteSelected;

    }
    return query;
  }

  checkIfPossible() {
    if (this.newViewName === '') {
      this._toast.warn('Please provide a name for the new view. The new view was not created.', 'missing view name', ToastDuration.INFINITE);
      return false;
    }
    if (!this._crud.nameIsValid(this.newViewName)) {
      this._toast.warn('Please provide a valid name for the new view. The new view was not created.', 'invalid view name', ToastDuration.INFINITE);
      return false;
    }
    if (this.tables.value.filter((t) => t.name === this.newViewName).length > 0) {
      this._toast.warn('A table or view with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
      return false;
    }
    return true;
  }

  createTableValidation(name: string) {
    const regex = this._crud.getValidationRegex();
    if (name === '') {
      return '';
    } else if (regex.test(name) && name.length <= 100 && this.tables.value.filter((t) => t.name === name).length === 0) {
      this.creatingView = true;
      return 'is-valid';
    } else {
      this.creatingView = false;
      return 'is-invalid';
    }
  }

  getAllTables() {
    //not possible to use public.table therefore schema always null

    this._catalog.getEntities(null).subscribe(entities => {
      this.tables.next(entities.filter(e => e.namespaceType === NamespaceType.RELATIONAL)
      .map(n => Table.fromModel(<TableModel>n))
      .sort((a, b) => a.name.localeCompare(b.name)));
    });


    /*if (!this.gotTables) {
        this._crud.getTables(new EditTableRequest(null)).subscribe(
            res => {
                const result = <DbTable[]>res;
                this.tables = [];
                for (const t of result) {
                    this.tables.push(new Table(t));
                }
                this.tables = this.tables.sort((a, b) => a.name.localeCompare(b.name));
            }, err => {
                this._toast.error('could not retrieve list of tables');
                console.log(err);
            }
        );
        this.gotTables = true;
    }*/
  }

  getStores() {
    this._crud.getStores().subscribe({
      next: (res: AdapterModel[]) => {
        this.stores = res;
        this.storeOptions = this.stores.map(s => s.name);
        this.storeSelected = this.stores[0]['uniqueName'];

      }, error: err => {
        console.log(err);
      }
    });
  }


  executeCreateView(code: string) {
    this.loading = true;
    if (!this._crud.anyQuery(this.webSocket, new QueryRequest(code, false, true, 'sql', null))) {
      this.loading = false;
      this.result = new RelationalResult('Could not establish a connection with the server.');
    }
  }

  addItem(eShowView) {
    this.exploringShowView = eShowView;
  }

  isDMLResult() {
    return this.combinedResult()
        && this.combinedResult().affectedTuples === 1
        && this.combinedResult().header[0].dataType === 'BIGINT'
        && this.combinedResult().header[0].name === 'ROWCOUNT';
  }

  checkModelAndLanguage() {
    return (this.combinedResult().namespaceType === NamespaceType.DOCUMENT && this.combinedResult().language === QueryLanguage.MQL) ||
        (this.combinedResult().namespaceType === NamespaceType.RELATIONAL && this.combinedResult().language === QueryLanguage.SQL);
  }

  showCreateView() {
    return !this.config.hideCreateView
        && this.combinedResult().data
        && !(this._router.url.startsWith('/views/data-table/'))
        && !this.isDMLResult()
        && this.combinedResult().language !== QueryLanguage.CQL
        && this.checkModelAndLanguage();
  }
}

export enum Freshness {
  UPDATE = 'UPDATE',
  INTERVAL = 'INTERVAL',
  MANUAL = 'MANUAL'
}

export enum TimeUnits {
  MILLISECONDS = 'milliseconds',
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days'
}

export enum ViewType {
  VIEW = 'VIEW',
  MATERIALIZED = 'MATERIALIZED'
}

export class CombinedResult {
  namespaceType: NamespaceType;
  namespaceId: number;
  query: string;
  data: string[][];
  header: FieldDefinition[] | UiColumnDefinition[];
  exception: ResultException;
  error: string;
  language: QueryLanguage;
  hasMore: boolean;
  currentPage: number;
  highestPage: number;
  entityName: string;
  entityId: number;
  entites: string[];
  affectedTuples: number;
  type: EntityType;//"table" or "view"

  static fromRelational(relational: RelationalResult): CombinedResult {
    const res = new CombinedResult();
    res.header = relational.header;
    res.data = relational.data;
    res.namespaceId = relational.namespaceId;
    res.namespaceType = relational.namespaceType;
    res.currentPage = relational.currentPage;
    res.highestPage = relational.highestPage;
    res.type = relational.type;
    res.error = relational.error;
    res.hasMore = relational.hasMore;
    res.entityId = relational.tableId;
    res.entityName = relational.table;
    res.affectedTuples = relational.affectedRows;
    res.language = relational.language;

    console.log(res);
    return res;
  }

  static fromDocument(doc: DocumentResult): CombinedResult {
    const res = new CombinedResult();
    res.header = doc.header;
    res.data = doc.data.map( t => [t]);
    res.namespaceId = doc.namespaceId;
    res.namespaceType = doc.namespaceType;
    res.currentPage = doc.currentPage;
    res.highestPage = doc.highestPage;
    res.error = doc.error;
    res.hasMore = doc.hasMore;
    res.language = doc.language;
    return res;
  }

  static fromGraph(graph: GraphResult): CombinedResult {
    const res = new CombinedResult();
    res.header = graph.header;
    res.data = graph.data;
    res.namespaceId = graph.namespaceId;
    res.namespaceType = graph.namespaceType;
    res.currentPage = graph.currentPage;
    res.highestPage = graph.highestPage;
    res.error = graph.error;
    res.hasMore = graph.hasMore;
    res.language = graph.language;
    return res;
  }
}

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {DataPresentationType, RelationalResult} from './models/result-set.model';
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
import {TableModel} from '../../models/catalog.model';
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

enum ViewType {
  VIEW = 'VIEW',
  MATERIALIZED = 'MATERIALIZED'
}

@Component({
  selector: 'app-data-view',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.scss']
})
export class DataViewComponent implements OnInit, OnDestroy, OnChanges {
  protected focusId: string;


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

  }

  @Input() resultSet: RelationalResult;
  @Input() config: TableConfig;
  @Input() tableId?: number;
  @Input() loading?: boolean;
  @ViewChild('createView', {static: false}) public createView: TemplateRef<any>;
  @ViewChild('viewEditor', {static: false}) viewEditor;
  @Output() viewEditorCode = new EventEmitter();
  @Output() executeView = new EventEmitter();
  @Input() exploreId?: number;
  @Input() tutorialMode: boolean;


  ViewType = ViewType;
  presentationType: DataPresentationType = DataPresentationType.TABLE;
  //see https://stackoverflow.com/questions/35835984/how-to-use-a-typescript-enum-value-in-an-angular2-ngswitch-statement
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
  resultSetEvent = new EventEmitter<RelationalResult>();
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
  freshnessOptions: Array<string> = [
    'UPDATE', 'INTERVAL', 'MANUAL'
  ];
  freshnessSelected = 'INTERVAL';
  timeUnites: Array<string> = [
    'milliseconds', 'seconds', 'minutes', 'hours', 'days'
  ];
  timeUniteSelected = 'minutes';
  intervalSelected = 10;
  stores: AdapterModel[];
  storeOptions: Array<String>;
  storeSelected: string;
  chooseNameForView: UntypedFormGroup;

  // see https://stackoverflow.com/questions/52017809/how-to-convert-string-to-boolean-in-typescript-angular-4
  showView: ViewType;

  removeNull(dataType: string) {
    return dataType.replace(' NOT NULL', '');
  }

  ngOnInit(): void {
    //ngOnInit is overwritten by subclasses
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.webSocket.close();
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes.hasOwnProperty('resultSet')) {
      console.log(this.resultSet);
      //fix for carousel View, if no currentPage and no highestPage is set, set it to 1
      if (this.resultSet !== null) {
        this.namespaceType = this.resultSet.namespaceType;
        if (this.namespaceType === NamespaceType.DOCUMENT) {
          this.presentationType = DataPresentationType.CARD;
        } else if (this.namespaceType === NamespaceType.GRAPH && this.containsGraphObject(this.resultSet)) {
          this.presentationType = DataPresentationType.GRAPH;
        } else {
          this.presentationType = DataPresentationType.TABLE;
        }


        if (this.resultSet.currentPage === 0) {
          this.resultSet.currentPage = 1;
        }
        if (this.resultSet.highestPage === 0) {
          this.resultSet.highestPage = 1;
        }
      }
      this.setPagination();
      this.buildInsertObject();
    }
  }

  deactivateGraphButton(resultSet: RelationalResult) {
    return resultSet.namespaceType === NamespaceType.GRAPH || !this.containsGraphObject(resultSet);
  }

  containsGraphObject(resultSet: RelationalResult) {
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
        this.resultSet = <RelationalResult>res;

        //go to the highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.resultSet.highestPage) {
          this._router.navigate(['/views/data-table/' + this.tableId + '/' + this.resultSet.highestPage]);
        }
        this.setPagination();
        this.editing = -1;
        if (this.resultSet.type === 'TABLE' || this.resultSet.namespaceType === NamespaceType.DOCUMENT) {
          this.config.create = true;
          this.config.update = true;
          this.config.delete = true;
        } else {
          this.config.create = false;
          this.config.update = false;
          this.config.delete = false;
        }
        this.resultSetEvent.emit(this.resultSet);
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
    this.resultSet.header.forEach((h) => {
      this.sortStates.set(h.name, h.sort);
      sortState[h.name] = h.sort;
    });
    const request = new TableRequest(this.tableId, this.resultSet.currentPage, filterObj, sortState);
    if (!this._crud.getTable(this.webSocket, request)) {
      this.resultSet = new RelationalResult('Could not establish a connection with the server.');
    }
  }

  deleteRow(values: string[], i) {
    if (this.confirm !== i) {
      this.confirm = i;
      return;
    }
    if (this.resultSet.namespaceType.toLowerCase() === 'document') {
      this.adjustDocument('DELETE', values[0]);
      return;
    }

    const rowMap = new Map<string, string>();
    values.forEach((val, key) => {
      rowMap.set(this.resultSet.header[key].name, val);
    });
    const row = this.mapToObject(rowMap);
    const request = new DeleteRequest(this.resultSet.tableId, row);
    const emitResult = new EventEmitter<RelationalResult>();
    this._crud.deleteRow(request).subscribe({
      next: res => {
        const result = <RelationalResult>res;
        emitResult.emit(result);
        if (result.error) {
          const result2 = <RelationalResult>res;
          this._toast.exception(result2, 'Could not delete this row:');
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
    if (!this.resultSet) {
      return;
    }
    const activePage = this.resultSet.currentPage;
    const highestPage = this.resultSet.highestPage;
    this.pagination = [];
    if (highestPage < 2) {
      return;
    }
    const neighbors = 1;//from active page, show n neighbors to the left and n neighbors to the right.
    this.pagination.push(new PaginationElement().withPage(this.tableId, Math.max(1, activePage - 1)).withLabel('<'));
    if (activePage === 1) {
      this.pagination.push(new PaginationElement().withPage(this.tableId, 1).setActive());
    } else {
      this.pagination.push(new PaginationElement().withPage(this.tableId, 1));
    }
    if (activePage - neighbors > 2) {
      this.pagination.push(new PaginationElement().withLabel('..').setDisabled());

    }
    let counter = Math.max(2, activePage - neighbors);
    while (counter <= activePage + neighbors && counter <= highestPage) {
      if (counter === activePage) {
        this.pagination.push(new PaginationElement().withPage(this.tableId, counter).setActive());
      } else {
        this.pagination.push(new PaginationElement().withPage(this.tableId, counter));
      }
      counter++;
    }
    counter--;
    if (counter < highestPage) {
      if (counter + neighbors < highestPage) {
        this.pagination.push(new PaginationElement().withLabel('..').setDisabled());
      }
      this.pagination.push(new PaginationElement().withPage(this.tableId, highestPage));
    }
    this.pagination.push(new PaginationElement().withPage(this.tableId, Math.min(highestPage, activePage + 1)).withLabel('>'));

    return this.pagination;
  }

  paginate(p: PaginationElement) {
    this.resultSet.currentPage = p.page;
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
    this._crud.getFile(data).subscribe(
        res => {
          if (res.type && res.type === HttpEventType.DownloadProgress) {
            this.downloadProgress = Math.round(100 * res.loaded / res.total);
          } else if (res.type === HttpEventType.Response) {
            //see https://stackoverflow.com/questions/51960172/
            const url = window.URL.createObjectURL(<any>res.body);
            window.open(url);
          }
        }, err => {
          console.log(err);
        }
    ).add(() => {
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
      this.resultSet.data[i].forEach((v, k) => {
        if (this.resultSet.header[k].dataType === 'bool') {
          this.updateValues.set(this.resultSet.header[k].name, this.getBoolean(v));
        }
            //assign multimedia types: null if the item is NULL, else undefined
        //null items will be submitted and updated, undefined items will not be part of the UPDATE statement
        else if (this._types.isMultimedia(this.resultSet.header[k].dataType)) {
          if (v === null) {
            this.updateValues.set(this.resultSet.header[k].name, null);
          } else {
            this.updateValues.set(this.resultSet.header[k].name, undefined);
          }
        } else {
          this.updateValues.set(this.resultSet.header[k].name, v);
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
    if (this.resultSet.namespaceType.toLowerCase() === 'document') {
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
    formData.append('tableId', String(this.resultSet.table));
    this.uploadProgress = 100;//show striped progressbar
    const emitResult = new EventEmitter<RelationalResult>();
    this._crud.insertRow(formData).subscribe(
        res => {
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
        }, err => {
          this._toast.error('Could not insert the data.');
          console.log(err);
          emitResult.emit(new RelationalResult('Could not insert the data.'));
        }
    ).add(() => this.uploadProgress = -1);
    return emitResult;
  }

  private adjustDocument(method: 'ADD' | 'MODIFY' | 'DELETE', initialData: string = '') {
    const entity = this._catalog.getEntity(this.tableId);
    switch (method) {
      case 'ADD':
        const data = this.insertValues.get('d');
        const add = `db.${entity.value.name}.insert(${data})`;
        this._crud.anyQuery(this.webSocket, new QueryRequest(add, false, true, 'mql', this.resultSet.namespaceId));
        this.insertValues.clear();
        this.getTable();
        break;
      case 'MODIFY':
        const values = new Map<string, string>();//previous values
        for (let i = 0; i < this.resultSet.header.length; i++) {
          values.set(this.resultSet.header[i].name, this.resultSet.data[this.editing][i]);
          i++;
        }
        const updated = this.updateValues.get('d');
        const parsed = JSON.parse(updated);
        if (parsed.hasOwnProperty('_id')) {
          const modify = `db.${entity.value.name}.updateMany({"_id": "${parsed['_id']}"}, {"$set": ${updated}})`;
          this._crud.anyQuery(this.webSocket, new QueryRequest(modify, false, true, 'mql', this.resultSet.namespaceId));
          this.insertValues.clear();
          this.getTable();
        }
        break;
      case 'DELETE':
        const parsedDelete = JSON.parse(initialData);
        if (parsedDelete.hasOwnProperty('_id')) {
          const modify = `db.${entity.value.name}.deleteMany({"_id": "${parsedDelete['_id']}" })`;
          this._crud.anyQuery(this.webSocket, new QueryRequest(modify, false, true, 'mql', this.resultSet.namespaceId));
          this.insertValues.clear();
          this.getTable();
        }
        break;
    }
  }

  buildInsertObject() {
    if (this.config && !this.config.create || !this.resultSet) {
      return;
    }
    this.insertValues.clear();
    this.insertDirty.clear();
    if (this.resultSet.header) {
      this.resultSet.header.forEach((g, idx) => {
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
    if (this.resultSet.namespaceType.toLowerCase() === 'document') {
      this.adjustDocument('MODIFY');
      return;
    }

    const oldValues = new Map<string, string>();//previous values
    /*$('.editing').each(function (e) {
      const oldVal = $(this).attr('data-before');
      const col = $(this).attr('data-col');
      if (col !== undefined) {
        oldValues.set(col, oldVal);
      }
    });*/
    for (let i = 0; i < this.resultSet.header.length; i++) {
      oldValues.set(this.resultSet.header[i].name, this.resultSet.data[this.editing][i]);
      i++;
    }
    const formData = new FormData();
    formData.append('tableId', this.resultSet.table);
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
    this._crud.updateRow(formData).subscribe(
        res => {
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
        }, err => {
          this._toast.error('Could not update the data.');
          console.log(err);
        }
    ).add(() => this.uploadProgress = -1);
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
        if (this.resultSet.namespaceType.toLowerCase() === 'document') {
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
    if (this.resultSet.namespaceType.toLowerCase() === 'document') {
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
      this.resultSet = new RelationalResult('Could not establish a connection with the server.');
    }
  }

  addItem(eShowView) {
    this.exploringShowView = eShowView;
  }

  isDMLResult() {
    return this.resultSet
        && this.resultSet.affectedRows === 1
        && this.resultSet.header[0].dataType === 'BIGINT'
        && this.resultSet.header[0].name === 'ROWCOUNT';
  }

  checkModelAndLanguage() {
    return (this.resultSet.namespaceType.toLowerCase() === 'document' && this.resultSet.language.toLowerCase() === 'mql') ||
        (this.resultSet.namespaceType.toLowerCase() === 'relational' && this.resultSet.language.toLowerCase() === 'sql');
  }

  showCreateView() {
    return !this.config.hideCreateView
            && this.resultSet.data
        && !(this._router.url.startsWith('/views/data-table/'))
        && !this.isDMLResult()
        && this.resultSet.language !== 'cql'
        && this.checkModelAndLanguage();
  }


  private getCollection() {
    //const split = this.tableId.split('.');
    //return split[split.length - 1];
  }
}


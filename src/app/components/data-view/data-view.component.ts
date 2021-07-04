import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, TemplateRef, ViewChild} from '@angular/core';
import {DataPresentationType, ResultSet} from './models/result-set.model';
import {TableConfig} from './data-table/table-config';
import {CrudService} from '../../services/crud.service';
import {ToastDuration, ToastService} from '../toast/toast.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../services/dbms-types.service';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {DeleteRequest, EditTableRequest, QueryRequest, TableRequest} from '../../models/ui-request.model';
import {PaginationElement} from './models/pagination-element.model';
import {SortState} from './models/sort-state.model';
import * as Plyr from 'plyr';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';
import {HttpEventType} from '@angular/common/http';
import * as $ from 'jquery';
import {DbTable} from '../../views/uml/uml.model';
import {TableModel} from '../../views/schema-editing/edit-tables/edit-tables.component';

@Component({
  selector: 'app-data-view',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.scss']
})
export class DataViewComponent implements OnInit, OnDestroy, OnChanges {

  @Input() resultSet: ResultSet;
  @Input() config: TableConfig;
  @Input() tableId?: string;
  @Input() loading?: boolean;
  @ViewChild('createView', {static: false}) public createView: TemplateRef<any>;
  @ViewChild('viewEditor', {static: false}) viewEditor;
  @Output() viewEditorCode = new EventEmitter();
  @Output() executeView = new EventEmitter();
  @Input() exploreId?: number;
  @Input() tutorialMode: boolean;

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
  resultSetEvent = new EventEmitter<ResultSet>();
  modalRefCreateView: BsModalRef;
  viewName = 'viewname';
  sqlQuery: string;
  exploringShowView = false;
  creatingView = false;
  newViewName = '';
  tables: TableModel[] = [];
  gotTables = false;

  constructor(
      public _crud: CrudService,
      public _toast: ToastService,
      public _route: ActivatedRoute,
      public _router: Router,
      public _types: DbmsTypesService,
      public _settings: WebuiSettingsService,
      public modalService: BsModalService
  ) {
    this.webSocket = new WebSocket(_settings);
    this.initWebsocket();
  }

  ngOnInit(): void {
    //ngOnInit is overwritten by subclasses
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.webSocket.close();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resultSet']) {

      //fix for carousel View, if no currentPage and no highestPage is set, set it to 1
      if(this.resultSet !== null){
        if(this.resultSet.currentPage === 0 ){
          this.resultSet.currentPage = 1;
        }
        if(this.resultSet.highestPage === 0){
          this.resultSet.highestPage = 1;
        }
      }
      this.setPagination();
      this.buildInsertObject();
    }
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
    const sub = this.webSocket.onMessage().subscribe(
        res => {
          this.resultSet = <ResultSet>res;
          /**const result = <ResultSet>res;
           this.resultSet.data = result.data;
           this.resultSet.highestPage = result.highestPage;
           this.resultSet.error = result.error;
           this.resultSet.type = result.type;
           this.tableId = result.table;
           */

          //go to highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
          if (+this._route.snapshot.paramMap.get('page') > this.resultSet.highestPage) {
            this._router.navigate(['/views/data-table/' + this.tableId + '/' + this.resultSet.highestPage]);
          }
          this.setPagination();
          this.editing = -1;
          if (this.resultSet.type === 'TABLE') {
            this.config.create = true;
            this.config.update = true;
            this.config.delete = true;
          } else {
            this.config.create = false;
            this.config.update = false;
            this.config.delete = false;
          }
          this.resultSetEvent.emit(this.resultSet);
        }, err => {
          this._toast.error('Could not load the data.');
          console.log(err);
        }
    );
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
      this.resultSet = new ResultSet('Could not establish a connection with the server.');
    }
  }

  deleteRow(values: string[], i) {
    if (this.confirm !== i) {
      this.confirm = i;
      return;
    }
    const rowMap = new Map<string, string>();
    values.forEach((val, key) => {
      rowMap.set(this.resultSet.header[key].name, val);
    });
    const row = this.mapToObject(rowMap);
    const request = new DeleteRequest(this.resultSet.table, row);
    const emitResult = new EventEmitter<ResultSet>();
    this._crud.deleteRow(request).subscribe(
        res => {
          const result = <ResultSet>res;
          emitResult.emit(result);
          if (result.error) {
            const result2 = <ResultSet>res;
            this._toast.exception(result2, 'Could not delete this row:');
          } else {
            this.getTable();
          }
        }, err => {
          this._toast.error('Could not delete this row.');
          console.log(err);
          emitResult.emit(new ResultSet('Could not delete this row.'));
        }
    );
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
   * In the card and carousel view, show mm data first (only image, video and sound columns)
   */
  showFirst(dataType: string) {
    switch (dataType) {
      case 'IMAGE':
      case 'VIDEO':
      case 'SOUND':
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
            const url = window.URL.createObjectURL(res.body);
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

  // see https://stackoverflow.com/questions/52017809/how-to-convert-string-to-boolean-in-typescript-angular-4
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
    const emitResult = new EventEmitter<ResultSet>();
    this._crud.insertRow(formData).subscribe(
        res => {
          if (res.type && res.type === HttpEventType.UploadProgress) {
            this.uploadProgress = Math.round(100 * res.loaded / res.total);
          } else if (res.type === HttpEventType.Response) {
            this.uploadProgress = -1;
            const result = <ResultSet>res.body;
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
          emitResult.emit(new ResultSet('Could not insert the data.'));
        }
    ).add(() => this.uploadProgress = -1);
    return emitResult;
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
            const result = <ResultSet>res.body;
            if (result.affectedRows) {
              this.getTable();
              let rows = ' rows';
              if (result.affectedRows === 1) {
                rows = ' row';
              }
              this._toast.success('Updated ' + result.affectedRows + rows, result.generatedQuery, 'update', ToastDuration.SHORT);
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
    this.getAllTables();
    this.modalRefCreateView = this.modalService.show(createView);
    this.sqlQuery = '\n' + sqlQuery;
  }

  createViewCode() {
    if(this.checkIfPossible()){
      const viewData = ['CREATE VIEW', this.newViewName, 'AS \n'];
      this.viewEditorCode.emit(viewData);
      this.modalRefCreateView.hide();
      this.gotTables = false;
    }
  }

  submitCreateView() {
    if(this.checkIfPossible()){
      const viewData = ['CREATE VIEW', this.newViewName, 'AS', this.sqlQuery];
      this.executeView.emit(viewData);
      this.modalRefCreateView.hide();
      this.gotTables = false;
    }
  }

  checkIfPossible(){
    if (this.newViewName === '') {
      this._toast.warn('Please provide a name for the new view. The new view was not created.', 'missing view name', ToastDuration.INFINITE);
      return false;
    }
    if (!this._crud.nameIsValid(this.newViewName)) {
      this._toast.warn('Please provide a valid name for the new view. The new view was not created.', 'invalid view name', ToastDuration.INFINITE);
      return false;
    }
    if (this.tables.filter((t) => t.name === this.newViewName).length > 0) {
      this._toast.warn('A table or view with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
      return false;
    }
    return true;
  }

  createTableValidation(name: string) {
    const regex = this._crud.getValidationRegex();
    if (name === '') {
      return '';
    } else if (regex.test(name) && name.length <= 100 && this.tables.filter((t) => t.name === name).length === 0) {
      this.creatingView = true;
      return 'is-valid';
    } else {
      this.creatingView = false;
      return 'is-invalid';
    }
  }

  getAllTables() {
    //not possible to use public.table therefore schema always null
    if(!this.gotTables) {
      this._crud.getTables(new EditTableRequest(null)).subscribe(
          res => {
            const result = <DbTable[]>res;
            this.tables = [];
            for (const t of result) {
              this.tables.push(new TableModel(t));
            }
            this.tables = this.tables.sort((a, b) => a.name.localeCompare(b.name));
          }, err => {
            this._toast.error('could not retrieve list of tables');
            console.log(err);
          }
      );
      this.gotTables = true;
    }
  }

  executeCreateView(code: string){
    this.loading = true;
    if(!this._crud.anyQuery(this.webSocket, new QueryRequest(code, true))){
      this.loading = false;
      this.resultSet = new ResultSet('Could not establish a connection with the server.', code);
    }
  }

  addItem(eShowView) {
    this.exploringShowView = eShowView;
  }

}


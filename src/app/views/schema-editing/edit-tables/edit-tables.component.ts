import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {EditTableRequest, SchemaRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import {DbColumn, PolyType, ResultSet, Status} from '../../../components/data-table/models/result-set.model';
import {ToastDuration, ToastService} from '../../../components/toast/toast.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {HubService} from '../../../services/hub.service';
import {Store} from '../../stores/store.model';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {Subscription} from 'rxjs';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-edit-tables',
  templateUrl: './edit-tables.component.html',
  styleUrls: ['./edit-tables.component.scss']
})
export class EditTablesComponent implements OnInit, OnDestroy {

  types: PolyType[] = [];
  schema: string;
  tables = [];
  truncate = [];
  drop = [];

  counter = 0;
  newColumns = new Map<number, DbColumn>();
  newTableName = '';
  stores: Store[];
  selectedStore;

  //export table
  showExportButton = false;
  exportProgress = 0.0;
  uploading = false;
  private subscriptions = new Subscription();
  exportForm = new FormGroup({
    name: new FormControl('', Validators.required),
    pub: new FormControl(true, Validators.required),
    createPrimaryKeys: new FormControl(true, Validators.required),
    addDefaultValue: new FormControl(true, Validators.required)
  });
  @ViewChild('exportTableModal', {static: false}) public exportTableModal: ModalDirective;

  constructor(
    public _crud: CrudService,
    private _route: ActivatedRoute,
    private _toast: ToastService,
    private _router: Router,
    private _leftSidebar: LeftSidebarService,
    public _types: DbmsTypesService,
    public _hub: HubService,
    private _settings: WebuiSettingsService
  ) {
  }

  ngOnInit() {
    this.newColumns.set(this.counter++, new DbColumn('', false, false, '', '', null, null ));
    this.schema = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.schema = params['id'];
      this.getTables();
    });
    this.getTables();
    this.getTypeInfo();
    this.getStores();
    this.initSocket();
    const sub = this._crud.onReconnection().subscribe((b)=> {
      if(b) this.onReconnect();
    });
    this.subscriptions.add(sub);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  onReconnect() {
    this.getTables();
    this.getTypeInfo();
    this.getStores();
    this._leftSidebar.setSchema(new SchemaRequest('/views/schema-editing/', false, 2, true), this._router);
  }

  getTables() {
    this._crud.getTables(new EditTableRequest(this.schema)).subscribe(
      res => {
        const result = <ResultSet>res;
        if (result.error !== undefined) {
          this._toast.exception(result, 'Could not retrieve list of tables:');
        }
        this.tables = [];
        for(const t of result.tables){
          this.tables.push({ name:t, truncate:false, drop:false, export:false });
        }
      }, err => {
        this._toast.error('could not retrieve list of tables');
        console.log(err);
      }
    );
  }

  getStores() {
    this._crud.getStores().subscribe(
      res => {
        this.stores = <Store[]>res;
      }, err => {
        console.log(err);
      });
  }

  getWritableStores () {
    return this.stores.filter( (s) => !s.dataReadOnly && !s.schemaReadOnly );
  }

  /**
   * get the right class for the 'drop' and 'truncate' buttons
   * enable the button if the confirm-text is equal to the table-name or to 'drop table-name' respectively 'truncate table-name'
   */
  dropTruncateClass(action: string, table: string, i: number) {
    if (action === 'drop' && (this.drop[i] === 'drop ' + table || this.drop[i] === table)) {
      return 'btn-danger';
    } else if (action === 'truncate' && (this.truncate[i] === 'truncate ' + table || this.truncate[i] === table)) {
      return 'btn-danger';
    }
    return 'btn-light disabled';
  }

  /**
   * send a request to either drop or truncate a table
   */
  sendRequest(action, table: string, i: number) {
    let request;
    if (this.dropTruncateClass(action, table, i) === 'btn-danger') {
      request = new EditTableRequest(this.schema, table, action);
    } else {
      return;
    }
    this._crud.dropTruncateTable(request).subscribe(
      res => {
        const result = <ResultSet>res;
        if (result.error) {
          this._toast.exception(result, 'Could not ' + action + ' the table ' + table + ':');
        } else {
          let toastAction = 'Truncated';
          if (request.getAction() === 'drop') {
            toastAction = 'Dropped';
            this._leftSidebar.setSchema(new SchemaRequest('/views/schema-editing/', false, 2, true), this._router);
          }
          this._toast.success(toastAction + ' table ' + request.table);
          this.getTables();
        }
      }, err => {
        this._toast.error('Could not ' + action + ' the table ' + table + ' due to an unknown error');
        console.log(err);
      }
    );
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
    if (this.tables.indexOf(this.newTableName) !== -1) {
      this._toast.warn('A table with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
      return;
    }
    let valid = true;
    //clear precision/scale for types where it is not applicable
    //delete columns with no column name
    let hasPk = false;
    this.newColumns.forEach((v, k) => {
      if( !this._types.supportsPrecision(v.dataType) && v.precision !== null ) v.precision = null;
      if( !this._types.supportsScale(v.dataType) && v.scale !== null ) v.scale = null;
      //clear cardinality and dimension if it is not an array
      if( v.collectionsType !== 'ARRAY' ) {
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
      if(v.primary) {
        hasPk = true;
      }
    });
    if( !hasPk ){
      this._toast.warn( 'Please specify a primary key. The new table was not created.', 'missing primary key', ToastDuration.INFINITE );
      return;
    }
    if (!valid) {
      this._toast.warn('Please make sure all column names are valid. The new table was not created.', 'invalid column name', ToastDuration.INFINITE);
      return;
    }
    const request = new EditTableRequest(this.schema, this.newTableName, 'create', Array.from(this.newColumns.values()), this.selectedStore);
    this._crud.createTable(request).subscribe(
      res => {
        const result = <ResultSet>res;
        if (result.error) {
          this._toast.exception(result, 'Could not generate table:');
        } else {
          this._toast.success('Generated table ' + request.table);
          this.newColumns.clear();
          this.counter = 0;
          this.newColumns.set(this.counter++, new DbColumn('', false, false, this.types[0].name, '', null, null ));
          this.newTableName = '';
          this.selectedStore = null;
          this._leftSidebar.setSchema(new SchemaRequest('/views/schema-editing/', false, 2, true), this._router);
        }
        this.getTables();
      }, err => {
        this._toast.error('Could not generate table');
        console.log(err);
      }
    );
  }

  initExportModal() {
    this.exportTableModal.show();
  }

  /**
   * Determine if the "export" button should be showed
   * (if at least one table is selected)
   */
  updateShowExportButton( e ){
    if( e.target.checked ){
      this.showExportButton = true;
      return;
    }
    for( const t of this.tables ){
      if( t.export ) {
        this.showExportButton = true;
        return;
      }
    }
    this.showExportButton = false;
  }

  resetExport() {
    this.exportForm.reset({pub: true, createPrimaryKeys: true, addDefaultValue: true});
    this.uploading = false;
    this.exportProgress = 0.0;
  }

  exportTable() {
    const exportTables = {};
    for(const t of this.tables){
      if(t.export){
        exportTables[t.name] = {initialName: t.name, newName: t.name};
      }
    }
    if (this.exportForm.valid) {
      this.uploading = true;
      this._crud.exportTable(
        this.exportForm.controls['name'].value,
        this.schema,
        exportTables,
        this.exportForm.controls['pub'].value,
        this.exportForm.controls['createPrimaryKeys'].value,
        this.exportForm.controls['addDefaultValue'].value,
      ).subscribe(
        res => {
          const result = <ResultSet>res;
          if (result.error) {
            this._toast.exception(result);
          } else {
            this._toast.success('Exported table to Polypheny-Hub');
          }
        }, err => {
          this._toast.error('Could not export table');
          console.log(err);
        }
        //"finally block"
      ).add(() => {
        this.resetExport();
        this.exportTableModal.hide();
      });
    }
  }

  initSocket() {
    const sub = this._crud.onSocketEvent().subscribe(
      msg => {
        const s = <Status>msg;
        if (s.context === 'tableExport') {
          this.exportProgress = s.status;
        }
      }, err => {
        setTimeout( ()=>{
          this.initSocket();
        }, +this._settings.getSetting('reconnection.timeout'));
      });
    this.subscriptions.add(sub);
  }

  createTableValidation(name: string) {
    const regex = this._crud.getValidationRegex();
    if (name === '') {
      return '';
    } else if (regex.test(name) && name.length <= 100 && this.tables.indexOf(name) === -1) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  addNewColumn() {
    this.newColumns.set(this.counter++, new DbColumn('', false, false, this.types[0].name, '', null, null ));
  }

  removeNewColumn(i: number) {
    this.newColumns.delete(i);
  }

  triggerDefaultNull(col: DbColumn) {
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
        this.newColumns.get(0).dataType = t[0].name;
      }
    );
  }

}

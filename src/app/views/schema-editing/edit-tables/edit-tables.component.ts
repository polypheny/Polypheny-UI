import {Component, OnDestroy, OnInit} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {EditTableRequest, SchemaRequest} from '../../../models/ui-request.model';
import {ActivatedRoute} from '@angular/router';
import {DbColumn, ResultSet} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';

@Component({
  selector: 'app-edit-tables',
  templateUrl: './edit-tables.component.html',
  styleUrls: ['./edit-tables.component.scss']
})
export class EditTablesComponent implements OnInit, OnDestroy {

  types: string[] = [];
  schema: string;
  tables: string[];
  truncate = [];
  drop = [];

  counter = 0;
  newColumns = new Map<number, DbColumn>();
  newTableName = '';

  constructor(
    private _crud: CrudService,
    private _route: ActivatedRoute,
    private _toast: ToastService,
    private _leftSidebar: LeftSidebarService,
    private _types: DbmsTypesService
  ) { }

  ngOnInit() {
    this.newColumns.set( this.counter++, new DbColumn('', false, false, this.types[0], null));
    this.schema = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.schema = params['id'];
      this.getTables();
    });
    this.getTables();
    this.getTypeInfo();
  }

  ngOnDestroy() {}

  getTables () {
    this._crud.getTables( new EditTableRequest( this.schema ) ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error !== undefined ){
          this._toast.toast( 'error', 'Could not retrieve list of tables: '+result.error, 10, 'bg-warning' );
        }
        this.tables = result.tables;
        this.tables.forEach((val, key) => {
          this.truncate[key] = '';
          this.drop[key] = '';
        });
      }, err => {
        this._toast.toast( 'server error', 'could not retrieve list of tables', 10, 'bg-danger' );
        console.log(err);
      }
    );
  }

  /**
   * send a request to either drop or truncate a table
   */
  sendRequest ( table:string, action, confirm: string ) {
    let request;
    if( confirm === table && action === 'drop'){
      request = new EditTableRequest( this.schema, table, action );
    }else if( confirm === table && action === 'truncate'){
      request = new EditTableRequest( this.schema, table, action );
    }else {
      return;
    }
    this._crud.dropTruncateTable( request ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error ){
          this._toast.toast( 'error', 'Could not '+action+' the table '+table+': '+result.error, 10, 'bg-warning' );
          console.log( result );
        }else {
          let toastAction = 'Truncated';
          if( request.getAction() === 'drop'){
            toastAction = 'Dropped';
            this._leftSidebar.setSchema( new SchemaRequest('/views/schema-editing/', false, 2) );
          }
          this._toast.toast('success', toastAction + ' table '+request.table, 10, 'bg-success');
          this.getTables();
        }
      }, err => {
        this._toast.toast( 'server error', 'Could not '+confirm+' the table '+table+' due to an unknown error', 10, 'bg-danger' );
        console.log( err );
      }
    );
  }

  createTable () {
    if(this.newTableName === ''){
      this._toast.toast( 'missing table name', 'Please provide a name for the new table. The new table was not created.', 0, 'bg-warning');
      return;
    }
    //clear maxlength for types where it is not applicable
    //delete columns with no column name
    this.newColumns.forEach((v, k) => {
      if( !['varchar', 'varbinary'].includes(v.dataType.toLowerCase()) && v.maxLength !== null ) v.maxLength = null;
      if( v.name === '' ) this.newColumns.delete( k );
    });
    const request = new EditTableRequest( this.schema, this.newTableName, 'create', Array.from(this.newColumns.values()) );
    this._crud.createTable( request ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error ) {
          this._toast.toast( 'error', 'Could not generate table: '+result.error, 10, 'bg-warning' );
        } else {
          this._toast.toast('success', 'Generated table ' + request.table, 5, 'bg-success' );
          this.newColumns.clear();
          this.counter = 0;
          this.newColumns.set( this.counter++, new DbColumn('', false, false, this.types[0], null));
          this.newTableName = '';
          this._leftSidebar.setSchema( new SchemaRequest('/views/schema-editing/', false, 2) );
        }
        this.getTables();
      }, err => {
        this._toast.toast( 'server error', 'Could not generate table', 10, 'bg-warning' );
        console.log( err );
      }
    );
  }

  addNewColumn() {
    this.newColumns.set( this.counter++, new DbColumn('', false, false, this.types[0], null));
  }

  removeNewColumn( i:number ){
    this.newColumns.delete(i);
  }

  triggerDefaultNull ( col: DbColumn ) {
    if( col.defaultValue === null ){
      if( this._types.isNumeric( col.dataType )){
        col.defaultValue = 0;
      } else if( this._types.isBoolean( col.dataType )){
        col.defaultValue = false;
      } else {
        col.defaultValue = '';
      }
    }else {
      col.defaultValue = null;
    }
  }

  getTypeInfo(){
    this._types.getTypes().subscribe(
      t => {
        this.types = t;
        this.newColumns.get(0).dataType = t[0];
      }
    );
  }

}

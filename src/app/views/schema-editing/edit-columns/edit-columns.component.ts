import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService, SidebarNode} from '../../../components/left-sidebar/left-sidebar.service';
import {ColumnRequest, ConstraintRequest, CrudService, SchemaRequest, UIRequest} from '../../../services/crud.service';
import {DbColumn, ResultSet, TableConstraint} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import {Input} from '@angular/core';

@Component({
  selector: 'app-edit-columns',
  templateUrl: './edit-columns.component.html',
  styleUrls: ['./edit-columns.component.scss']
})

export class EditColumnsComponent implements OnInit {

  @Input() tableId: string;
  resultSet: ResultSet;
  types: string[] = ['int8', 'int4', 'varchar', 'timestamptz', 'bool', 'text'];
  editColumn = -1;
  createColumn = new DbColumn( '', false, false, 'text', null, null);
  confirm = -1;
  oldColumns = new Map<string, DbColumn>();

  constraints: ResultSet;
  confirmConstraint = -1;

  constructor(
    private _route: ActivatedRoute,
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService,
    private _toast: ToastService
  ) { }

  ngOnInit() {

    this.getTableId();
    this.getColumns();
    this.getConstraints();

    this.documentListener();
  }

  getTableId () {
    this.tableId = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.tableId = params['id'];
      this.getColumns();
    });
  }

  getColumns () {
    if( !this.tableId.includes('.') ){
      return;
    }
    this._crud.getColumns( new ColumnRequest( this.tableId )).subscribe(
      res => {
        this.resultSet = <ResultSet> res;
        this.oldColumns.clear();
        this.resultSet.header.forEach(( v ,k )=>{
          this.oldColumns.set( v.name, DbColumn.fromJson( v ));
        });
      }, err => {
        this._toast.toast( 'server error', 'Could not load columns of the table.', 0, 'bg-danger' );
        console.log(err);
      }
    );
  }

  editCol( i:number ) {
    this.editColumn = i;
  }
  
  saveCol( newCol:DbColumn ) {
    const req = new ColumnRequest( this.tableId, this.oldColumns.get( newCol.name ), newCol );
    console.log(req);
    this._crud.updateColumn( req ).subscribe(
      res => {
        const result = <ResultSet> res;
        this.editColumn = -1;
        this.getColumns();
        if( result.error ){
          this._toast.toast( 'error', 'Could not update column: '+result.error, 0, 'bg-warning' );
        }else{
          this._toast.toast( 'column saved', 'The new column was saved.', 10, 'bg-success' );
        }
      }, err => {
        this._toast.toast( 'server error', 'Could not save column due to an error on the server.', 0, 'bg-danger' );
        console.log(err);
      }
    );
  }

  addColumn() {
    if( this.createColumn.name === ''){
      this._toast.toast( 'missing column name', 'Please provide a name for the new column.', 0, 'bg-warning');
      return;
    }
    //const newColumn = new DbColumn( this.createColumn.name, false, this.createColumn.nullable, this.createColumn.type, this.createColumn.maxLength );
    const req = new ColumnRequest( this.tableId, null, this.createColumn );
    this._crud.addColumn( req ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error === undefined ){
          this.getColumns();
          this.createColumn.name = '';
          this.createColumn.nullable = false;
          this.createColumn.type = this.types[0];
          this.createColumn.maxLength = null;
          this.createColumn.defaultValue = null;
        } else {
          this._toast.toast( 'server error', result.error, 0, 'bg-warning' );
        }
      }, err => {
        this._toast.toast( 'server error', 'An error occured on the server.', 0, 'bg-danger' );
        console.log(err);
    }
    );
  }
  
  dropColumn ( col: DbColumn , i ) {
    if ( this.confirm !== i ){
      this.confirm = i;
    } else {
      this._crud.dropColumn( new ColumnRequest( this.tableId, col ) ).subscribe(
        res => {
          this.getColumns();
          this.confirm = -1;
        }, err => {
          this._toast.toast( 'server error', 'Could not delete column.', 0, 'bg-danger' );
          console.log(err);
        }
      );
    }
  }
  
  getConstraints () {
    this._crud.getConstraints( new ColumnRequest(this.tableId) ).subscribe(
      res => {
        this.constraints = <ResultSet> res;
      }, err => {
        console.log(err);
    }
    );
  }

  dropConstraint ( constraintName:string, i:number) {
    if( this.confirmConstraint !== i ){
      this.confirmConstraint = i;
    } else {
      this._crud.dropConstraint( new ConstraintRequest( this.tableId, new TableConstraint( constraintName ) )).subscribe(
        res => {
          const result = <ResultSet> res;
          console.log(result);
          if( result.error){
            this._toast.toast( 'constraint error', result.error, 10, 'bg-warning');
          }else{
            this.getConstraints();
          }
        }, err => {
          console.log(err);
        }
      );
    }
  }

  addPrimaryKey () {
    const pk = new TableConstraint( 'pk', 'PRIMARY KEY' );
    this.resultSet.header.forEach((v, k) => {
      if( v.primary ){
        pk.addColumn( v.name );
      }
    });
    const constraintRequest = new ConstraintRequest( this.tableId, pk );
    this._crud.addPrimaryKey( constraintRequest ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( !result.error ){
          this.getConstraints();
        }else {
          this._toast.toast( 'primary key error', result.error, 0, 'bg-warning');
        }
      }, err => {
        this._toast.toast( 'Server error', 'Could not add primary key.', 0, 'bg-danger');
        console.log(err);
      }
    );
  }

  documentListener() {
    const self = this;
    $(document).on('click', function(e){
      if(!$(e.target).hasClass('editing')){
        self.editColumn = -1;
      }
    });
  }

  triggerDefaultNull ( col: DbColumn ) {
    if( col.defaultValue === null ){
      switch( col.type ){
        case 'int4':
        case 'int8':
          col.defaultValue = 0;
          break;
        case 'bool':
          col.defaultValue = false;
          break;
        default:
          col.defaultValue = '';
      }
    }else {
      col.defaultValue = null;
    }
  }

}

import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {DbColumn, Index, ResultSet, TableConstraint} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import {Input} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ColumnRequest, ConstraintRequest, EditTableRequest} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';

@Component({
  selector: 'app-edit-columns',
  templateUrl: './edit-columns.component.html',
  styleUrls: ['./edit-columns.component.scss']
})

export class EditColumnsComponent implements OnInit {

  @Input() tableId: string;
  table: string;
  schema: string;

  resultSet: ResultSet;
  types: string[] = [];
  editColumn = -1;
  createColumn = new DbColumn( '', false, true, 'text', null, null);
  confirm = -1;
  oldColumns = new Map<string, DbColumn>();
  updateColumn = new FormGroup({name: new FormControl('')});

  constraints: ResultSet;
  confirmConstraint = -1;
  newPrimaryKey: DbColumn[];

  uniqueConstraintName = '';

  indexes: ResultSet;
  confirmIndex = -1;
  //todo put the available methods of the Polypheny-DB system or get it via the crud service
  indexMethods = ['btree', 'hash']; // 'gist', 'gin'
  newIndexForm: FormGroup;
  indexSubmitted = false;

  constructor(
    private _route: ActivatedRoute,
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService,
    private _toast: ToastService,
    private _types: DbmsTypesService
  ) {
    this.newIndexForm = new FormGroup( {
      name: new FormControl('', Validators.required),
      method: new FormControl('btree'),
      columns: new FormControl(null, Validators.required)
    });
    this._types.getTypes().subscribe(
      type => {
        this.types = type;
        this.createColumn.dataType = type[0];
      }
    );
  }

  ngOnInit() {

    this.getTableId();
    this.getColumns();
    this.getConstraints();
    this.getIndexes();

    this.documentListener();
  }

  getTableId () {
    this.tableId = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.tableId = params['id'];
      if( this.tableId.includes('.') ){
        const t = this.tableId.split('\.');
        this.schema = t[0];
        this.table = t[1];
        this.getColumns();
        this.getConstraints();
        this.getIndexes();
      }
    });
  }

  getColumns () {
    this._crud.getColumns( new ColumnRequest( this.tableId )).subscribe(
      res => {
        this.resultSet = <ResultSet> res;
        this.oldColumns.clear();
        this.resultSet.header.forEach(( v ,k )=>{
          this.oldColumns.set( v.name, DbColumn.fromJson( v ));
        });
        // deep copy: from: https://stackoverflow.com/questions/35504310/deep-copy-an-array-in-angular-2-typescript
        this.newPrimaryKey = this.resultSet.header.map( x => Object.assign({}, x));
      }, err => {
        this._toast.toast( 'server error', 'Could not load columns of the table.', 0, 'bg-danger' );
        console.log(err);
      }
    );
  }

  editCol( i:number, col: DbColumn ) {
    if(this.editColumn !== i) {
      if( col.defaultValue === undefined ){
        col.defaultValue = null;
      }
      this.updateColumn = new FormGroup({
        name: new FormControl( col.name, Validators.required ),
        oldName: new FormControl( col.name ),
        nullable: new FormControl( col.nullable ),
        dataType: new FormControl( col.dataType ),
        maxLength: new FormControl( {value: col.maxLength, disabled: ! ['varchar', 'varbinary'].includes(col.dataType.toLowerCase())} ),
        defaultValue: new FormControl( {value: col.defaultValue, disabled: col.defaultValue === null} )
      });
      this.editColumn = i;
    }
  }

  saveCol() {
    const oldColumn = this.oldColumns.get( this.updateColumn.controls['oldName'].value );
    const newColumn = new DbColumn(
      this.updateColumn.controls['name'].value, null,
      this.updateColumn.controls['nullable'].value,
      this.updateColumn.controls['dataType'].value,
      this.updateColumn.controls['maxLength'].value,
      this.updateColumn.controls['defaultValue'].value
    );
    if( ! ['varchar', 'varbinary'].includes( newColumn.dataType.toLowerCase()) && newColumn.maxLength !== null ){
      newColumn.maxLength = null;
    }
    const req = new ColumnRequest( this.tableId, oldColumn, newColumn );
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
    if( ! ['varchar', 'varbinary'].includes(this.createColumn.dataType.toLowerCase()) && this.createColumn.maxLength !== null ){
      this.createColumn.maxLength = null;
    }
    //const newColumn = new DbColumn( this.createColumn.name, false, this.createColumn.nullable, this.createColumn.dataType, this.createColumn.maxLength );
    const req = new ColumnRequest( this.tableId, null, this.createColumn );
    this._crud.addColumn( req ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error === undefined ){
          this.getColumns();
          this.createColumn.name = '';
          this.createColumn.nullable = true;
          this.createColumn.dataType = this.types[0];
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
          const result = <ResultSet> res;
          if( result.error ){
            this._toast.toast( 'server error', 'Could not delete column:\n' + result.error, 0, 'bg-warning' );
          }
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

  dropConstraint ( constraintName:string, constraintType:string, i:number) {
    if( this.confirmConstraint !== i ){
      this.confirmConstraint = i;
    } else {
      this._crud.dropConstraint( new ConstraintRequest( this.tableId, new TableConstraint( constraintName, constraintType ) )).subscribe(
        res => {
          const result = <ResultSet> res;
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
    this.newPrimaryKey.forEach((v, k) => {
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
          this._toast.toast( 'added primary key', 'The primary key was added.', 5, 'bg-success' );
          this.getColumns();
        }else {
          this._toast.toast( 'primary key error', result.error, 0, 'bg-warning');
        }
      }, err => {
        this._toast.toast( 'Server error', 'Could not add primary key.', 0, 'bg-danger');
        console.log(err);
      }
    );
  }

  addUniqueConstraint(){
    if( this.uniqueConstraintName === '' ){
      this._toast.toast( 'constraint name', 'Please provide a name for the unique constraint.', 10, 'bg-warning' );
      return;
    }
    const constraint = new TableConstraint( this.uniqueConstraintName, 'UNIQUE');
    let counter = 0;
    this.resultSet.header.forEach((v, k) => {
      if( v.unique ){
        constraint.addColumn( v.name );
        counter++;
      }
    });
    if( counter === 0 ) {
      this._toast.toast( 'unique constraint', 'Please select at least one column that should be part of the unique constraint.', 10, 'bg-warning' );
      return;
    }
    const constraintRequest = new ConstraintRequest( this.tableId, constraint );
    this._crud.addUniqueConstraint( constraintRequest ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( !result.error ){
          this.getConstraints();
          this._toast.toast( 'added constraint', 'The unique constraint was successfully created', 5, 'bg-success' );
          this.uniqueConstraintName = '';
          this.resultSet.header.forEach((v, k) => {
            v.unique = false;
          });
        }else {
          this._toast.toast( 'unique constraint error', result.error, 0, 'bg-warning');
        }
      }, err => {
        this._toast.toast( 'Server error', 'Could not add unique constraint.', 0, 'bg-danger');
        console.log(err);
      }
    );
  }

  documentListener() {
    const self = this;
    $(document).on('click', function(e){
      if( $(e.target).parents('.editing').length === 0 ){
        self.editColumn = -1;
      }
    });
  }

  assignDefault ( col: any, isFormGroup: boolean ) {
    if( isFormGroup ){
      if ( this._types.isNumeric( col.controls['dataType'].value )){
        col.controls['defaultValue'].setValue(0);
      } else if ( this._types.isBoolean( col.controls['dataType'].value )) {
        col.controls['defaultValue'].setValue(false);
      } else {
        col.controls['defaultValue'].setValue('');
      }
    } else {
      if( this._types.isNumeric( col.dataType )){
        col.defaultValue = 0;
      } else if ( this._types.isBoolean( col.dataType )){
        col.defaultValue = false;
      } else {
        col.defaultValue = '';
      }
    }
  }

  triggerDefaultNull ( col: DbColumn = null ) {
    if(col === null){//when updating a column
      if( this.updateColumn.controls['defaultValue'].value === null ){
        this.updateColumn.controls['defaultValue'].enable();
        this.assignDefault( this.updateColumn, true);
      }else {
        this.updateColumn.controls['defaultValue'].setValue(null);
        this.updateColumn.controls['defaultValue'].disable();
      }
    }
    else{//if col !== null: when inserting a new column
      if( col.defaultValue === null ){
        this.assignDefault( col, false );
      }else {
        col.defaultValue = null;
      }
    }
  }

  changeNullable ( col: DbColumn = null ) {
    if(col === null) {//when updating a column
      if (this.updateColumn.controls['defaultValue'].value === null && this.updateColumn.controls['nullable'].value === false) {
        this.updateColumn.controls['defaultValue'].enable();
        this.assignDefault( this.updateColumn, true );
      }
    }
    else {//if col !== null: when inserting a new column
      if( col.defaultValue === null && col.nullable === false ) {
        this.assignDefault( col, false );
      }
    }
  }

  getIndexes () {
    this._crud.getIndexes( new EditTableRequest( this.schema, this.table ) ).subscribe(
      res => {
        this.indexes = <ResultSet> res;
      }, err => {
        console.log(err);
      }
    );
  }

  dropIndex ( index: string, i ) {
    if (this.confirmIndex !== i) {
      this.confirmIndex = i;
    } else {
      this._crud.dropIndex( new Index( this.schema, this.table, index, null, null ) ).subscribe(
        res => {
          const result = <ResultSet> res;
          if( !result.error ){
            this.getIndexes();
          }else{
            this._toast.toast( 'error', 'Could not drop index: ' + result.error, 10, 'bg-warning');
          }
        }, err => {
          console.log(err);
        }
      );
    }
  }

  addIndex(){
    this.indexSubmitted = true;
    if(this.newIndexForm.valid){
      const i = this.newIndexForm.value;
      const index = new Index( this.schema, this.table, i.name, i.method, i.columns);
      this._crud.createIndex( index ).subscribe(
        res => {
          const result = <ResultSet> res;
          if( !result.error ){
            this.getIndexes();
          }else{
            this._toast.toast( 'error', 'Could not create index: ' + result.error, 10, 'bg-warning');
          }
        }, err => {
          console.log(err);
        }
      );
    }
  }

  inputValidation(key){
    if(this.indexSubmitted  && this.newIndexForm.controls[key].valid && this.newIndexForm.controls[key].dirty ){
      return {'is-valid':true};
    }else if(this.indexSubmitted  && !this.newIndexForm.controls[key].valid) {
      return {'is-invalid': true };
    }
  }

  onTypeChange( event ){
    if( ['varchar', 'varbinary'].includes( event.target.value.toLowerCase() ) ){
      this.updateColumn.controls['maxLength'].enable();
    }else{
      this.updateColumn.controls['maxLength'].setValue( null );
      this.updateColumn.controls['maxLength'].disable();
    }
    this.assignDefault( this.updateColumn, true);
  }

  onTypeChange2( col ){
    if( col.defaultValue !== null ) this.assignDefault( col, false );
  }

  validate( defaultValue ){
    if( defaultValue === null ){
      return '';
    } else if ( isNaN(defaultValue) || defaultValue === '' ) {
      return 'is-invalid';
    }else{
      return 'is-valid';
    }
  }

}

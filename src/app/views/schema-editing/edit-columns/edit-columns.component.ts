import {Component, Input, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {DbColumn, Index, ResultSet, TableConstraint} from '../../../components/data-table/models/result-set.model';
import {ToastDuration, ToastService} from '../../../components/toast/toast.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ColumnRequest, ConstraintRequest, EditTableRequest} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {Store} from '../../stores/store.model';

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
  proposedConstraintName = 'constraintName';

  indexes: ResultSet;
  confirmIndex = -1;
  //todo put the available methods of the Polypheny-DB system or get it via the crud service
  indexMethods = ['btree', 'hash']; // 'gist', 'gin'
  newIndexForm: FormGroup;
  indexSubmitted = false;
  proposedIndexName = 'indexName';

  //data placement handling
  stores: Store[];
  selectedStore;
  dataPlacements: ResultSet;
  confirmPlacement = -1;

  constructor(
    private _route: ActivatedRoute,
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService,
    private _toast: ToastService,
    private _types: DbmsTypesService
  ) {
    this.newIndexForm = new FormGroup( {
      name: new FormControl('', this._crud.getNameValidator() ),
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
    this.getStores();
    this.getDataPlacements();
    this.getGeneratedNames();

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
        this.getDataPlacements();
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
        this._toast.error('Could not load columns of the table.', null, ToastDuration.INFINITE);
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
    if( ! this._crud.nameIsValid( this.updateColumn.controls['name'].value ) ){
      this._toast.warn(this._crud.invalidNameMessage('column'), 'invalid column name');
      return;
    }
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
          this._toast.exception(result, 'Could not update column:');
        }else{
          this._toast.success('The new column was saved.', 'column saved');
        }
      }, err => {
        this._toast.error('Could not save column due to an error on the server.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    );
  }

  addColumn() {
    if( this.createColumn.name === ''){
      this._toast.warn('Please provide a name for the new column.', 'missing column name');
      return;
    }
    if( ! this._crud.nameIsValid( this.createColumn.name ) ){
      this._toast.warn(this._crud.invalidNameMessage('column'), 'invalid column name');
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
          this._toast.exception(result, null, 'server error', ToastDuration.INFINITE);
        }
      }, err => {
        this._toast.error('An error occurred on the server.', null, ToastDuration.INFINITE);
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
            this._toast.exception(result, 'Could not delete column:', 'server error', ToastDuration.INFINITE);
          }
        }, err => {
          this._toast.error('Could not delete column.', null, ToastDuration.INFINITE);
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
            this._toast.exception(result, null, 'constraint error');
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
          this._toast.success('The primary key was added.', 'added primary key');
          this.getColumns();
        }else {
          this._toast.exception(result, null, 'primary key error', ToastDuration.INFINITE);
        }
      }, err => {
        this._toast.error('Could not add primary key.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    );
  }

  addUniqueConstraint(){
    if( this.uniqueConstraintName === '' ) {
      if (!this.proposedConstraintName) {
        this._toast.warn('Please provide a name for the unique constraint.', 'constraint name');
        return;
      } else {
        this.uniqueConstraintName = this.proposedConstraintName;
      }
    }
    if( ! this._crud.nameIsValid( this.uniqueConstraintName ) ){
      this._toast.warn(this._crud.invalidNameMessage('unique constraint'), 'invalid constraint name');
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
      this._toast.warn('Please select at least one column that should be part of the unique constraint.', 'unique constraint');
      return;
    }
    const constraintRequest = new ConstraintRequest( this.tableId, constraint );
    this._crud.addUniqueConstraint( constraintRequest ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( !result.error ){
          this.getConstraints();
          this._toast.success('The unique constraint was successfully created', 'added constraint');
          this.uniqueConstraintName = '';
          this.getGeneratedNames();
          this.resultSet.header.forEach((v, k) => {
            v.unique = false;
          });
        }else {
          this._toast.exception(result, null, 'unique constraint error', ToastDuration.INFINITE);
        }
      }, err => {
        this._toast.error('Could not add unique constraint.', null, ToastDuration.INFINITE);
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

  getIndexes() {
    this._crud.getIndexes(new EditTableRequest(this.schema, this.table)).subscribe(
      res => {
        this.indexes = <ResultSet>res;
      }, err => {
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

  getAddableStores () {
    return this.stores.filter( (s) => {
      // hide stores that are schemaReadOnly or dataReadOnly
      if( s.schemaReadOnly || s.dataReadOnly ) {
        return false;
      }
      //hide stores that are already part of the placement
      else if ( this.dataPlacements && this.dataPlacements.data && this.dataPlacements.data.length > 0 ) {
        let showStore = true;
        for ( const store of this.dataPlacements.data ) {
          if( store[0] === s.uniqueName ) {
            showStore = false;
          }
        }
        return showStore;
      }
      else {
        return true;
      }
    });
  }

  getDataPlacements() {
    this._crud.getDataPlacements(this.schema, this.table).subscribe(
      res => {
        const result = <ResultSet>res;
        if (!result.error) {
          this.dataPlacements = result;
        } else {
          console.log(result.error);
        }
      }, err => {
        console.log(err);
      }
    );
  }

  addPlacement() {
    if (!this.selectedStore) {
      return;
    }
    this._crud.addDropPlacement(this.schema, this.table, this.selectedStore, 'ADD').subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error ) {
          this._toast.exception( result );
        } else {
          this._toast.success( 'Added placement on store ' + this.selectedStore, 'Added placement' );
          this.getDataPlacements();
        }
        this.selectedStore = null;
      }, err => {
        this._toast.error( 'Could not drop placement on store ' + this.selectedStore );
      }
    );
  }

  dropPlacement(store: string, i: number) {
    if (i !== this.confirmPlacement) {
      this.confirmPlacement = i;
      return;
    }
    this._crud.addDropPlacement(this.schema, this.table, store, 'DROP').subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error ) {
          this._toast.exception( result );
        } else {
          this._toast.success( 'Dropped placement on store ' + store, 'Dropped placement' );
          this.getDataPlacements();
        }
      }, err => {
        this._toast.error( 'Could not drop placement on store ' + store, 'Error' );
      }
    );
  }

  dropIndex(index: string, i) {
    if (this.confirmIndex !== i) {
      this.confirmIndex = i;
    } else {
      this._crud.dropIndex(new Index(this.schema, this.table, index, null, null)).subscribe(
        res => {
          const result = <ResultSet>res;
          if (!result.error) {
            this.getIndexes();
          }else{
            this._toast.exception(result, 'Could not drop index:');
          }
        }, err => {
          console.log(err);
        }
      );
    }
  }

  addIndex() {
    this.indexSubmitted = true;
    if (this.newIndexForm.controls['method'].valid && this.newIndexForm.controls['columns'].valid && this.newIndexForm.controls['name'].errors) {
      this.newIndexForm.controls['name'].setValue(this.proposedIndexName);
    }
    if (this.newIndexForm.valid) {
      const i = this.newIndexForm.value;
      const index = new Index(this.schema, this.table, i.name, i.method, i.columns);
      this._crud.createIndex(index).subscribe(
        res => {
          const result = <ResultSet>res;
          if (!result.error) {
            this.getIndexes();
            this.getGeneratedNames();
            this.newIndexForm.reset({name: '', method: 'btree', columns: null});
            this.indexSubmitted = false;
          } else {
            this._toast.exception(result, 'Could not create index:');
          }
        }, err => {
          console.log(err);
        }
      );
    }
  }

  getGeneratedNames() {
    this._crud.getGeneratedNames().subscribe(
      res => {
        const names = <ResultSet>res;
        if (!names.error) {
          this.proposedConstraintName = names.data[0][0];
          this.proposedIndexName = names.data[0][2];
        } else {
          console.log(names.error);
        }
      }, err => {
        console.log(err);
      }
    );
  }

  inputValidation(key) {
    if (this.newIndexForm.controls[key].value === '') {
      return '';
    } else if (this.newIndexForm.controls[key].valid) {
      return {'is-valid': true};
    } else {
      return {'is-invalid': true};
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

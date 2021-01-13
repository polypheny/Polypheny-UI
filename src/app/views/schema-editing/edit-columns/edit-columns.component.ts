import {Component, Input, OnInit, OnDestroy, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {
  DbColumn,
  Index, ModifyPartitionRequest,
  PartitioningRequest,
  PolyType,
  ResultSet,
  TableConstraint
} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToastService} from '../../../components/toast/toast.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ColumnRequest, ConstraintRequest, EditTableRequest} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {CatalogColumnPlacement, Placements, PlacementType, Store} from '../../stores/store.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import * as _ from 'lodash';

@Component({
  selector: 'app-edit-columns',
  templateUrl: './edit-columns.component.html',
  styleUrls: ['./edit-columns.component.scss']
})

export class EditColumnsComponent implements OnInit, OnDestroy {

  @Input() tableId: string;
  table: string;
  schema: string;

  resultSet: ResultSet;
  types: PolyType[] = [];
  editColumn = -1;
  createColumn = new DbColumn( '', false, true, 'text', '', null, null, null);
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
  newIndexCols;
  selectedStoreForIndex: Store;
  newIndexForm: FormGroup;
  indexSubmitted = false;
  proposedIndexName = 'indexName';
  addingIndex = false;

  //data placement handling
  stores: Store[];
  selectedStore: Store;
  dataPlacements: Placements;
  confirmPlacement = -1;
  columnPlacement: FormGroup;
  placementMethod: 'ADD' | 'MODIFY' | 'DROP';
  isAddingPlacement = false;

  //partition handling
  partitionTypes: string[];
  partitioningRequest: PartitioningRequest = new PartitioningRequest();
  isMergingPartitions = false;
  partitionsToModify: { partitionName: string, selected: boolean }[];

  @ViewChild('placementModal', {static: false}) public placementModal: ModalDirective;
  @ViewChild('partitioningModal', {static: false}) public partitioningModal: ModalDirective;

  constructor(
    private _route: ActivatedRoute,
    private _leftSidebar: LeftSidebarService,
    public _crud: CrudService,
    private _toast: ToastService,
    public _types: DbmsTypesService
  ) {
    this.newIndexForm = new FormGroup( {
      name: new FormControl('', this._crud.getNameValidator() ),
      method: new FormControl('')
    });
    this._types.getTypes().subscribe(
      type => {
        this.types = type;
        this.createColumn.dataType = type[0].name;
      }
    );
  }

  ngOnInit() {

    this.getTableId();
    this.getColumns();
    this.getConstraints();
    this.getIndexes();
    this.getStores();
    this.getPlacementsAndPartitions();
    this.getPartitionTypes();
    this.getGeneratedNames();

    this.documentListener();
  }

  ngOnDestroy() {
    $(document).off('click');
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
        this.getPlacementsAndPartitions();
      }
    });
  }

  getColumns () {
    this._crud.getColumns( new ColumnRequest( this.tableId )).subscribe(
      res => {
        this.resultSet = <ResultSet> res;
        this.oldColumns.clear();
        this.newIndexCols = {};
        this.resultSet.header.forEach(( v ,k )=>{
          this.oldColumns.set( v.name, DbColumn.fromJson( v ));
          this.newIndexCols[v.name] = false;
        });
        this.partitioningRequest.column = this.resultSet.header[0].name;
        // deep copy: from: https://stackoverflow.com/questions/35504310/deep-copy-an-array-in-angular-2-typescript
        this.newPrimaryKey = this.resultSet.header.map( x => Object.assign({}, x));
      }, err => {
        this._toast.error('Could not load columns of the table.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    );
  }

  getColumnArray () {
    return this.resultSet.header.map((h) => h.name );
  }

  columnValidation (columnName: string, editing:string = null ) {
    if( editing ) {
      if( this.resultSet.header.filter( (h) => h.name === columnName && h.name !== editing ).length > 0 ) {
        return 'is-invalid';
      }
    } else {
      if( this.resultSet.header.filter( (h) => h.name === columnName ).length > 0 ) {
        return 'is-invalid';
      }
    }
    return this._crud.getValidationClass( columnName );
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
        collectionsType: new FormControl( col.collectionsType ),
        precision: new FormControl( col.precision ),
        scale: new FormControl( col.scale ),
        dimension: new FormControl(col.dimension),
        cardinality: new FormControl(col.cardinality),
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
    if( this.resultSet.header.filter( (h) => h.name === this.updateColumn.controls['name'].value && h.name !== this.updateColumn.controls['oldName'].value ).length > 0){
      this._toast.warn( 'This column name already exists', 'invalid column name' );
      return;
    }
    const oldColumn = this.oldColumns.get( this.updateColumn.controls['oldName'].value );
    const newColumn = new DbColumn(
      this.updateColumn.controls['name'].value,
      null,
      this.updateColumn.controls['nullable'].value,
      this.updateColumn.controls['dataType'].value,
      this.updateColumn.controls['collectionsType'].value,
      this.updateColumn.controls['precision'].value,
      this.updateColumn.controls['scale'].value,
      this.updateColumn.controls['defaultValue'].value,
      this.updateColumn.controls['dimension'].value,
      this.updateColumn.controls['cardinality'].value
    );
    if( !this._types.supportsPrecision(newColumn.dataType) && newColumn.precision !== null ){
      newColumn.precision = null;
    }
    if( !this._types.supportsScale(newColumn.dataType) && newColumn.scale !== null ){
      newColumn.scale = null;
    }
    const req = new ColumnRequest( this.tableId, oldColumn, newColumn );
    this._crud.updateColumn( req ).subscribe(
      res => {
        const result = <ResultSet> res;
        this.editColumn = -1;
        this.getColumns();
        if( result.error ){
          this._toast.exception(result, 'Could not update column:');
          console.log(result);
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
    if( this.resultSet.header.filter( (h) => h.name === this.createColumn.name ).length > 0 ) {
      this._toast.warn( 'There already exists a column with this name', 'invalid column name' );
      return;
    }
    if( !this._types.supportsPrecision(this.createColumn.dataType) && this.createColumn.precision !== null ){
      this.createColumn.precision = null;
    }
    if( !this._types.supportsScale(this.createColumn.dataType) && this.createColumn.scale !== null ){
      this.createColumn.scale = null;
    }
    const req = new ColumnRequest( this.tableId, null, this.createColumn );
    this._crud.addColumn( req ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error === undefined ){
          this.getColumns();
          this.getPlacementsAndPartitions();
          this.createColumn.name = '';
          this.createColumn.nullable = true;
          this.createColumn.dataType = this.types[0].name;
          this.createColumn.collectionsType = '';
          this.createColumn.precision = null;
          this.createColumn.scale = null;
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
          this.getPlacementsAndPartitions();
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

  updatePrimaryKey () {
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
          this._toast.success('The primary key was updated.', 'updated primary key');
          this.getColumns();
          this.getPlacementsAndPartitions();
        }else {
          this._toast.exception(result, null, 'primary key error', ToastDuration.INFINITE);
        }
      }, err => {
        this._toast.error('Could not update primary key.', null, ToastDuration.INFINITE);
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
        this.initNewIndexValues();
      }, err => {
        console.log(err);
      });
  }

  initNewIndexValues() {
    const selectedStore = this.availableStoresForIndexes();
    if (selectedStore && selectedStore.length > 0) {
      this.selectedStoreForIndex = selectedStore[0];
      if (selectedStore[0].availableIndexMethods && selectedStore[0].availableIndexMethods.length > 0) {
        this.newIndexForm.controls['method'].setValue(selectedStore[0].availableIndexMethods[0].name);
      }
    } else {
      this.selectedStoreForIndex = null;
      this.newIndexForm.controls['method'].setValue('');
    }
  }

  availableStoresForIndexes (): Store[] {
    if(!this.stores || !this.dataPlacements){
      return [];
    }
    return this.stores.filter((s) => {
      if( s.schemaReadOnly || s.availableIndexMethods == null || s.availableIndexMethods.length === 0 ){
        return false;
      }
      if( this.dataPlacements.stores.filter((dp) => dp.uniqueName === s.uniqueName ).length === 0){
        return false;
      }
      return true;
    });
  }

  getAddableStores (): Store[] {
    if(!this.stores) { return []; }
    return this.stores.filter( (s: Store) => {
      // hide stores that are schemaReadOnly or dataReadOnly
      if( s.schemaReadOnly || s.dataReadOnly ) {
        return false;
      }
      //hide stores that are already part of the placement
      else if ( this.dataPlacements && this.dataPlacements.stores && this.dataPlacements.stores.length > 0 ) {
        let showStore = true;
        for ( const store of this.dataPlacements.stores ) {
          if( store.uniqueName === s.uniqueName ) {
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

  getPlacementsAndPartitions() {
    this._crud.getDataPlacements(this.schema, this.table).subscribe(
      res => {
        this.dataPlacements = <Placements>res;
        for(const s of this.dataPlacements.stores){
          s.columnPlacements.sort((a,b) => a.columnId - b.columnId);
        }
        this.getIndexes();
        this.initNewIndexValues();
        if( this.dataPlacements.exception ){
          // @ts-ignore
          this._toast.exception( {error: this.dataPlacements.exception.detailMessage, exception: this.dataPlacements.exception} );
        }
      }, err => {
        console.log(err);
      }
    );
  }

  initPlacementModal( method: 'ADD' | 'MODIFY', store = null, preselect:CatalogColumnPlacement[] = [] ){
    this.placementMethod = method;
    if( store != null ) {
      this.selectedStore = store;
    }
    if (!this.selectedStore) {
      return;
    }
    this.columnPlacement = new FormGroup({});
    this.resultSet.header.forEach(( v ,k )=>{
      let state = true;
      if( preselect.length > 0 && !preselect.some( e => e.columnName === v.name && e.placementType === PlacementType.MANUAL ) ) {
        state = false;
      }
      this.columnPlacement.addControl( v.name, new FormControl(state) );
    });
    this.placementModal.show();
  }

  clearPlacementModal(){
    this.selectedStore = null;
  }

  selectAllColumns ( selectAll: boolean ) {
    this.resultSet.header.forEach(( v ,k )=>{
      this.columnPlacement.get(v.name).setValue( selectAll );
    });
  }

  addPlacement() {
    const cols = [];
    for( const [k,v] of Object.entries(this.columnPlacement.value) ){
      //const v = this.columnPlacement.value[k];
      if(v) {
        cols.push(k);
      }
    }
    this.isAddingPlacement = true;
    this._crud.addDropPlacement(this.schema, this.table, this.selectedStore.uniqueName, this.placementMethod, cols).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error ) {
          this._toast.exception( result );
        } else {
          if( this.placementMethod === 'ADD' ){
            this._toast.success( 'Added placement on store ' + this.selectedStore.uniqueName, 'Added placement' );
          } else if( this.placementMethod === 'MODIFY' ){
            this._toast.success( 'Modified placement on store ' + this.selectedStore.uniqueName, 'Modified placement' );
          }
          this.getPlacementsAndPartitions();
        }
        this.selectedStore = null;
      }, err => {
        this._toast.error( 'Could not ' + this.placementMethod.toLowerCase() + ' placement on store ' + this.selectedStore.uniqueName );
      }
    ).add(() => {
      this.isAddingPlacement = false;
      this.placementModal.hide();
    });
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
          this.getPlacementsAndPartitions();
        }
      }, err => {
        this._toast.error( 'Could not drop placement on store ' + store, 'Error' );
      }
    );
  }

  getPartitionTypes () {
    this._crud.getPartitionTypes().subscribe(
      res => {
        this.partitionTypes = <string[]>res;
      },
      err => {
        console.log(err);
      }
    );
  }

  /**
   * Whether the table is partitioned
   */
  isPartitioned () {
    if( !this.dataPlacements || !this.dataPlacements.stores ) {
      return false;
    }
    return this.dataPlacements.isPartitioned;
  }

  partitionTable () {
    if( this.partitioningRequest.method === 'NONE' ) {
      this._toast.warn( 'Please select a partitioning method.' );
      return;
    }
    const split = this.tableId.split('\.');
    this.partitioningRequest.schemaName = split[0];
    this.partitioningRequest.tableName = split[1];
    this._crud.partitionTable( this.partitioningRequest ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error ) {
          this._toast.exception(result);
          console.log(result.info.generatedQuery);
        } else {
          this._toast.success('Partitioned table');
          this.getPlacementsAndPartitions();
        }
      }, err => {
        this._toast.error(err);
      }
    );
  }

  mergePartitions () {
    const split = this.tableId.split('\.');
    const request = new PartitioningRequest( split[0], split[1] );
    this.isMergingPartitions = true;
    this._crud.mergePartitions( request ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( !result.error ) {
          this._toast.success( 'Merged partitions ' );
          this.getPlacementsAndPartitions();
        } else {
          this._toast.exception(result);
        }
      }, err => {
        this._toast.error('Could not merge partitions');
        console.log(err);
      }
    ).add( () => {
      this.isMergingPartitions = false;
    });
  }

  modifyPartitioning () {
    const partitions = [];
    for(let i = 0; i < this.partitionsToModify.length; i++) {
      if( this.partitionsToModify[i].selected ) {
        partitions.push(this.partitionsToModify[i].partitionName);
      }
    }
    const split = this.tableId.split('\.');
    const request = new ModifyPartitionRequest( split[0], split[1], partitions, this.selectedStore.uniqueName );
    this._crud.modifyPartitions( request ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( !result.error ) {
          this.partitioningModal.hide();
          this._toast.success('Modified partitions');
          this.getPlacementsAndPartitions();
          console.log(result.info.generatedQuery);
        } else {
          this._toast.exception(result);
          console.log(result.info.generatedQuery);
        }
      }, err => {
        this._toast.error('Could not modify the partitioning');
      }
    );
  }

  initPartitioningModal( store: Store ){
    this.partitionsToModify = [];
    for( let i = 0; i < this.dataPlacements.partitionNames.length; i++ ) {
      this.partitionsToModify.push({
        partitionName: this.dataPlacements.partitionNames[i],
        selected: store.partitionKeys.includes(i)
      });
    }
    this.selectedStore = store;
    this.partitioningModal.show();
  }

  clearPartitioningModal(){
    this.selectedStore = null;
  }

  selectAllPartitions ( select: boolean) {
    for( const p of this.partitionsToModify ) {
      p.selected = select;
    }
  }

  dropIndex(index: string, i) {
    if (this.confirmIndex !== i) {
      this.confirmIndex = i;
    } else {
      this._crud.dropIndex(new Index(this.schema, this.table, index, null, null, null)).subscribe(
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
    const newCols = [];
    for ( const [k,v] of Object.entries(this.newIndexCols)) {
      if(v) { newCols.push(k); }
    }
    if ( this.newIndexForm.controls['method'].valid && this.newIndexForm.controls['name'].errors && newCols.length > 0 ) {
      this.newIndexForm.controls['name'].setValue(this.proposedIndexName);
    }
    if (this.newIndexForm.valid && newCols.length > 0 && this.selectedStoreForIndex != null ) {
      const i = this.newIndexForm.value;
      const index = new Index( this.schema, this.table, i.name, this.selectedStoreForIndex.uniqueName, i.method, newCols );
      this.addingIndex = true;
      this._crud.createIndex(index).subscribe(
        res => {
          const result = <ResultSet>res;
          if (!result.error) {
            this.getIndexes();
            this.getGeneratedNames();
            this.newIndexForm.reset({name: '', method: ''});
            this.initNewIndexValues();
            this.newIndexCols = {};
            this.resultSet.header.forEach(( v ,k )=>{
              this.newIndexCols[v.name] = false;
            });
            this.indexSubmitted = false;
          } else {
            this._toast.exception(result, 'Could not create index:');
          }
        }, err => {
          console.log(err);
        }
      ).add(() => this.addingIndex = false);
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

  onTypeChange(){
    this.updateColumn.controls['defaultValue'].setValue(null);
  }

  onTypeChange2( col: DbColumn ){
    if( col.defaultValue !== null ) this.assignDefault( col, false );
    col.precision = null;
    col.scale = null;
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

  validatePartitionModification () {
    if( this.partitionsToModify ){
      for( const p of this.partitionsToModify ){
        if( p.selected ){
          return true;
        }
      }
    }
    return false;
  }

  titleCase ( name ) {
    return _.capitalize(name);
  }

}

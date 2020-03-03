import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {TableConfig} from './table-config';
import * as $ from 'jquery';
import {DeleteRequest, ExploreByExample, TableRequest, UpdateRequest} from '../../models/ui-request.model';
import {PaginationElement} from './models/pagination-element.model';
import {ResultSet} from './models/result-set.model';
import {SortDirection, SortState} from './models/sort-state.model';
import {ToastDuration, ToastService} from '../toast/toast.service';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../services/dbms-types.service';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() resultSet: ResultSet;
  @Input() config: TableConfig;
  @Input() tableId: string;
  @Input() loading?: boolean;
  chosenCol = {};
  e:ExploreByExample;

  pagination: PaginationElement[] = [];
  insertValues = new Map<string, any>();
  insertDirty = new Map<string, boolean>();//check if field has been edited (if yes, it is "dirty")
  updateValues = new Map<string, any>();
  sortStates = new Map<string, SortState>();
  filter = new Map<string, string>();
  editing = -1;//-1 if not editing any row, else the index of that row
  confirm = -1;

  constructor(
    private _crud: CrudService,
    private _toast: ToastService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _types: DbmsTypesService
  ) {}


  ngOnInit() {

    if(this.config.update){
      this.documentListener();
    }

    this.setPagination();

    if( this.config.create ) {
      this.buildInsertObject();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if( changes['resultSet'] ){
      this.setPagination();
      this.buildInsertObject();
    }
  }

  triggerEditing(i){
    if(this.config.update){
      this.updateValues.clear();
      this.resultSet.data[i].forEach((v, k) => {
        if( this.resultSet.header[k].dataType === 'bool' ){
          this.updateValues.set( this.resultSet.header[k].name, this.getBoolean(v) );
        }else{
          this.updateValues.set( this.resultSet.header[k].name, v);
        }
      });
      this.editing = i;
    }
  }

  // see https://stackoverflow.com/questions/52017809/how-to-convert-string-to-boolean-in-typescript-angular-4
  getBoolean ( value:any ):Boolean {
    switch(value){
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

  documentListener(){
    const self = this;
    $(document).on('click', function(e){
      if( $(e.target).parents('.editing').length === 0 ){
        self.editing = -1;
      }
    });
  }

  setPagination () {
    const activePage = this.resultSet.currentPage;
    const highestPage = this.resultSet.highestPage;
    this.pagination = [];
    if( highestPage < 2){
      return;
    }
    const neighbors = 1;//from active page, show n neighbors to the left and n neighbors to the right.
    this.pagination.push( new PaginationElement().withPage(this.tableId, Math.max(1, activePage-1)).withLabel('<'));
    if( activePage === 1){
      this.pagination.push( new PaginationElement().withPage(this.tableId, 1).setActive());
    } else {
      this.pagination.push( new PaginationElement().withPage(this.tableId, 1));
    }
    if ( activePage - neighbors > 2 ) {
      this.pagination.push( new PaginationElement().withLabel('..').setDisabled());

    }
    let counter = Math.max(2, activePage - neighbors);
    while( counter <= activePage + neighbors && counter <= highestPage) {
      if( counter === activePage ){
        this.pagination.push( new PaginationElement().withPage(this.tableId, counter).setActive());
      }else {
        this.pagination.push( new PaginationElement().withPage(this.tableId, counter));
      }
      counter ++;
    }
    counter--;
    if( counter < highestPage ){
      if( counter + neighbors < highestPage ){
        this.pagination.push( new PaginationElement().withLabel('..').setDisabled());
      }
      this.pagination.push( new PaginationElement().withPage(this.tableId, highestPage));
    }
    this.pagination.push( new PaginationElement().withPage(this.tableId, Math.min(highestPage, activePage+1)).withLabel('>'));

    return this.pagination;
  }

  buildInsertObject () {
    if( !this.config.create ){
      return;
    }
    this.insertValues.clear();
    this.insertDirty.clear();
    if(this.resultSet.header){
      this.resultSet.header.forEach( (g, idx) => {
        //set insertDirty
        if( ! g.nullable && g.dataType !== 'serial' && g.defaultValue === undefined ){
          //set dirty if not nullable, so it will be submitted, except if it has autoincrement (dataType 'serial') or a default value
          this.insertDirty.set( g.name, true );
        }
        else{
          this.insertDirty.set( g.name, false );
        }
        //set insertValues
        if( g.nullable ) { this.insertValues.set(g.name, null); }
        else{
          if ( this._types.isNumeric(( g.dataType ))) {
            this.insertValues.set(g.name, 0);
          } else if ( this._types.isBoolean( g.dataType )){
            this.insertValues.set(g.name, false);
          } else {
            this.insertValues.set(g.name, '');
          }
        }
      });
    }
  }

  inputChange( name:string, e ){
    this.insertValues.set(name, e);
    this.insertDirty.set(name, true);
  }

  insertRow () {
    const data = {};
    this.insertValues.forEach( (v, k) => {
      //only values with dirty state will be submitted. Columns that are not nullable are already set dirty
      if ( this.insertDirty.get(k) === true ) {
        data[k] = v;
      }
    });
    const out = { tableId: this.resultSet.table, data: data};
    this._crud.insertRow( JSON.stringify(out) ).subscribe(
        res => {
          const result = <ResultSet> res;
          if ( result.info.affectedRows === 1) {
            $('.insert-input').val('');
            this.insertValues.clear();
            this.buildInsertObject();
            this.getTable();
          } else if ( result.error ) {
            this._toast.warn('Could not insert the data: ' + result.error, 'insert error');
          }
        }, err => {
        this._toast.error('Could not insert the data.');
        console.log(err);
        }
    );
  }

  newUpdateValue( key, val ){
    this.updateValues.set( key, val );
  }

  updateRow () {
    const oldValues = new Map<string, string>();//previous values
    $('.editing').each(function(e){
      const oldVal = $(this).attr('data-before');
      const col = $(this).attr('data-col');
      if ( col !== undefined ) {
        oldValues.set( col, oldVal );
      }
    });
    const req = new UpdateRequest( this.resultSet.table, this.mapToObject(this.updateValues), this.mapToObject(oldValues) );
    this._crud.updateRow( req ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.info.affectedRows ) {
          this.getTable();
          let rows = ' rows';
          if(result.info.affectedRows === 1) rows = ' row';
          this._toast.success('Updated ' + result.info.affectedRows + rows, 'update', ToastDuration.SHORT);
        } else if ( result.error ){
          this._toast.warn('Could not update this row: ' + result.error);
        }
      }, err => {
        this._toast.error('Could not update the data.');
        console.log(err);
      }
    );
  }

  getTable () {
    const filterObj = this.mapToObject( this.filter );
    const sortState = {};
    this.resultSet.header.forEach( (h) => {
      this.sortStates.set(h.name, h.sort);
      sortState[h.name] = h.sort;
    });
    this._crud.getTable( new TableRequest( this.tableId, this.resultSet.currentPage, filterObj, sortState ) ).subscribe(
        res => {
          //this.resultSet = <ResultSet> res;
          const result = <ResultSet> res;
          this.resultSet.data = result.data;
          this.resultSet.highestPage = result.highestPage;
          //go to highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
          if( + this._route.snapshot.paramMap.get('page') > this.resultSet.highestPage ){
            this._router.navigate([ '/views/data-table/'+ this.tableId +'/'+this.resultSet.highestPage ]);
          }
          this.setPagination();
          this.editing = -1;
          if( result.type === 'TABLE') {
            this.config.create = true;
            this.config.update = true;
            this.config.delete = true;
          } else {
            this.config.create = false;
            this.config.update = false;
            this.config.delete = false;
          }
        }, err => {
        this._toast.error('Could not load the data.');
        console.log(err);
        }
    );
  }

  filterTable (e) {
    this.resultSet.currentPage = 1;
    if( e.keyCode === 27){ //esc
      $('.table-filter').val('');
      this.filter.clear();
      this.getTable();
      return;
    }
    this.filter.clear();
    const self = this;
    $('.table-filter').each(function() {
      const col = $(this).attr('data-col');
      const val = $(this).val();
      self.filter.set(col, val);
    });
   this.getTable();
  }

  paginate ( p: PaginationElement ) {
    this.resultSet.currentPage = p.page;
    this.getTable();
  }

  sortTable ( s: SortState ) {
    //todo primary ordering, secondary ordering
    if ( s.sorting === false ){
      s.sorting = true;
      s.direction = SortDirection.ASC;
    } else {
      if ( s.direction === SortDirection.ASC ) {
        s.direction = SortDirection.DESC;
      } else {
        s.direction = SortDirection.ASC;
        s.sorting = false;
      }
    }
    this.getTable();
  }

  deleteRow ( values: string[], i ) {
    if ( this.confirm !== i ){
      this.confirm = i;
      return;
    }
    const rowMap = new Map<string, string>();
    values.forEach( ( val, key ) => {
      rowMap.set( this.resultSet.header[key].name, val);
    });
    const row = this.mapToObject( rowMap );
    const request = new DeleteRequest( this.resultSet.table, row );
    this._crud.deleteRow( request ).subscribe(
        res => {
          const result = <ResultSet> res;
          if( result.info.affectedRows ) {
            this.getTable();
          }else {
            const result2 = <ResultSet> res;
            this._toast.warn('Could not delete this row: ' + result2.error);
          }
        }, err => {
        this._toast.error('Could not delete this row.');
        console.log(err);
        }
    );
  }

  mapToObject ( map:Map<any, any> ) {
    const obj = {};
    map.forEach( (v, k) => {
      obj[k] = v;
    });
    return obj;
  }

  sendChosenCols(){
    console.log('testing if new sending method is working');
    console.log(this.chosenCol);
    this.e = new ExploreByExample(this.chosenCol);
    console.log(this.e);
    this._crud.exploreByExample(this.e).subscribe(
            res => {
              console.log(res);
            }, err => {
              console.log(err);
            }
    );
  }

}

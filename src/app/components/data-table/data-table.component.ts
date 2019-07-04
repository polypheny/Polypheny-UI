import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {TableConfig} from './table-config';
import * as $ from 'jquery';
import {DeleteRequest, TableRequest, UpdateRequest} from '../../models/ui-request.model';
import {PaginationElement} from './models/pagination-element.model';
import {ResultSet} from './models/result-set.model';
import {SortDirection, SortState} from './models/sort-state.model';
import {ToastService} from '../toast/toast.service';
import {CrudService} from '../../services/crud.service';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() resultSet: ResultSet;
  @Input() config: TableConfig;
  @Input() tableId: string;

  pagination: PaginationElement[] = [];
  insertValues = new Map<string, any>();
  updateValues = new Map<string, any>();
  sortStates = new Map<string, SortState>();
  filter = new Map<string, string>();
  editing = -1;//-1 if not editing any row, else the index of that row
  confirm = -1;

  constructor(
    private _crud: CrudService,
    private _toast: ToastService
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
    this.insertValues.clear();
    if(this.resultSet.header){
      this.resultSet.header.forEach( (g, idx) => {
        if( g.nullable ) { this.insertValues.set(g.name, null); }
        else{
          switch (g.dataType) {
            case 'int4':
            case 'int8':
              this.insertValues.set(g.name, 0);
              break;
            case 'bool':
              this.insertValues.set(g.name, false);
            break;
            default:
              this.insertValues.set(g.name, '');
          }
        }
      });
    }
  }

  inputChange( name:string, e ){
    this.insertValues.set(name, e);
  }

  insertRow () {
    const data = this.mapToObject( this.insertValues );
    const out = { tableId: this.resultSet.table, data: data};
    this._crud.insertRow( JSON.stringify(out) ).subscribe(
        res => {
          const result = <ResultSet> res;
          if ( result.info.affectedRows === 1) {
            $('.insert-input').val('');
            this.insertValues.clear();
            this.buildInsertObject();
            this.getTable();
            this._toast.toast( 'success', 'Saved data', 5, 'bg-success' );
          } else if ( result.error ) {
            this._toast.toast( 'insert error', 'Could not insert the data: ' + result.error, 10, 'bg-warning' );
          }
        }, err => {
          this._toast.toast( 'server error', 'Could not insert the data.', 10, 'bg-danger' );
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
        if( result.info.affectedRows === 1 ) {
          this.getTable();
        } else if ( result.error ){
          this._toast.toast( 'error', 'Could not update this row: '+result.error, 10, 'bg-warning' );
        }
      }, err => {
        this._toast.toast( 'server error', 'Could not update the data.', 10, 'bg-danger' );
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
        this._toast.toast( 'server error', 'Could not load the data.', 10, 'bg-danger' );
          console.log(err);
        }
    );
  }

  filterTable (e) {
    //todo use websocket
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

  /**
   * put filter values from result in filter map
   */
  setFilter ( r: ResultSet ) {
    this.filter.clear();
    r.header.forEach( (val) => {
      this.filter.set( val.name, val.filter );
    });
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
          if( result.info.affectedRows === 1) {
            this.getTable();
            //todo if page is empty, go to highestPage
          }else {
            console.log(res);
            const result2 = <ResultSet> res;
            this._toast.toast( 'error', 'Could not delete this row: ' + result2.error, 10, 'bg-warning' );
          }
        }, err => {
        this._toast.toast( 'server error', 'Could not delete this row.', 10, 'bg-danger' );
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

}

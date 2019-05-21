import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {TableConfig} from './table-config';
import * as $ from 'jquery';
import {CrudService} from '../../services/crud.service';
import {PaginationElement} from './models/pagination-element.model';
import {ResultSet} from './models/result-set.model';
import {SortDirection, SortState} from './models/sort-state.model';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() resultSet: ResultSet;
  @Input() config?: TableConfig;
  @Input() tableId: string;

  pagination: PaginationElement[] = [];
  insertValues = new Map<string, any>();
  sortStates = new Map<string, SortState>();
  filter = new Map<string, string>();

  defaultConfig: TableConfig = {
    create: true,
    update: true,
    delete: true,
    sort: true,
    search: true
  };

  constructor( private _crud: CrudService ) {}


  ngOnInit() {
    this.setConfig();

    if(this.defaultConfig.update){
      this.documentListener();
    }

    this.setPagination();

    if( this.defaultConfig.create ) {
      this.buildInsertObject();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if( changes['resultSet'] ){
      this.setPagination();
    }
  }

  setConfig(){
    if(this.config){
      for (const prop in this.config) {
        if (this.defaultConfig.hasOwnProperty(prop)) {
          this.defaultConfig[prop] = this.config[prop];
        }
      }
    }
  }

  triggerEditing(d){
    if(this.defaultConfig.update){
      d.editing = true;
    }
  }

  documentListener(){
    const self = this;
    $(document).on('click', function(e){
      if(!$(e.target).hasClass('editing')){
        if(self.resultSet.data){
          for(const d of self.resultSet.data){
            //if ( d.editing ) d.editing = false;
          }
          // todo save changes
        }
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
    this.resultSet.header.forEach( (g, idx) => {
      this.insertValues.set(g.name, '');
    });
  }

  insertRow () {
    const data = {};
    this.insertValues.forEach(( v,k ) => {
      data[k.toString()] = v;
    });
    const out = { tableId: this.resultSet.table, data: data};
    this._crud.insertRow( JSON.stringify(out) ).subscribe(
        res => {
          if ( res === 1) {
            $('.insert-input').val('');
            this.insertValues.clear();
            this.buildInsertObject();
            this.getTable();
            //todo toast
          } else if ( res === 0) {
            //todo toast
          }
        }, err => {
          console.log(err);
        }
    );
  }

  getTable () {
    const filterObj = {};
    this.filter.forEach(( v,k ) => {
      filterObj[k.toString()] = v;
    });
    const sortState = {};
    this.resultSet.header.forEach( (h) => {
      this.sortStates.set(h.name, h.sort);
      sortState[h.name] = h.sort;
    });
    this._crud.getTable( this.tableId, this.resultSet.currentPage, filterObj, sortState ).subscribe(
        res => {
          this.resultSet = <ResultSet> res;
          this.setFilter( this.resultSet );
          this.setPagination();
        }, err => {
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

}

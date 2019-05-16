import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {TableConfig} from './table-config';
import * as $ from 'jquery';
import {ResultSet} from '../../services/crud.service';

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

  defaultConfig: TableConfig = {
    create: true,
    update: true,
    delete: true,
    sort: true,
    search: true
  };

  constructor() {}


  ngOnInit() {
    this.setConfig();

    if(this.defaultConfig.update){
      this.documentListener();
    }

    this.setPagination(this.resultSet.currentPage, this.resultSet.highestPage);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if( changes['resultSet'] ){
      this.setPagination(this.resultSet.currentPage, this.resultSet.highestPage);
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
            //d.editing = false;//todo
          }
          // todo save changes
        }
      }
    });
  }

  setPagination (activePage: number, highestPage: number) {
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

}

class PaginationElement {
  page: number;
  label: string;
  active = false;
  disabled = false;
  routerLink: string;

  withPage ( tableId:string, page:number ) {
    this.page = page;
    this.label = page.toString();
    this.routerLink = '/views/data-table/'+ tableId +'/'+page;//todo table id
    return this;
  }

  withLabel ( label:string ) {
    this.label = label;
    return this;
  }

  setActive() {
    this.active = true;
    return this;
  }

  setDisabled() {
    this.disabled = true;
    return this;
  }
}

import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TableConfig} from '../../components/data-table/table-config';
import {CrudService, ResultSet} from '../../services/crud.service';
import {LeftSidebarService, SidebarNode} from '../../components/left-sidebar/left-sidebar.service';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent implements OnInit {

  tableId = '';
  currentPage = 1;
  resultSet: ResultSet;
  tableConfig: TableConfig = {
    create: true,
    search: true,
    sort: true,
    update: true
  };

  constructor(
      private _route: ActivatedRoute,
      private _crud:CrudService,
      private _sidebar: LeftSidebarService) { }

  ngOnInit() {
    this.tableId = this._route.snapshot.paramMap.get('id');
    if( this._route.snapshot.paramMap.get('page') ){
      this.currentPage = +this._route.snapshot.paramMap.get('page');
    }else {
      this.currentPage = 1;
    }
    if( this.resultSet ) this.resultSet.currentPage = this.currentPage;

    this._crud.getSchema().subscribe(
        res => {
          const schema = <SidebarNode[]> res;
          this._sidebar.setNodes( schema );
        }, err => {
          console.log(err);
        }
    );

    //listen to parameter changes
    this._route.params.subscribe((params) => {
      this.tableId = params['id'];
      if( this._route.snapshot.paramMap.get('page') ){
        this.currentPage = +this._route.snapshot.paramMap.get('page');
      }else {
        this.currentPage = 1;
      }
      if( this.resultSet ) this.resultSet.currentPage = this.currentPage;

      if( this.tableId ) {
        this._crud.getTable( this.tableId, this.currentPage ).subscribe(
            res => {
              this.resultSet = <ResultSet> res;
            }, err => {
              console.log(err);
            }
        );
      }

    });

  }

}

import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TableConfig} from '../../components/data-table/table-config';
import {CrudService, TableRequest, UIRequest} from '../../services/crud.service';
import {LeftSidebarService, SidebarNode} from '../../components/left-sidebar/left-sidebar.service';
import {ResultSet} from '../../components/data-table/models/result-set.model';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent implements OnInit, OnDestroy {

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

    this._sidebar.open();

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
        const req: UIRequest  = new TableRequest( this.tableId, this.currentPage );
        this._crud.getTable( req ).subscribe(
            res => {
              this.resultSet = <ResultSet> res;
            }, err => {
              console.log(err);
            }
        );
      }

    });

  }

  ngOnDestroy() {
    this._sidebar.close();
  }

}

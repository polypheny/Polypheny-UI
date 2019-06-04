import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService, SidebarNode} from '../../components/left-sidebar/left-sidebar.service';
import {ColumnRequest, CrudService, SchemaRequest, DbColumn} from '../../services/crud.service';
import {ResultSet} from '../../components/data-table/models/result-set.model';

@Component({
  selector: 'app-edit-columns',
  templateUrl: './edit-columns.component.html',
  styleUrls: ['./edit-columns.component.scss']
})

export class EditColumnsComponent implements OnInit {

  tableId: string;
  resultSet: ResultSet;
  types: string[] = ['int8', 'int4', 'varchar', 'timestamptz', 'bool', 'text'];
  editColumn = -1;
  createColumn = { name: '', nullable: false, type:'text', maxLength: null};


  constructor(
    private _route: ActivatedRoute,
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService
  ) { }

  ngOnInit() {

    this.getTableId();

    this.getSchema();

    this.getColumns();

    this.documentListener();
  }

  getTableId () {
    this.tableId = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.tableId = params['id'];
      this.getColumns();
    });
  }

  getSchema () {
    this._crud.getSchema(  new SchemaRequest('/views/edit-columns/', false) ).subscribe(
      res => {
        const schema = <SidebarNode[]> res;
        this._leftSidebar.setNodes( schema );
      }, err => {
        console.log(err);
      }
    );
    this._leftSidebar.open();
  }

  getColumns () {
    if( this.tableId === undefined ) return;
    this._crud.getColumns( new ColumnRequest( this.tableId )).subscribe(
      res => {
        this.resultSet = <ResultSet> res;
      }, err => {
        console.log(err);
      }
    );
  }

  editCol( i:number ) {
    this.editColumn = i;
  }
  
  saveCol() {
    const oldColName = $('#colName').attr('data-before');
    const newColName = $('#colName').val();
    const oldNullable = $('#nullable').attr('data-before') === 'YES';
    const newNullable = $('#nullable').is(':checked');
    const oldType = $('#udt_name').attr('data-before');
    const newType = $('#udt_name').val();
    let oldMaxLength = $('#max-length').attr('data-before');
    if( oldMaxLength === undefined ) oldMaxLength = '';
    const newMaxLength = $('#max-length').val();

    const oldColumn = new DbColumn( oldColName, oldNullable, oldType, oldMaxLength );
    const newColumn = new DbColumn( newColName, newNullable, newType, newMaxLength );
    const req = new ColumnRequest( this.tableId, oldColumn, newColumn );
    console.log(req);
    this._crud.updateColumn( req ).subscribe(
      res => {
        console.log(res);
        this.editColumn = -1;
        this.getColumns();
      }, err => {
        console.log(err);
      }
    );
  }

  addColumn() {
    const newColumn = new DbColumn( this.createColumn.name, this.createColumn.nullable, this.createColumn.type, this.createColumn.maxLength );
    const req = new ColumnRequest( this.tableId, null, newColumn );
    console.log(req);
    this._crud.addColumn( req ).subscribe(
      res => {
        //const result = <ResultSet> res;
        console.log(res);
        this.getColumns();
      }, err => {
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

}

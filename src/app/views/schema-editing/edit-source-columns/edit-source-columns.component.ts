import {Component, OnDestroy, OnInit} from '@angular/core';
import {DbColumn, ResultSet} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ColumnRequest, TableRequest} from '../../../models/ui-request.model';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {ToastService} from '../../../components/toast/toast.service';

@Component({
  selector: 'app-edit-source-columns',
  templateUrl: './edit-source-columns.component.html',
  styleUrls: ['./edit-source-columns.component.scss']
})
export class EditSourceColumnsComponent implements OnInit, OnDestroy {

  resultSet: ResultSet;
  tableId: string;
  exportedColumns: Map<string, ResultSet> = new Map<string, ResultSet>();
  errorMsg: string;
  editingCol: string;

  constructor(
    private _crud: CrudService,
    private _route: ActivatedRoute,
    private _toast: ToastService
  ) { }

  ngOnInit(): void {
    this.tableId = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.tableId = params['id'];
      this.fetchCurrentColumns();
    });
    this.fetchCurrentColumns();
    this.fetchExportedColumns();
    const self = this;
    $(document).on('click', function(e){
      if( $(e.target).hasClass('rename') || $(e.target).hasClass('add-col') ) {
        return;
      }
      if( $(e.target).parents('.editing').length === 0 ){
        self.editingCol = undefined;
      }
    });
  }

  ngOnDestroy() {
    $(document).off('click');
  }

  fetchCurrentColumns() {
    this._crud.getDataSourceColumns( new TableRequest(this.tableId, null, null, null) ).subscribe(
      res => {
        this.resultSet = <ResultSet> res;
      }, err => {
        this.resultSet = new ResultSet(err);
      }
    );
  }

  fetchExportedColumns () {
    this._crud.getExportedColumns( new TableRequest(this.tableId, null, null, null) ).subscribe(
      res => {
        const tables = <ResultSet[]> res;
        for(const table of tables) {
          this.exportedColumns.set(table.table, table);
        }
      }, err => {
        this.errorMsg = 'Could not fetch exported columns';
        console.log(err);
      }
    );
  }

  getAddableColumns ():DbColumn[] {
    const cols: DbColumn[] = [];
    if(!this.exportedColumns || !this.tableId || !this.tableId.includes('.')){
      return [];
    }
    const tableName = this.tableId.split('.')[1];
    const table = this.exportedColumns.get(tableName);
    if(table){
      for( const col of table.header ){
        if(!this.resultSet.header.find(h => h.physicalName === col.name)){
          cols.push(col);
        }
      }
    }
    return cols;
  }

  dropColumn( col: DbColumn) {
    this._crud.dropColumn( new ColumnRequest( this.tableId, col ) ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error){
          this._toast.exception(result);
        } else{
          this._toast.success('The source column was dropped');
        }
        this.fetchCurrentColumns();
      }, err => {
        console.log(err);
      }
    );
  }

  renameCol ( oldCol: DbColumn, newName ) {
    const newCol = Object.assign({}, oldCol);
    newCol.name = newName;
    const request = new ColumnRequest( this.tableId, oldCol, newCol, true );
    this._crud.updateColumn( request ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error){
          this._toast.exception(result);
        } else{
          this._toast.success('Renamed column "' + oldCol.name + '" to "' + newName + '"');
        }
        this.editingCol = undefined;
        this.fetchCurrentColumns();
      }, err => {
        this._toast.error('Could not rename the column "' + oldCol.name + '" to "' + newName + '"');
        console.log(err);
      }
    );
  }

  addColumn( col: DbColumn, newName: string, newDefault: string ) {
    const request = new ColumnRequest( this.tableId, null, new DbColumn(col.physicalName, null, null, col.dataType, '', null, null, newDefault, -1, -1, newName));
    this._crud.addColumn(request).subscribe(
      res => {
        const result = <ResultSet> res;
        if( result.error){
          this._toast.exception(result);
        } else{
          this._toast.success('Added column "' + newName + '"');
        }
        this.fetchCurrentColumns();
        this.editingCol = undefined;
      }, err => {
        this._toast.error('Could not add the column "' + newName + '"');
        console.log(err);
      }
    );
  }

}

import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {SortState} from '../components/data-table/models/sort-state.model';

@Injectable({
  providedIn: 'root'
})
export class CrudService {

  constructor( private _http:HttpClient, private _settings:WebuiSettingsService ) { }

  path = '/home';
  httpUrl = this._settings.getConnection('crud.rest');
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  // rendering routerLinks from string might not be possible:7
  // https://www.intertech.com/Blog/angular-4-case-study-caution-about-binding-html-content-using-innerhtml/
  // workarounds:
  // https://stackoverflow.com/questions/44613069/angular4-routerlink-inside-innerhtml-turned-to-lowercase

  getTable( data: UIRequest ) {
    return this._http.post(`${this.httpUrl}/getTable`, JSON.stringify(data), this.httpOptions);
  }

  getSchema ( request: SchemaRequest ) {
    return this._http.post(`${this.httpUrl}/getSchemaTree`, request, this.httpOptions);
  }

  /**
   * @param data Json string with data to insert
   */
  //todo input: subclass of UIRequest
  insertRow ( data: string ) {
    return this._http.post(`${this.httpUrl}/insertRow`, data, this.httpOptions);
  }

  /**
   * @param query any query that should be executed on the server
   */
  anyQuery ( query: QueryRequest ) {
    return this._http.post(`${this.httpUrl}/anyQuery`, query, this.httpOptions);
  }

  /**
   * delete a row from a table
   * @param request UIRequest
   */
  deleteRow ( request: DeleteRequest) {
    return this._http.post(`${this.httpUrl}/deleteRow`, request, this.httpOptions);
  }

  /**
   * update a row from a table
   * @param request UpdateRequest
   */
  updateRow ( request: UpdateRequest ) {
    return this._http.post(`${this.httpUrl}/updateRow`, request, this.httpOptions);
  }

  /**
   * get the columns of a table
   */
  getColumns ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/getColumns`, columnRequest, this.httpOptions);
  }

  /**
   * Update a column of a Table
   */
  updateColumn ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/updateColumn`, columnRequest, this.httpOptions);
  }

  addColumn ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/addColumn`, columnRequest, this.httpOptions);
  }

  dropColumn ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/dropColumn`, columnRequest, this.httpOptions);
  }

  /**
   * Get list of tables of a schema to truncate/drop them
   */
  getTables ( tableRequest: EditTableRequest ) {
    return this._http.post(`${this.httpUrl}/getTables`, tableRequest, this.httpOptions);
  }

  /**
   * Drop or truncate a table
   */
  dropTruncateTable ( tableRequest: EditTableRequest ) {
    return this._http.post(`${this.httpUrl}/dropTruncateTable`, tableRequest, this.httpOptions);
  }

  /**
   * Create a new table
   */
  createTable ( tableRequest: EditTableRequest ) {
    return this._http.post(`${this.httpUrl}/createTable`, tableRequest, this.httpOptions);
  }

}

export class UIRequest {
  tableId: string;
  currentPage: number;
  data: Map<string, string>;
  filter: Map<string, string>;
  sortState: Map<string, SortState>;
  query: string;
  views: boolean;
}

export class TableRequest extends UIRequest {
  constructor ( tableId: string, currentPage: number, filter: any = null, sortState: any = null ) {
    super();
    this.tableId = tableId;
    this.currentPage = currentPage;
    this.filter = filter;
    this.sortState = sortState;
    return this;
  }
}

export class QueryRequest extends UIRequest {
  constructor ( query: string ) {
    super();
    this.query = query;
    return this;
  }
}

export class DeleteRequest extends UIRequest {
  constructor ( tableId: string, data: any) {
    super();
    this.tableId = tableId;
    this.data = data;
  }
}

/**
 * @param tableId name of the table
 * @param data the new values for the row that should be updated
 * @param filter the previous values of the row, to find the row that should be updated
 */
export class UpdateRequest extends UIRequest {
  constructor ( tableId: string, data: any, filter: any ){
    super();
    this.tableId = tableId;
    this.data = data;
    this.filter = filter;
  }
}

export class SchemaRequest extends UIRequest {
  routerLinkRoot: string;
  views: boolean;

  constructor( routerLinkRoot: string, views: boolean ) {
    super();
    this.routerLinkRoot = routerLinkRoot;
    this.views = views;
  }
}

export class ColumnRequest extends UIRequest {
  oldColumn: DbColumn;
  newColumn: DbColumn;
  constructor( tableId: string, oldColumn: DbColumn = null, newColumn: DbColumn = null ) {
    super();
    this.tableId = tableId;
    this.oldColumn = oldColumn;
    this.newColumn = newColumn;
  }
}

/**
 * Model for a column of a table
 */
export class DbColumn {
  name: string;
  primary: boolean;
  nullable: boolean;
  type: string;//varchar/int/etc
  maxLength: string;
  constructor( name:string, primary: boolean, nullable:boolean, type:string, maxLength:string ) {
    this.name = name;
    this.primary = primary;
    this.nullable = nullable;
    this.type = type;
    this.maxLength = maxLength;
  }
}

/**
 * Edit or create a Table
 * used for request where you want to truncate/drop a table
 * and when you want to create a new table
 */
export class EditTableRequest {
  schema: string;
  table: string;
  action: string;//truncate / drop
  columns: DbColumn[];
  constructor ( schema:string, table:string = null, action:string = null, columns:DbColumn[] = null) {
    this.schema = schema;
    this.table = table;
    this.action = action;
    this.columns = columns;
  }
  getAction () {
    return this.action;
  }
}

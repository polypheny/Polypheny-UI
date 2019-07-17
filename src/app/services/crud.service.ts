import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {Index} from '../components/data-table/models/result-set.model';
import {webSocket} from 'rxjs/webSocket';
import {
  UIRequest,
  SchemaRequest,
  EditTableRequest,
  ConstraintRequest,
  ColumnRequest,
  QueryRequest,
  DeleteRequest,
  UpdateRequest
} from '../models/ui-request.model';
import {ForeignKey} from '../views/uml/uml.model';

@Injectable({
  providedIn: 'root'
})
export class CrudService {

  constructor( private _http:HttpClient, private _settings:WebuiSettingsService ) {
    this.initWebSocket();
  }

  httpUrl = this._settings.getConnection('crud.rest');
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};
  private socket;

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

  /**
   * Get constraints of a table
   */
  getConstraints ( tableRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/getConstraints`, tableRequest, this.httpOptions);
  }

  /**
   * Drop a onstraint of a table
   */
  dropConstraint ( request: ConstraintRequest ) {
    return this._http.post(`${this.httpUrl}/dropConstraint`, request, this.httpOptions);
  }

  /**
   * Add a primary key to a table
   */
  addPrimaryKey ( request: ConstraintRequest ) {
    return this._http.post(`${this.httpUrl}/addPrimaryKey`, request, this.httpOptions);
  }

  /**
   * Get indexes of a table
   */
  getIndexes ( request: EditTableRequest ) {
    return this._http.post(`${this.httpUrl}/getIndexes`, request, this.httpOptions);
  }

  /**
   * Drop an index of a table
   */
  dropIndex( request: EditTableRequest ){
    return this._http.post(`${this.httpUrl}/dropIndex`, request, this.httpOptions);
  }

  /**
   * Create an index
   */
  createIndex ( index: Index ) {
    return this._http.post(`${this.httpUrl}/createIndex`, index, this.httpOptions);
  }

  /**
   * Get information for the Uml view, such as
   * the list of all tables of a schema with their columns
   * and a list of all the foreign keys of a schema
   */
  getUml ( request: EditTableRequest ) {
    return this._http.post(`${this.httpUrl}/getUml`, request, this.httpOptions);
  }

  /**
   * Initialize the websocket for the queryAnalyzer
   */
  private initWebSocket() {
    this.socket = webSocket(this._settings.getConnection('crud.socket'));
  }

  /*socketSend( msg: string ) {
    this.socket.next(msg);
  }*/

  onSocketEvent () {
    return this.socket;
  }

  /*closeSocket() {
    this.socket.complete();
  }*/

  getAnalyzerPage (analyzerId: string, analyzerPage: string ) {
    return this._http.post(`${this.httpUrl}/getAnalyzerPage`, [analyzerId, analyzerPage], this.httpOptions);
  }

  /**
   * Close a query analyzer when not needed anymore
   */
  closeAnalyzer (id: string ) {
    return this._http.post(`${this.httpUrl}/closeAnalyzer`, id, this.httpOptions);
  }

  /**
   * Add a foreign key (in the Uml view)
   */
  addForeignKey ( fk: ForeignKey ) {
    return this._http.post(`${this.httpUrl}/addForeignKey`, fk, this.httpOptions);
  }

  /**
   * Execute a relational algebra
   */
  executeRelAlg ( relAlg: any ) {
    return this._http.post(`${this.httpUrl}/executeRelAlg`, relAlg, this.httpOptions);
  }

}

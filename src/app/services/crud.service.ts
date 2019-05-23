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
  httpUrl = this._settings.get('settings.crud.rest');
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  // rendering routerLinks from string might not be possible:7
  // https://www.intertech.com/Blog/angular-4-case-study-caution-about-binding-html-content-using-innerhtml/
  // workarounds:
  // https://stackoverflow.com/questions/44613069/angular4-routerlink-inside-innerhtml-turned-to-lowercase

  getTable( data: UIRequest ) {
    return this._http.post(`${this.httpUrl}/getTable`, JSON.stringify(data), this.httpOptions);
  }

  getSchema () {
    return this._http.get(`${this.httpUrl}/getSchemaTree`, this.httpOptions);
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
  anyQuery ( query: UIRequest ) {
    return this._http.post(`${this.httpUrl}/anyQuery`, query, this.httpOptions);
  }

}

export class UIRequest {
  tableId: string;
  currentPage: number;
  data: Map<string, string>;
  filter: Map<string, string>;
  sortState: Map<string, SortState>;
  query: string;
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

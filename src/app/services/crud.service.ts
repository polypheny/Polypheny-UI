import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';

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

  getTable( tableId: string, currentPage: number, filter: any = null, sortState: any = null ) {
    const data = { tableId: tableId, currentPage: currentPage, filter: filter, sortState: sortState };
    return this._http.post(`${this.httpUrl}/getTable`, data, this.httpOptions);
  }

  getSchema () {
    return this._http.get(`${this.httpUrl}/getSchemaTree`, this.httpOptions);
  }

  /**
   * @param data Json string with data to insert
   */
  insertRow ( data: string ) {
    return this._http.post(`${this.httpUrl}/insertRow`, data, this.httpOptions);
  }

}

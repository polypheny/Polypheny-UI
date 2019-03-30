import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor( private _http:HttpClient ) { }

  httpUrl = 'http://localhost:8081';
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  getPage(pageId:number) {
    return this._http.post(`${this.httpUrl}/getPage`, pageId, this.httpOptions);
  }

}

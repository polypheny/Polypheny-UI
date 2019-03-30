import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor( private _http:HttpClient ) { }

  httpUrl = 'http://localhost:8081';
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  //todo websockets:
  //https://tutorialedge.net/typescript/angular/angular-websockets-tutorial/

  getPage(pageId:number) {
    return this._http.post(`${this.httpUrl}/getPage`, pageId, this.httpOptions);
  }

  saveChanges(data) {
    return this._http.post(`${this.httpUrl}/updateConfigs`, data, this.httpOptions);
  }

}

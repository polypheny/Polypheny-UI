import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';

@Injectable({
  providedIn: 'root'
})
export class HubService {

  httpUrl = this._settings.getConnection('crud.rest');
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  constructor( private _http:HttpClient, private _settings: WebuiSettingsService ) { }

  login( user: string, pw: string ){
    return this._http.post(`${this.httpUrl}/login`, {user: user, password: pw, action: 'login'});
  }

  logout(){
    this._http.post(`${this.httpUrl}/logout`, {secret: localStorage.getItem('hub.secret'), action: 'logout'}).subscribe();
    localStorage.setItem( 'hub.id', '' );
    localStorage.setItem( 'hub.user', '' );
    localStorage.setItem( 'hub.secret', '' );
  }

  setSecret( secret: string ){
    localStorage.setItem( 'hub.secret', secret );
  }

  getSecret(){
    return localStorage.getItem( 'hub.secret' );
  }

  setId( id: number ){
    localStorage.setItem( 'hub.id', String(id) );
  }

  getId(): number {
    return +localStorage.getItem( 'hub.id' );
  }

  getUsername(){
    return localStorage.getItem( 'hub.user' );
  }

  setUsername( user: string ){
    localStorage.setItem( 'hub.user', user );
  }

  checkLogin(){
    return this._http.post(`${this.httpUrl}/checkLogin`, {userId: this.getId(), secret: this.getSecret(), action: 'checkLogin'});
  }

  getUsers(){
    return this._http.post(`${this.httpUrl}/getUsers`, {userId: this.getId(), secret: this.getSecret(), action: 'getUsers'});
  }

  changePassword( oldPw, newPw1, newPw2 ){
    const body = {userId: this.getId(), secret: this.getSecret(), oldPw: oldPw, newPw1: newPw1, newPw2: newPw2, action: 'changePassword'};
    console.log(body);
    return this._http.post(`${this.httpUrl}/changePassword`, body);
  }

  deleteUser( deleteUser: number ){
    const body = {userId: this.getId(), secret: this.getSecret(), deleteUser: deleteUser, action: 'deleteUser'};
    console.log(body);
    return this._http.post(`${this.httpUrl}/deleteUser`, body);
  }

  createUser( userName: string, admin: string, email: string ){
    const body = {userId: this.getId(), secret: this.getSecret(), name: userName, admin: admin, email: email, action: 'createUser'};
    console.log(body);
    return this._http.post(`${this.httpUrl}/createUser`, body);
  }

  getDatasets(){
    return this._http.post(`${this.httpUrl}/getDatasets`, {userId: this.getId(), secret: this.getSecret(), action: 'getDatasets'});
  }

  editDataset( userId:number, name: string, pub:boolean ){
    return this._http.post(`${this.httpUrl}/editDataset`, {userId: userId, name: name, pub: pub, action: 'editDataset'});
  }

  uploadDataset( userId: number, secret: string, name: string, pub: boolean, dataset ){
    /*const formData = new FormData();
    formData.append( 'action', 'uploadDataset');
    formData.append( 'name', name );
    formData.append( 'pub', String(pub) );
    formData.append( 'dataset', dataset[0] );
    return this._http.post( `${this.httpUrl}/uploadDataset`,formData );// {headers: new HttpHeaders({'Content-Type': 'multipart/form-data'})}*/
    return this._http.post( `${this.httpUrl}/uploadDataset`, {action: 'uploadDataset', userId: userId, secret: secret, name: name, pub: pub, dataset: dataset } );
  }

  deleteDataset( userId: number, secret: string, dsId: number ){
    const data = {action: 'deleteDataset', userId: userId, secret: secret, datasetId: dsId };
    console.log(data);
    return this._http.post( `${this.httpUrl}/deleteDataset`, data );
  }

}

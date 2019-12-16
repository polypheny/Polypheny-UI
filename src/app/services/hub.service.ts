import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';

@Injectable({
  providedIn: 'root'
})
export class HubService {
x
  hubUrl = this._settings.getConnection('hub.url');
  //httpUrl = this._settings.getConnection('crud.rest');
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  constructor( private _http:HttpClient, private _settings: WebuiSettingsService ) { }

  login( user: string, pw: string ){
    const body ={username: user, password: pw, action: 'login'};
    return this._http.post(this.hubUrl, this.toFormData(body) );
  }

  logout(){
    const body = {userId: this.getId(), action: 'logout'};
    this._http.post(this.hubUrl, this.toFormData(body) ).subscribe( res => console.log(res) );
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
    const body = {userId: this.getId(), secret: this.getSecret(), action: 'checkLogin'};
    return this._http.post(this.hubUrl, this.toFormData(body) );
  }

  getUsers(){
    const body = {userId: this.getId(), secret: this.getSecret(), action: 'getUsers'};
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  changePassword( oldPw, newPw1, newPw2 ){
    const body = {userId: this.getId(), secret: this.getSecret(), oldPw: oldPw, newPw1: newPw1, newPw2: newPw2, action: 'changePassword'};
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  deleteUser( deleteUser: number ){
    const body = {userId: this.getId(), secret: this.getSecret(), deleteUser: deleteUser, action: 'deleteUser'};
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  createUser( userName: string, admin: string, email: string ){
    const body = {userId: this.getId(), secret: this.getSecret(), userName: userName, admin: admin, email: email, action: 'createUser'};
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  updateUser( userId: number, userName: string, pw: string, email: string, admin: boolean ){
    const body = {
      action: 'updateUser',
      adminId: this.getId(),
      secret: this.getSecret(),
      userId: userId,
      userName: userName,
      userPw: pw,
      userEmail: email,
      userIsAdmin: admin
    };
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  getDatasets(){
    const body = {userId: this.getId(), secret: this.getSecret(), action: 'getDatasets'};
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  editDataset( dsId:number, name: string, pub:boolean ){
    const body = {userId: this.getId(), secret: this.getSecret(), dsId: dsId, name: name, pub: pub, action: 'editDataset'};
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  uploadDataset( userId: number, secret: string, name: string, pub: boolean, dataset ){
    const formData = new FormData();
    formData.append( 'action', 'uploadDataset');
    formData.append( 'userId', String(userId ));
    formData.append( 'secret', secret );
    formData.append( 'name', name );
    formData.append( 'pub', String(pub) );
    formData.append( 'dataset', dataset[0] );
    return this._http.post( this.hubUrl, formData );
  }

  deleteDataset( dsId: number ){
    const body = {action: 'deleteDataset', userId: this.getId(), secret: this.getSecret(), datasetId: dsId };
    return this._http.post(this.hubUrl, this.toFormData(body));
  }

  toFormData( obj ){
    const formData = new FormData();
    for (const [k, v] of Object.entries(obj)) {
      formData.append(k,String(v));
    }
    return formData;
  }

}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebuiSettingsService {

  constructor() {
    if( localStorage.getItem('settings.config.rest') === null ) localStorage.setItem('settings.config.rest', 'http://localhost:8081');
    if( localStorage.getItem('settings.config.socket') === null ) localStorage.setItem('settings.config.socket', 'ws://localhost:8081/configWebSocket');
    if( localStorage.getItem('settings.information.rest') === null ) localStorage.setItem('settings.information.rest', 'http://localhost:8082');
    if( localStorage.getItem('settings.information.socket') === null ) localStorage.setItem('settings.information.socket', 'ws://localhost:8082/informationWebSocket');
    if( localStorage.getItem('settings.crud.rest') === null ) localStorage.setItem('settings.crud.rest', 'http://localhost:8083');
  }

  public get( key:string ){
    return localStorage.getItem( key );
  }

  public set( key:string, value:string ) {
    localStorage.setItem( key, value );
  }

  public reset(){
    localStorage.setItem('settings.config.rest', 'http://localhost:8081');
    localStorage.setItem('settings.config.socket', 'ws://localhost:8081/configWebSocket');
    localStorage.setItem('settings.information.rest', 'http://localhost:8082');
    localStorage.setItem('settings.information.socket', 'ws://localhost:8082/informationWebSocket');
    localStorage.setItem('settings.crud.rest', 'http://localhost:8083');
    location.reload();
  }

}

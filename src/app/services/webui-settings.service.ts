import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebuiSettingsService {

  connections = new Map<string, string>();
  settings = new Map<string, string>();
  settingsGR = new Map<string, string>();
  host: string;

  constructor() {

    this.host = location.hostname;

    if( localStorage.getItem('configServer.port') === null ) {
      localStorage.setItem('configServer.port', '8081');
    }
    if( localStorage.getItem('informationServer.port') === null ) {
      localStorage.setItem('informationServer.port', '8082');
    }
    if( localStorage.getItem('webUI.port') === null ) {
      localStorage.setItem('webUI.port', '8083');
    }
    if( localStorage.getItem('websocketGestureRecognition.ip:port') == null ) {
      localStorage.setItem('websocketGestureRecognition.ip:port', 'localhost:4999');
    }


    this.settings.set( 'configServer.port', localStorage.getItem('configServer.port'));
    this.settings.set( 'informationServer.port', localStorage.getItem('informationServer.port'));
    this.settings.set( 'webUI.port', localStorage.getItem('webUI.port'));
    this.settingsGR.set( 'websocketGestureRecognition.ip:port', localStorage.getItem('websocketGestureRecognition.ip:port'));

    this.connections.set( 'config.rest',
        'http://' + this.host + ':' + localStorage.getItem( 'configServer.port' ) );
    this.connections.set( 'config.socket',
        'ws://' + this.host + ':' + localStorage.getItem( 'configServer.port' ) + '/configWebSocket' );
    this.connections.set( 'information.rest',
        'http://' + this.host + ':' + localStorage.getItem( 'informationServer.port' ) );
    this.connections.set( 'information.socket',
        'ws://' + this.host + ':' + localStorage.getItem( 'informationServer.port' ) + '/informationWebSocket' );
    this.connections.set( 'crud.rest',
        'http://' + this.host + ':' + localStorage.getItem( 'webUI.port' ) );
    this.connections.set( 'crud.socket',
        'ws://' + this.host + ':' + localStorage.getItem( 'webUI.port' ) + '/queryAnalyzer' );
    this.connections.set('websocketGestureRecognition', 'ws://' + localStorage.getItem('websocketGestureRecognition.ip:port'))
  }

  public getConnection(key:string ){
    return this.connections.get( key );
  }

  public getSettings () {
    return this.settings;
  }


  public setSetting ( key:string, val:string ) {
    this.settings.set( key, val );
    localStorage.setItem( key, val );
    console.log(key);
    console.log(val);
  }

  public getSettingsGR(){
    return this.settingsGR;
  }

  public setSettingGR ( key:string, val:string ) {
    this.settingsGR.set( key, val );
    localStorage.setItem( key, val );
    console.log(key);
    console.log(val);
  }

  public reset(){
    localStorage.setItem('configServer.port', '8081');
    localStorage.setItem('informationServer.port', '8082');
    localStorage.setItem('webUI.port', '8083');
    location.reload();
  }
}

import { Component, OnInit } from '@angular/core';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-right-sidebar',
  templateUrl: './right-sidebar.component.html',
  styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit {

  constructor( private _settings: WebuiSettingsService ) { }

  config_rest = this._settings.get('settings.config.rest');
  config_socket = this._settings.get('settings.config.socket');
  info_rest = this._settings.get('settings.information.rest');
  info_socket = this._settings.get('settings.information.socket');

  form = new FormGroup({
    configRest: new FormControl(this._settings.get('settings.config.rest')),
    configSocket: new FormControl(this._settings.get('settings.config.socket')),
    infoRest: new FormControl(this._settings.get('settings.information.rest')),
    infoSocket: new FormControl(this._settings.get('settings.information.socket'))
  });

  ngOnInit() {
  }

  saveSettings () {
    this._settings.set('settings.config.rest', this.form.value.configRest);
    this._settings.set('settings.config.socket', this.form.value.configSocket);
    this._settings.set('settings.information.rest', this.form.value.infoRest);
    this._settings.set('settings.information.socket', this.form.value.infoSocket);
    location.reload();
  }

  resetSettings() {
    this._settings.reset();
    return false;
  }

}

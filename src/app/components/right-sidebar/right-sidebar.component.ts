import { Component, OnInit, Output, EventEmitter, HostListener } from '@angular/core';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {FormControl, FormGroup} from '@angular/forms';
import {SettingsToRelationalalgebraService} from "../../services/settings-to-relationalalgebra.service";
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-right-sidebar',
  templateUrl: './right-sidebar.component.html',
  styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit {

  settings = this._settings.getSettings();
  form: FormGroup;

  settingsGR = this._settings.getSettingsGR();
  formGR: FormGroup;
  public buttonName: string = 'connect';


  constructor(
      private _settings: WebuiSettingsService,
      private _sToRa:SettingsToRelationalalgebraService
  ) {
    const controls = {};
    this.settings.forEach((val, key) => {
      controls[key] = new FormControl(val);
    });
    this.form = new FormGroup(controls);

    const controlsGR = {};
    this.settingsGR.forEach((val, key) => {
      controlsGR[key] = new FormControl(val);
    });
    this.formGR = new FormGroup(controlsGR);

  }

  ngOnInit() {  }

  saveSettings () {
    console.log(this.form.value);
    this.settings.forEach( (val, key) => {
      this._settings.setSetting( key, this.form.value[key] );
    });
    location.reload();
  }

  resetSettings() {
    this._settings.reset();
    return false;
  }

  saveSettingsGR () {
    console.log(this.formGR.value);
    this.settingsGR.forEach( (val, key) => {
      this._settings.setSettingGR( key, this.formGR.value[key] );
    });
    location.reload();
  }

  public connectToRA(): void {
    if(this.buttonName == 'connect'){
      this.buttonName = 'disconnect';
    } else {
      this.buttonName = 'connect';
    }
    this._sToRa.toggle();
    }
 }

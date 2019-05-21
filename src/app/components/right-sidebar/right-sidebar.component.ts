import { Component, OnInit } from '@angular/core';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-right-sidebar',
  templateUrl: './right-sidebar.component.html',
  styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit {

  settings = this._settings.getSettings();
  form: FormGroup;

  constructor( private _settings: WebuiSettingsService ) {
    const controls = {};
    this.settings.forEach( (val, key) => {
      controls[key] = new FormControl( val );
    });
    this.form = new FormGroup( controls );
  }

  ngOnInit() {
  }

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

}

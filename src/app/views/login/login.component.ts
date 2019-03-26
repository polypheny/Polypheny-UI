import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {Router} from '@angular/router';
import * as $ from 'jquery';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss']
})
export class LoginComponent implements OnInit{
  form: FormGroup;
  formObj;
  history = [
    {server: '10.100.20.30', port: 4000},
    {server: '10.100.20.40', port: 4003},
    {server: '10.100.20.50', port: 4050}
  ];
  favorites = [
    {server: '10.200.20.30', port: 5000},
    {server: '10.200.20.40', port: 5003},
    {server: '10.200.20.50', port: 5050}
  ];
  submitted = false;

  loginModel: LoginModel = new LoginModel('10.100.1.2', 123);

  constructor(private _router: Router) {}

  ngOnInit() {

    this.formObj = [
      {key: 'server', value: '', validation: Validators.required},
      {key: 'port', value: '', validation: Validators.required}
    ];

    const f = [];
    const formGroup = {};
    for(let i of this.formObj){
      formGroup[i.key] = new FormControl(i.value || '', i.validation);
    }
    this.form = new FormGroup(formGroup);
  }
  
  submit(form) {
    this.submitted = true;
    if(form.valid) {
      this._router.navigateByUrl('/global');
    }
  }
  
  applyHistory(h){
    this.loginModel.server = h.server;
    this.loginModel.port = h.port;
  }

  testConnection() {
    // todo
  }

  saveNewFavorite(form) {
    this.favorites.push({server: form.controls.server.value, port: form.controls.port.value});
  }

  deleteFavorite(){
    // todo
  }
}

export class LoginModel {
  constructor(public server: string, public port: number) {}
}

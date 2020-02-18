import {Component, OnDestroy, OnInit} from '@angular/core';
import {ConfigService} from '../../../services/config.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {KeyValue} from '@angular/common';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {ToastDuration, ToastService} from '../../../components/toast/toast.service';

@Component({
  selector: 'app-form-generator',
  templateUrl: './form-generator.component.html',
  styleUrls: ['./form-generator.component.scss']
})
export class FormGeneratorComponent implements OnInit, OnDestroy {

  formObj: JavaUiPage;
  submitted = false;
  form: FormGroup;
  //toasts:Toast[] = [];
  pageId = '';
  pageNotFound = false;
  pageList;//wenn man nicht auf einer gewissen Seite ist und alle Pages als links aufgelisted werden sollen.
  serverError;//wenn der Server nicht antwortet
  switchColors = ['switch-primary', 'switch-success', 'switch-warning', 'switch-danger'];

  constructor(
    private _config:ConfigService,
    private _route:ActivatedRoute,
    private _sidebar:LeftSidebarService,
    private _breadcrumb:BreadcrumbService,
    private _toast: ToastService
  ) {

    this.pageId = this._route.snapshot.paramMap.get('page') || '';

    //this.loadPage();//is already called by ngOnInit() -> onHashChange()
    _sidebar.listConfigManagerPages();
  }

  ngOnInit() {
    this.onHashChange();
    this.initWebSocket();
    this._breadcrumb.setBreadcrumbs( [new BreadcrumbItem('Config')] );
    this._sidebar.open();
  }

  ngOnDestroy() {
    //this._config.closeSocket();
    this._breadcrumb.hide();
    this._sidebar.close();
  }

  private onHashChange() {
    this._route.params.subscribe(params => {
      this.pageId = params['page'];
      this.loadPage();
      this.submitted = false;
    });
  }

  private initWebSocket() {
    //this._config.socketSend('hello world');
    //todo only update config if not ng-dirty. Test with string
    this._config.onSocketEvent().subscribe(msg => {
      const update = <JavaUiConfig>msg;
      if(this.formObj && this.formObj.groups[update.webUiGroup] && this.formObj.groups[update.webUiGroup].configs[update.key]) {
        const c = this.formObj.groups[update.webUiGroup].configs[update.key];
        if(this.form.controls[c.key].dirty === false){
          c.value = update.value;
        }else {//has been edited
          if(this.form.controls[c.key].value !== update.value){
            this._toast.warn(
              'The setting with id ' + c.key + ' has been changed to the new value "' + update.value + '" by the server. If you save, these changes will be overwritten.',
              'incoming change', ToastDuration.INFINITE);
          }else{
            c.value = update.value;
          }
        }
        //console.log('updating from Websocket:'+JSON.stringify(update));
      } else{
        //console.log('could not update from WebSocket');
      }
    }, err => {
      console.log(err);
    });
  }

  private loadPage () {
    if(!this.pageId){
      this._config.getPageList().subscribe(
        res => {
          this.pageList = res;
          this.serverError = null;
          this.pageNotFound = false;
        }, err => {
          this.serverError = err;
      }
      );
    }else {
      this._config.getPage(this.pageId).subscribe(
        res => {
          if(res == null){
            this.onPageNotFound();
            return;
          }

          this.formObj = <JavaUiPage> <unknown> res;
          this._breadcrumb.setBreadcrumbs( [new BreadcrumbItem( 'Config', '/views/config/' ),
            new BreadcrumbItem( this.formObj.title.toString())] );

          this.buildFormGroup();

          this.pageNotFound = false;
          this.serverError = null;
        },
        err => {
          this.serverError = err;
        }
      );
    }
  }

  private buildFormGroup () {
    const formGroup = {};

    // https://juristr.com/blog/2017/10/demystify-dynamic-angular-forms/
    for(const gKey of Object.keys(this.formObj.groups)){
      for ( const cKey of Object.keys(this.formObj.groups[gKey].configs)) {
        if(this.formObj.groups[gKey].configs[cKey].webUiFormType === 'BOOLEAN' ){
          formGroup[cKey] = new FormControl(
            //this.parseBoolean(this.formObj.groups[gKey].configs[cKey].value) || false,
            this.formObj.groups[gKey].configs[cKey].value || false,
            this.mapValidators(this.formObj.groups[gKey].configs[cKey]));//JSON.parse to convert "true" to true and "false" to false
        }
        else {
          formGroup[cKey] = new FormControl(
            this.formObj.groups[gKey].configs[cKey].value || '',
            this.mapValidators(this.formObj.groups[gKey].configs[cKey]));
        }
      }
    }
    this.form = new FormGroup(formGroup);
  }

  /** order groups within a page.
   * groups with lower order value are rendered first
   */
  private orderGroups ( a: KeyValue<string, any>, b: KeyValue<string, any>) {
    let out = 0;
    if ( a.value.order !== 0 && b.value.order === 0 ) { out = -1; }
    else if ( a.value.order === 0 && b.value.order !== 0 ) { out = 1; }
    else if ( a.value.order > b.value.order ) { out = 1; }
    else if ( a.value.order < b.value.order ) { out = -1; }
    return out;
  }

  /** order configs within a group.
   * configs with lower webUiOrder value are rendered first
   */
  private orderConfigs ( a: KeyValue<string, any>, b: KeyValue<string, any>) {
    let out = 0;
    if ( a.value.webUiOrder > b.value.webUiOrder ) { out = 1; }
    else if ( a.value.webUiOrder < b.value.webUiOrder ) { out = -1; }
    else if ( a.value.webUiOrder != null && b.value.webUiOrder == null ) { out = -1; }
    else if ( a.value.webUiOrder == null && b.value.webUiOrder != null ) { out = 1; }
    return out;
  }

  private onPageNotFound(){
    this.pageNotFound = true;
    this.serverError = null;
    this._config.getPageList().subscribe(
      res => {this.pageList = res;},
      err => {this.serverError = err;}
    );
  }

  private mapValidators(config) {
    const formValidators = [];
    const validators = config.webUiValidators;

    if(validators) {
      for(const validation of Object.values(validators)) {
        /*if(validation === 'REQUIRED') {
          formValidators.push(Validators.required);
        }*/ if(validation === 'EMAIL') {
          formValidators.push(Validators.email);
        }
      }
    }
    if(config.configType !== 'ConfigBoolean'){
      formValidators.push( Validators.required );//by default, but not for checkboxes
    }
    return formValidators;
  }


  inputValidation(key){
    if(this.submitted && this.form.controls[key].valid && this.form.controls[key].dirty ){
      return {'is-valid':true};
    }else if(this.submitted && !this.form.controls[key].valid) {
      return {'is-invalid': true };
    }
  }

  onSubmit(form, e) {
    this.submitted = true;
    //console.log(this.form);
    if(this.form.valid){
      //todo only send ng-dirty..
      this._config.saveChanges(this.form.value).subscribe(res => {
        //console.log(res);
        interface Feedback { success?:number; warning?:string; }
        const f: Feedback = <Feedback> res;
        //console.log(f);
        if( f.success ){
          this._toast.success('Saved changes.', null, ToastDuration.SHORT);
        } else {
          this._toast.warn(f.warning, null, ToastDuration.INFINITE);
        }
        this.form.markAsPristine();
      }, err=>{
        console.log(err);
        this._toast.error('an error occurred on the server');
      });
    } else {
      this._toast.warn('Changes could not be saved. Please check invalid input.', 'invalid input', ToastDuration.INFINITE);
    }
  }

  getSwitchColor (key: number) {
    return this.switchColors[key%4];
  }

}


export interface JavaUiPage {
  id: number;
  title: String;
  description: String;
  groups: Map<string, JavaUiGroup>;
}
export interface JavaUiGroup {
  id: number;
  pageId: number;
  title: String;
  description: String;
  configs: Map<string,JavaUiConfig>;
}
export interface JavaUiConfig {
  key: String;
  value: any;
  requiresRestart: boolean;
  webUiFormType: String;
  webUiGroup: string;
  webUiValidators: String[];
}

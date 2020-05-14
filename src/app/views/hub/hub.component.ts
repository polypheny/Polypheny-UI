import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {HubService} from '../../services/hub.service';
import {HubResult} from './hub.model';
import {ModalDirective} from 'ngx-bootstrap';
import {AbstractControl, FormControl, FormGroup, Validators} from '@angular/forms';
import {ToastService} from '../../components/toast/toast.service';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {CrudService} from '../../services/crud.service';
import {SchemaRequest} from '../../models/ui-request.model';
import {SidebarNode} from '../../models/sidebar-node.model';
import {Store} from '../stores/store.model';
import {HttpEventType} from '@angular/common/http';
import {Status} from '../../components/data-table/models/result-set.model';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.scss']
})
export class HubComponent implements OnInit, OnDestroy {

  private subscriptions = new Subscription();
  subpage: string;
  result: HubResult;
  datasets: HubResult;
  users: HubResult;

  //login
  loggedIn = 0;
  loginError;
  loginSubmitted;
  loginForm = new FormGroup({
    user: new FormControl( '', Validators.required ),
    pw: new FormControl( '', Validators.required )
  });

  changePwSubmitted = false;
  changePwForm = new FormGroup({
    oldPw: new FormControl('', Validators.required),
    newPw1: new FormControl('', Validators.required),
    newPw2: new FormControl('', Validators.required)
  }, { validators: HubComponent.equalPasswords });

  //editDataset
  editDsId: number;
  editDsName: string;
  editDsPublic = true;
  deleteDsConfirm;

  //uploadDataset
  newDsForm = new FormGroup({
    name: new FormControl( '', Validators.required ),
    pub: new FormControl( true ),
    dataset: new FormControl( null, [Validators.required, Validators.pattern(/\.zip$/)] ) // , requiredFileType('zip')
  });
  newDsFormSubmitted = false;
  fileToUpload;
  uploadProgress = 0;

  //download/import dataset
  downloadPath: string;
  schemas: SidebarNode[];
  importDsForm = new FormGroup({
    schema: new FormControl('', Validators.required),
    store: new FormControl('', Validators.required),
    url: new FormControl('', Validators.required),
    createPrimaryKeys: new FormControl(true, Validators.required),
    addDefaultValue: new FormControl(true, Validators.required)
  });
  importDsFormSubmitted = false;
  importProgress = -1;
  availableStores: Store[];

  //delete user
  deleteUserConfirm = -1;
  newUserForm = new FormGroup({
    name: new FormControl( '', Validators.required ),
    email: new FormControl( '', [Validators.required, Validators.email] ),
    admin: new FormControl( false )
  });
  //new user
  newUserFormSubmitted = false;
  //edit user
  editUserForm = new FormGroup({
    id: new FormControl(null, Validators.required),
    name: new FormControl( '', Validators.required ),
    password: new FormControl(null),
    email: new FormControl( '', [Validators.required, Validators.email] ),
    admin: new FormControl( false )
  });
  editUserSubmitted = false;

  @ViewChild('loginModal', {static: false}) public loginModal: ModalDirective;
  @ViewChild('editDatasetModal', {static: false}) public editDatasetModal: ModalDirective;
  @ViewChild('downloadDataModal', {static: false}) public downloadDataModal: ModalDirective;
  @ViewChild('editUserModal', {static: false}) public editUserModal: ModalDirective;
  @ViewChild('createUserModal', {static: false}) public createUserModal: ModalDirective;

  constructor(
    private _route: ActivatedRoute,
    private _hub: HubService,
    private _toast: ToastService,
    private _settings: WebuiSettingsService,
    private _crud: CrudService
  ) { }

  static equalPasswords (form: AbstractControl ){
    return form.get('newPw1').value === form.get('newPw2').value ? null : {equals: true};
  }

  ngOnInit() {
    this.subpage = this._route.snapshot.paramMap.get('sub');
    const sub1 = this._route.params.subscribe(params => {
      this.subpage = params['sub'];
      this.refreshContent();
    });
    this.subscriptions.add(sub1);
    this.refreshContent();
    this.checkLogin();
    this.getStores();
    this.initWebsocket();
    const sub2 = this._crud.onReconnection().subscribe(b => {
      if(b) this.getStores();
    });
    this.subscriptions.add(sub2);
  }

  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }

  login(){
    this.loginSubmitted = true;
    if( ! this.loginForm.valid ) return;
    const user = this.loginForm.controls['user'].value;
    const pw = this.loginForm.controls['pw'].value;
    this._hub.login( user, pw ).subscribe(
      res => {
        const result = <HubResult> res;
        if( result.error ){
          this.loggedIn = 0;
          this.loginError = result.error;
        } else {
          this.loggedIn = result.loginStatus;
          this.loginError = null;
          this.loginModal.hide();
          this._hub.setId( result.id );
          this._hub.setUsername( result.user );
          this._hub.setSecret( result.secret );
          this.loginSubmitted = false;
          this.refreshContent();
        }
      }, err => {
        this.loggedIn = 0;
        console.log(err);
      });
  }

  logout(){
    this._hub.logout();
    this.loggedIn = 0;
    this.refreshContent();
  }

  checkLogin(){
    this._hub.checkLogin().subscribe(
      res => {
        this.loggedIn = <number> res;
      }, err => {
        this.loggedIn = 0;
    });
  }

  getUsers(){
    this._hub.getUsers().subscribe(
      res => {
        this.users = <HubResult> res;
      }, err => {
        console.log('Could not retrieve users');
        console.log(err);
      }
    );
  }

  changePassword () {
    this.changePwSubmitted = true;
    if( this.changePwForm.valid ) {
      this._hub.changePassword( this.changePwForm.value['oldPw'], this.changePwForm.value['newPw1'], this.changePwForm.value['newPw2'] ).subscribe(
        res => {
          const result = <HubResult> res;
          if(result.error){
            this._toast.warn(result.error);
          }else{
            this._toast.success(result.message, 'Password changed');
            this.changePwSubmitted = false;
            this.changePwForm.reset();
          }
        }, err => {
          this._toast.error('Unknown server error');
        }
      );
    }
  }

  deleteUser( id: number ){
    if( this.deleteUserConfirm !== id ){
      this.deleteUserConfirm = id;
      return;
    }
    this._hub.deleteUser(id).subscribe(
      res => {
        const result = <HubResult> res;
        if( result.error ){
          this._toast.warn('Could not delete user: ' + result.error);
        }else{
          this._toast.success('The user was deleted.');
          this.getUsers();
        }
      }, err => {
        this._toast.error('Could not delete user');
      }
    );
  }

  createUser(){
    this.newUserFormSubmitted = true;
    if(this.newUserForm.valid){
      this._hub.createUser( this.newUserForm.controls['name'].value, this.newUserForm.controls['admin'].value, this.newUserForm.controls['email'].value ).subscribe(
        res => {
          const result = <HubResult> res;
          if( result.error ){
            this._toast.warn('Could not create user: ' + result.error);
          }else{
            this._toast.success(result.message);
            this.getUsers();
            this.newUserForm.reset({admin:false});
            this.newUserFormSubmitted = false;
            this.createUserModal.hide();
          }
        }, err => {
          this._toast.error('Could not create user');
          console.log(err);
        }
      );
    }
  }

  newUserValidation( key ){
    if(!this.newUserFormSubmitted) return;
    return this.newUserForm.controls[key].valid ? 'is-valid' : 'is-invalid';
  }

  getValidation( f: FormGroup, c: string ){
    if( this.loginSubmitted ) {
      return f.controls[c].valid ? 'is-valid' : 'is-invalid';
    }
    return '';
  }

  initEditUserModal( user ){
    this.editUserModal.show();
    this.editUserForm.controls['id'].setValue(+user[0]);
    this.editUserForm.controls['name'].setValue(user[1]);
    this.editUserForm.controls['email'].setValue(user[2]);
    this.editUserForm.controls['admin'].setValue(Boolean(+user[3]));
  }

  resetEditUserModal(){
    this.editUserForm.reset();
    this.editUserSubmitted = false;
  }

  resetNewUserModal(){
    this.newUserForm.reset();
    this.newUserFormSubmitted = false;
  }

  editUser(){
    this.editUserSubmitted = true;
    if( this.editUserForm.valid ){
      const val = this.editUserForm.value;
      this._hub.updateUser( val.id, val.name, val.password, val.email, val.admin ).subscribe(
        res => {
          const result = <HubResult> res;
          if( result.error ){
            this._toast.error('Could not update user: ' + result.error);
          }else{
            this._toast.success('The user was updated.');
            this.getUsers();
            this.editUserModal.hide();
          }
        }, err => {
          this._toast.error('Could not update user');
          console.log(err);
        }
      );
    }
  }

  editUserValidation( key ){
    if(!this.editUserSubmitted) return;
    return this.editUserForm.controls[key].valid ? 'is-valid' : 'is-invalid';
  }

  getStores(){
    this._crud.getStores().subscribe(
      res => {
        this.availableStores = (<Store[]> res).filter( (s) => !s.dataReadOnly || !s.schemaReadOnly );
      }, err => {
        console.log(err);
      }
    );
  }

  getDatasets () {
    this._hub.getDatasets().subscribe(
      res => {
        this.datasets = <HubResult> res;
      }, err => {
        console.log('Could not retrieve datasets');
        console.log(err);
      });
  }

  refreshContent(){
    switch ( this.subpage ) {
      case 'configuration':
        break;
      case 'manage':
        this.getUsers();
        break;
      default:
        this.getDatasets();
        break;
    }
  }

  getPwValidation( key: string ){
    if(!this.changePwSubmitted) return;
    if( key === 'oldPw'){
      return this.changePwForm.controls[key].valid ? 'is-valid' : 'is-invalid';
    } else{
      if( this.changePwForm.errors && this.changePwForm.errors['equals']){
        return 'is-invalid';
      }else {
        return this.changePwForm.controls[key].valid ? 'is-valid' : 'is-invalid';
      }
    }

  }

  resetLoginModal(){
    this.loginError = null;
    this.loginForm.reset();
    this.loginSubmitted = false;
  }

  initEditDataset( key: number ){
    this.editDatasetModal.show();
    this.editDsName = this.datasets.data[key][0];
    this.editDsPublic = Boolean(+this.datasets.data[key][2]).valueOf();
    this.editDsId = +this.datasets.data[key][3];
  }

  resetEditDataset(){
    this.editDsName = undefined;
    this.editDsPublic = undefined;
    this.editDsId = undefined;
  }

  editDataset(){
    this._hub.editDataset( this.editDsId, this.editDsName, this.editDsPublic ).subscribe(
      res => {
        this.editDatasetModal.hide();
        this.getDatasets();
      }, err => {
        this._toast.error('Could not update dataset');
        console.log(err);
      }
    );
  }

  newDsFormSubmit(){
    this.newDsFormSubmitted = true;

    if(this.newDsForm.valid){
      this._hub.uploadDataset( this._hub.getId(), this._hub.getSecret(), this.newDsForm.controls['name'].value, this.newDsForm.controls['pub'].value, this.fileToUpload ).subscribe(
        res => {
          //see https://www.techiediaries.com/angular-file-upload-progress-bar/
          if( res.type && res.type === HttpEventType.UploadProgress ){
            this.uploadProgress = Math.round(100 * res.loaded / res.total);
            console.log(this.uploadProgress);
          } else if( res.type === HttpEventType.Response ){
            const result = <HubResult> res.body;
            if( result.error ){
              this._toast.warn('Could not upload dataset: ' + result.error);
              this.uploadProgress = 0;
            } else {
              this._toast.success(result.message, 'uploaded');
              this.getDatasets();
              this.newDsForm.reset();
              this.newDsFormSubmitted = false;
              this.fileToUpload = undefined;
              this.uploadProgress = 0;
            }
          }
        }, err => {
          this._toast.error('Could not upload dataset');
          console.log(err);
        }
      );
    }
  }



  canDeleteAndUpdate( dsId: number ): boolean{
    return this.loggedIn === 2 || dsId === this._hub.getId();
  }

  deleteDataset( dsId: number ){
    if( this.deleteDsConfirm !== dsId ){
      this.deleteDsConfirm = dsId;
      return;
    }
    this._hub.deleteDataset( dsId ).subscribe(
      res => {
        const result = <HubResult> res;
        this.deleteDsConfirm = undefined;
        if( result.error ){
          this._toast.warn('Could not delete dataset: ' + result.error);
        } else {
          // this._toast.success( result.message, 'deleted' );
          this.getDatasets();
        }
      }, err => {
        this.deleteDsConfirm = undefined;
        this._toast.error('Could not delete dataset');
      }
    );
  }

  newDsFormValidation( key: string ){
    if(!this.newDsFormSubmitted) return;
    return this.newDsForm.controls[key].valid ? 'is-valid' : 'is-invalid';
  }

  setFileToUpload( f: FileList ){
    if(f.length > 0 ){
      this.fileToUpload = f;
    }else {
      this.fileToUpload = undefined;
    }
  }

  initDownloadModal( dataset ){
    this._crud.getSchema(new SchemaRequest('', false, 1)).subscribe(
      res => {
        this.schemas = <SidebarNode[]> res;
      }, err => {
        console.log(err);
      }
    );
    let hubUrl = this._hub.getHubUrl();
    // remove index.php part
    hubUrl = hubUrl.slice( 0, hubUrl.lastIndexOf('/')+1 );
    hubUrl = hubUrl + 'uploaded-files/';
    this.downloadPath = hubUrl + dataset;
    //this.downloadPath = this._settings.getConnection('hub.url') + '/../uploaded-files/' + dataset;
    this.importDsForm.controls['url'].setValue(this.downloadPath);
    this.downloadDataModal.show();
  }

  importIntoPolypheny(){
    this.importDsFormSubmitted = true;
    this.importProgress = 0;
    if(this.importDsForm.valid){
      //get import status: see initWebsocket()
      this._crud.importDataset(
        this.importDsForm.controls['schema'].value,
        this.importDsForm.controls['store'].value,
        this.importDsForm.controls['url'].value,
        this.importDsForm.controls['createPrimaryKeys'].value,
        this.importDsForm.controls['addDefaultValue'].value
      ).subscribe(
        res => {
          this.importProgress = -1;
          const result = <HubResult> res;
          if(result.error){
            this._toast.warn('Import failed: ' + result.error);
          }else{
            this._toast.success(result.message);
            this.downloadDataModal.hide();
          }
        }, err => {
          this.importProgress = -1;
          this._toast.error('The dataset could not be imported');
          console.log(err);
        }
      );
    }
  }

  initWebsocket() {
    //get import status
    const sub = this._crud.onSocketEvent().subscribe(
      msg => {
        const s = <Status> msg;
        if( s.context === 'tableImport' ){
          this.importProgress = s.status;
        }
      }, err => {
        setTimeout(() => {
          this.initWebsocket();
        }, +this._settings.getSetting('reconnection.timeout'));
      });
    this.subscriptions.add(sub);
  }

}

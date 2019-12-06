import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {ActivatedRoute} from '@angular/router';
import {HubService} from '../../services/hub.service';
import {HubResult, Store} from './hub.model';
import {ModalDirective} from 'ngx-bootstrap';
import {AbstractControl, FormControl, FormGroup, Validators} from '@angular/forms';
import {ToastService} from '../../components/toast/toast.service';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {CrudService} from '../../services/crud.service';
import {SchemaRequest} from '../../models/ui-request.model';
import {SidebarNode} from '../../models/sidebar-node.model';
import {ResultSet} from '../../components/data-table/models/result-set.model';

@Component({
  selector: 'app-hub',
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.scss']
})
export class HubComponent implements OnInit, OnDestroy {

  subpage: string;
  subscribe;
  result: HubResult;
  datasets: HubResult;
  users: HubResult;

  //login
  loggedIn = 0;
  loginUser = '';
  loginPw = '';
  loginError;

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

  //download/import dataset
  downloadPath: string;
  schemas: SidebarNode[];
  importDsForm = new FormGroup({
    schema: new FormControl('', Validators.required),
    store: new FormControl('', Validators.required),
    url: new FormControl('', Validators.required),
  });
  importDsFormSubmitted = false;
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

  constructor(
    private _breadcrumb: BreadcrumbService,
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
    this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Data', ['/views/hub/data']), new BreadcrumbItem('Configuration', '/views/hub/configuration'), new BreadcrumbItem('Manage', '/views/hub/manage')]);
    this.subpage = this._route.snapshot.paramMap.get('sub');
    this.subscribe = this._route.params.subscribe(params => {
      this.subpage = params['sub'];
      this.refreshContent();
    });
    this.refreshContent();
    this.checkLogin();
    this.getStores();
  }

  ngOnDestroy(){
    this.subscribe.unsubscribe();
    this._breadcrumb.hide();
  }

  login( user: string, pw: string ){
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
            this._toast.toast( 'error', result.error, 5, 'bg-warning');
          }else{
            this._toast.toast( 'Password changed', result.message, 5, 'bg-success');
            this.changePwSubmitted = false;
            this.changePwForm.reset();
          }
        }, err => {
          this._toast.toast( 'error', 'Unknown server error', 5, 'bg-danger');
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
          this._toast.toast('error', 'Could not delete user: ' + result.error, 10, 'bg-warning');
        }else{
          this._toast.toast('success', 'The user was deleted.', 5, 'bg-success');
          this.getUsers();
        }
      }, err => {
        this._toast.toast('server error', 'Could not delete user', 10, 'bg-danger');
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
            this._toast.toast('error', 'Could not create user: ' + result.error, 10, 'bg-warning');
          }else{
            this._toast.toast('success', result.message, 5, 'bg-success');
            this.getUsers();
            this.newUserForm.reset();
            this.newUserFormSubmitted = false;
          }
        }, err => {
          this._toast.toast('server error', 'Could not create user', 10, 'bg-danger');
          console.log(err);
        }
      );
    }
  }

  newUserValidation( key ){
    if(!this.newUserFormSubmitted) return;
    return this.newUserForm.controls[key].valid ? 'is-valid' : 'is-invalid';
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

  editUser(){
    this.editUserSubmitted = true;
    if( this.editUserForm.valid ){
      const val = this.editUserForm.value;
      this._hub.updateUser( val.id, val.name, val.password, val.email, val.admin ).subscribe(
        res => {
          const result = <HubResult> res;
          if( result.error ){
            this._toast.toast('error', 'Could not update user: ' + result.error, 10, 'bg-warning');
          }else{
            this._toast.toast('success', 'The user was updated.', 5, 'bg-success');
            this.getUsers();
            this.editUserModal.hide();
          }
        }, err => {
          this._toast.toast('server error', 'Could not update user', 10, 'bg-danger');
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
        const result = <ResultSet> res;
        const stores = [];
        for( const s of result.data ){
          stores.push( { id: s[0], uniqueName: s[1], adapterName: s[2] } );
        }
        this.availableStores = stores;
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
    this.loginUser = '';
    this.loginPw = '';
  }

  initEditDataset( key: number ){
    this.editDatasetModal.show();
    this.editDsName = this.datasets.data[key][0];
    this.editDsPublic = <boolean><unknown> this.datasets.data[key][2];
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
        console.log(res);
        this.editDatasetModal.hide();
        this.getDatasets();
      }, err => {
        this._toast.toast('error', 'Could not update dataset', 5, 'bg-danger');
        console.log(err);
      }
    );
  }

  newDsFormSubmit(){
    this.newDsFormSubmitted = true;

    if(this.newDsForm.valid){
      //https://stackoverflow.com/questions/39272970/angular-2-encode-image-to-base64/39275214
      const file:File = this.fileToUpload[0];
      const myReader:FileReader = new FileReader();
      myReader.readAsDataURL(file);
      myReader.onloadend = (e) => {
        const base64 = myReader.result;
        this._hub.uploadDataset( this._hub.getId(), this._hub.getSecret(), this.newDsForm.controls['name'].value, this.newDsForm.controls['pub'].value, this.fileToUpload ).subscribe(
          res => {
            const result = <HubResult> res;
            if( result.error ){
              this._toast.toast( 'error', 'Could not upload dataset: ' + result.error, 10, 'bg-warning' );
            } else {
              this._toast.toast( 'uploaded', result.message, 5, 'bg-success' );
              this.getDatasets();
              this.newDsForm.reset();
              this.newDsFormSubmitted = false;
              this.fileToUpload = undefined;
            }
          }, err => {
            this._toast.toast( 'error', 'Could not upload dataset', 10, 'bg-danger' );
            console.log(err);
          }
        );
      };
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
          this._toast.toast( 'error', 'Could not delete dataset: ' + result.error, 10, 'bg-warning' );
        } else {
          this._toast.toast( 'deleted', result.message, 5, 'bg-success' );
          this.getDatasets();
        }
      }, err => {
        this.deleteDsConfirm = undefined;
        this._toast.toast( 'error', 'Could not delete dataset', 10, 'bg-danger' );
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
    this.downloadPath = this._settings.getConnection('hub.url') + '/../uploaded-files/' + dataset;
    this.importDsForm.controls['url'].setValue(this.downloadPath);
    this.downloadDataModal.show();
  }

  importIntoPolypheny(){
    this.importDsFormSubmitted = true;
    if(this.importDsForm.valid){
      this._crud.importDataset( this.importDsForm.controls['schema'].value, this.importDsForm.controls['store'].value, this.importDsForm.controls['url'].value ).subscribe(
        res => {
          const result = <HubResult> res;
          if(result.error){
            this._toast.toast('error', 'Import failed: ' + result.error, 10, 'bg-warning');
          }else{
            this._toast.toast('success', result.message, 5, 'bg-success');
          }
        }, err => {
          this._toast.toast('error', 'The dataset could not be imported', 10, 'bg-warning');
          console.log(err);
        }
      );
    }
  }

}

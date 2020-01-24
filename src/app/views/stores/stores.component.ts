import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ModalDirective} from 'ngx-bootstrap';
import {Store, AdapterInformation, AdapterSetting} from './store.model';
import {ToastService} from '../../components/toast/toast.service';
import {AbstractControl, FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';

@Component({
  selector: 'app-stores',
  templateUrl: './stores.component.html',
  styleUrls: ['./stores.component.scss']
})
export class StoresComponent implements OnInit, OnDestroy {

  stores: Store[];
  adapters: AdapterInformation[];
  route: String;
  routeListener;

  editingStore: Store;
  editingStoreForm: FormGroup;
  deletingStore;

  editingAdapter: AdapterInformation;
  editingAdapterForm: FormGroup;
  adapterUniqueNameForm: FormGroup;

  @ViewChild('storeSettingsModal', {static: false}) public storeSettingsModal: ModalDirective;

  constructor(
    public _breadcrumb: BreadcrumbService,
    private _crud: CrudService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _toast: ToastService
  ) { }

  ngOnInit() {
    this.getStores();
    this.getAdapters();
    this.route = this._route.snapshot.paramMap.get('action');
    this.updateBreadcrumb();
    this.routeListener = this._route.params.subscribe(params => {
      this.route = params['action'];
      this.updateBreadcrumb();
    });
  }

  ngOnDestroy() {
    this._breadcrumb.hide();
  }

  updateBreadcrumb(){
    if(this.route === 'addStore'){
      this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Adapters')]);
    }else{
      this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Stores')]);
    }
  }

  getStores(){
    this._crud.getStores().subscribe(
      res => {
        this.stores = <Store[]> res;
      }, err => {
        console.log(err);
      }
    );
  }

  getAdapters(){
    this._crud.getAdapters().subscribe(
      res => {
        this.adapters = <AdapterInformation[]> res;
      }, err => {
        console.log(err);
      }
    );
  }

  onCloseModal(){
    this.editingStore = undefined;
    this.editingStoreForm = undefined;
    this.editingAdapter = undefined;
    this.editingAdapterForm = undefined;
  }

  initStoreSettings( store: Store ){
    this.editingStore = store;
    const fc = {};
    for( const [k,v] of Object.entries(this.editingStore.settings)){
      const validators = [];
      if(v.required) { validators.push( Validators.required ); }
      let val = v.defaultValue;
      if( v.options ) { val = v.options[0]; }
      fc[v.name] = new FormControl({value: val, disabled: !v.modifiable}, validators);
    }
    this.editingStoreForm = new FormGroup( fc );
    this.storeSettingsModal.show();
  }

  saveStoreSettings(){
    const store = <any> this.editingStore;
    store.settings = {};
    for( const [k,v] of Object.entries( this.editingStoreForm.controls )){
      store.settings[k] = v.value;
    }
    this._crud.updateStoreSettings( store ).subscribe(
      res => {
        this._toast.toast( 'success', 'updated store settings', 5, 'bg-success');
        this.storeSettingsModal.hide();
        this.getStores();
      }, err => {
        this._toast.toast( 'error', 'could not update store settings', 5, 'bg-danger');
        console.log(err);
      }
    );
  }

  initAdapterSettings( adapter: AdapterInformation ){
    this.editingAdapter = adapter;
    const fc = {};
    for( const [k,v] of Object.entries(this.editingAdapter.settings)){
      const validators = [];
      if(v.required) { validators.push( Validators.required ); }
      let val = v.defaultValue;
      if( v.options ) { val = v.options[0]; }
      fc[v.name] = new FormControl(val, validators);
    }
    this.editingAdapterForm = new FormGroup( fc );
    this.adapterUniqueNameForm = new FormGroup({
      uniqueName: new FormControl(null, [Validators.required, Validators.pattern( this._crud.getValidationRegex() ), validateUniqueStore(this.stores)])
    });
    this.storeSettingsModal.show();
  }

  getFeedback(){
    const errors = this.adapterUniqueNameForm.controls['uniqueName'].errors;
    if( errors ){
      if (errors.required) { return 'missing unique name'; }
      else if (errors.pattern) { return 'invalid unique name'; }
      else if (errors.unique) { return 'name is not unique'; }
    }
    return '';
  }

  getAdapterSetting( adapter, key: string ): AdapterSetting{
    return adapter.settings.filter( (a, i) => a.name === key )[0];
  }

  deploy(){
    if(!this.editingAdapterForm.valid) { return; }
    if(!this.adapterUniqueNameForm.valid) { return; }
    const deploy = {
      uniqueName: this.adapterUniqueNameForm.controls['uniqueName'].value,
      clazzName: this.editingAdapter.clazz,
      settings: {}
    };
    for( const [k,v] of Object.entries( this.editingAdapterForm.controls )){
      deploy.settings[k] = v.value;
    }
    this._crud.addStore( deploy ).subscribe(
      res => {
        if(<boolean> res === true){
          this._toast.toast( 'success', 'Deployed store', 5, 'bg-success');
          this._router.navigate(['./../'], {relativeTo: this._route});
        } else {
          this._toast.toast( 'error', 'Could not deploy store', 5, 'bg-warning');
        }
        this.storeSettingsModal.hide();
      }, err => {
        this._toast.toast( 'error', 'Could not deploy store', 5, 'bg-danger');
      }
    );
  }

  removeStore( store: Store ){
    if( this.deletingStore !== store ){
      this.deletingStore = store;
    } else {
      this._crud.removeStore( store.uniqueName ).subscribe(
        res => {
          const result = <boolean> res;
          if(result){
            this._toast.toast( 'success', 'Removed store', 5, 'bg-success');
            this.getStores();
          }else{
            this._toast.toast( 'error', 'Could not remove store', 5, 'bg-warning');
          }
        }, err => {
          this._toast.toast( 'error', 'Could not remove store', 5, 'bg-danger');
          console.log(err);
        }
      );
    }
  }

  validate( form: FormGroup, key ) {
    if(form === undefined) { return; }
    if( form.controls[key].status === 'DISABLED' ) { return; }
    if( form.controls[key].valid ){
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  getLogo( adapterName: string ){
    const path = 'assets/dbms-logos/';
    switch ( adapterName ) {
      case 'CSV':
        return path + 'csv.png';
      case 'HSQLDB':
        return path + 'hsqldb.jpg';
      case 'PostgreSQL':
        return path + 'postgres.svg';
      default:
        return null;
    }
  }

}

// see https://angular.io/guide/form-validation#custom-validators
function validateUniqueStore(stores: Store[]): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    if(! control.value) { return null; }
    for(const s of stores ){
      if( s.uniqueName === control.value ) { return {unique: true}; }
    }
    return null;
  };
}
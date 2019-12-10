import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute} from '@angular/router';
import {ModalDirective} from 'ngx-bootstrap';
import {Store, AdapterInformation} from './store.model';
import {ToastService} from '../../components/toast/toast.service';
import {AbstractControl, FormControl, FormGroup, Validators} from '@angular/forms';

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
  editingAdapter: AdapterInformation;
  editingAdapterForm: FormGroup;
  deletingStore;

  @ViewChild('storeSettingsModal', {static: false}) public storeSettingsModal: ModalDirective;

  constructor(
    public _breadcrumb: BreadcrumbService,
    private _crud: CrudService,
    private _route: ActivatedRoute,
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
      //todo add validator required?
      fc[k] = new FormControl(v);
    }
    this.editingStoreForm = new FormGroup( fc );
    this.storeSettingsModal.show();
  }

  saveStoreSettings(){
    const store = this.editingStore;
    store.settings = {};
    for( const [k,v] of Object.entries( this.editingStoreForm.controls )){
      store.settings[k] = v.value;
    }
    this._crud.updateStoreSettings( store ).subscribe(
      res => {
        this._toast.toast( 'success', 'updated store settings', 5, 'bg-success');
        this.storeSettingsModal.hide();
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
      const validator = [];
      if(v.required) validator.push( Validators.required );
      fc[v.name] = new FormControl(v.defaultValue, validator);
    }
    this.editingAdapterForm = new FormGroup( fc );
    this.storeSettingsModal.show();
  }

  deploy(){
    const deploy = {
      clazzName: this.editingAdapter.clazz,
      settings: {}
    };
    for( const [k,v] of Object.entries( this.editingAdapterForm.controls )){
      deploy.settings[k] = v.value;
    }
    if(!this.editingAdapterForm.valid) return;
    this._crud.addStore( deploy ).subscribe(
      res => {
        if(<boolean> res === true){
          this._toast.toast( 'success', 'Deployed store', 5, 'bg-success');
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
      this._crud.removeStore( String(store.storeId) ).subscribe(
        res => {
          const result = <boolean> res;
          if(result){
            this._toast.toast( 'success', 'Removed store', 5, 'bg-success');
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
    if(form === undefined) return;
    if( form.controls[key].valid ){
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

}

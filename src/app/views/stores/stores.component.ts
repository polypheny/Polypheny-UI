import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Store, AdapterInformation, AdapterSetting, Source, Adapter} from './store.model';
import {ToastService} from '../../components/toast/toast.service';
import {AbstractControl, FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ResultSet} from '../../components/data-view/models/result-set.model';
import {Subscription} from 'rxjs';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-stores',
  templateUrl: './stores.component.html',
  styleUrls: ['./stores.component.scss']
})
export class StoresComponent implements OnInit, OnDestroy {

  stores: Store[];
  sources: Source[];
  availableStores: AdapterInformation[];
  availableSources: AdapterInformation[];
  route: String;
  routeListener;
  private subscriptions = new Subscription();

  editingStore: Adapter;
  editingStoreForm: FormGroup;
  deletingAdapter;

  editingAdapter: AdapterInformation;
  editingAdapterForm: FormGroup;
  adapterUniqueNameForm: FormGroup;

  @ViewChild('storeSettingsModal', {static: false}) public storeSettingsModal: ModalDirective;

  constructor(
    private _crud: CrudService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _toast: ToastService
  ) { }

  ngOnInit() {
    this.getStoresAndSources();
    this.getAdapters();
    this.route = this._route.snapshot.paramMap.get('action');
    this.routeListener = this._route.params.subscribe(params => {
      this.route = params['action'];
    });
    const sub = this._crud.onReconnection().subscribe(
      b => {
        if(b) {
          this.getStoresAndSources();
          this.getAdapters();
        }
      }
    );
    this.subscriptions.add(sub);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  getStoresAndSources(){
    this._crud.getStores().subscribe(
      res => {
        const stores = <Store[]> res;
        stores.sort((a, b) => (a.uniqueName > b.uniqueName) ? 1 : -1);
        this.stores = stores;
      }, err => {
        console.log(err);
      }
    );
    this._crud.getSources().subscribe(
      res => {
        this.sources = <Source[]> res;
      }, err => {
        console.log(err);
      }
    );
  }

  getAdapters(){
    this._crud.getAvailableStores().subscribe(
      res => {
        const stores = <AdapterInformation[]> res;
        stores.sort((a, b) => (a.name > b.name) ? 1 : -1);
        this.availableStores = stores;
      }, err => {
        console.log(err);
      }
    );
    this._crud.getAvailableSources().subscribe(
      res => {
        const sources = <AdapterInformation[]> res;
        sources.sort((a, b) => (a.name > b.name) ? 1 : -1);
        this.availableSources = sources;
      }, err => {
        console.log(err);
      }
    );
  }

  getAvailableAdapters() {
    if(this.route === 'addStore'){
      return this.availableStores;
    } else if(this.route === 'addSource'){
      return this.availableSources;
    }
    return null;
  }

  onCloseModal(){
    this.editingStore = undefined;
    this.editingStoreForm = undefined;
    this.editingAdapter = undefined;
    this.editingAdapterForm = undefined;
  }

  initStoreSettings( adapter: Adapter ){
    this.editingStore = adapter;
    const fc = {};
    for (const [k, v] of Object.entries(this.editingStore.adapterSettings)) {
      const validators = [];
      if (v.required) {
        validators.push(Validators.required);
      }
      const val = adapter.currentSettings[v.name];
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
    this._crud.updateAdapterSettings( store ).subscribe(
      res => {
        this._toast.success('updated store settings');
        this.storeSettingsModal.hide();
        this.getStoresAndSources();
      }, err => {
        this._toast.error('could not update store settings');
        console.log(err);
      }
    );
  }

  initAdapterSettings( adapter: AdapterInformation ){
    this.editingAdapter = adapter;
    const fc = {};
    for (const [k, v] of Object.entries(this.editingAdapter.adapterSettings)) {
      const validators = [];
      if (v.required) {
        validators.push(Validators.required);
      }
      let val = v.defaultValue;
      if (v.options) {
        val = v.options[0];
      }
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
    return adapter.adapterSettings.filter((a, i) => a.name === key)[0];
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
          this._toast.success('Deployed store');
          this._router.navigate(['./../'], {relativeTo: this._route});
        } else {
          this._toast.warn('Could not deploy store');
        }
        this.storeSettingsModal.hide();
      }, err => {
        this._toast.error('Could not deploy store');
      }
    );
  }

  removeAdapter(adapter: Adapter ){
    if( this.deletingAdapter !== adapter ){
      this.deletingAdapter = adapter;
    } else {
      this._crud.removeAdapter( adapter.uniqueName ).subscribe(
        res => {
          const result = <ResultSet> res;
          if(!result.error){
            this._toast.success('Removed adapter');
            this.getStoresAndSources();
          }else{
            this._toast.exception( result );
          }
        }, err => {
          this._toast.error('Could not remove adapter', 'server error');
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
        return path + 'hsqldb.png';
      case 'PostgreSQL':
        return path + 'postgres.svg';
      case 'MonetDB':
        return path + 'monetdb.png';
      case 'Cassandra':
        return path + 'cassandra.png';
      case 'Cottontail-DB':
        return path + 'cottontaildb.png';
      case 'File':
        return 'fa fa-file-image-o';
      default:
        return 'fa fa-database';
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

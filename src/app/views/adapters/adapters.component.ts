import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Store, AdapterInformation, AdapterSetting, Source, Adapter} from './adapter.model';
import {ToastService} from '../../components/toast/toast.service';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ResultSet} from '../../components/data-view/models/result-set.model';
import {Subscription} from 'rxjs';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-adapters',
  templateUrl: './adapters.component.html',
  styleUrls: ['./adapters.component.scss']
})
export class AdaptersComponent implements OnInit, OnDestroy {

  stores: Store[];
  sources: Source[];
  availableStores: AdapterInformation[];
  availableSources: AdapterInformation[];
  route: String;
  routeListener;
  private subscriptions = new Subscription();

  editingAdapter: Adapter;
  editingAdapterForm: FormGroup;
  deletingAdapter;

  editingAvailableAdapter: AdapterInformation;
  editingAvailableAdapterForm: FormGroup;
  editingAvailableAdapterForms: Map<String, FormGroup>;
  activeMode: string;
  availableAdapterUniqueNameForm: FormGroup;
  settingHeaders: string[];

  fileLabel = 'Choose File';
  deploying = false;

  @ViewChild('adapterSettingsModal', {static: false}) public adapterSettingsModal: ModalDirective;
  private allSettings: AdapterSetting[];
  public modeSettings: string[];


  constructor(
    private _crud: CrudService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _toast: ToastService,
    private _fb: FormBuilder
  ) { }

  ngOnInit() {
    this.getStoresAndSources();
    this.fetchAvailableAdapters();
    this.route = this._route.snapshot.paramMap.get('action');
    this.routeListener = this._route.params.subscribe(params => {
      this.route = params['action'];
    });
    const sub = this._crud.onReconnection().subscribe(
      b => {
        if(b) {
          this.getStoresAndSources();
          this.fetchAvailableAdapters();
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

  fetchAvailableAdapters(){
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
    this.editingAdapter = undefined;
    this.editingAdapterForm = undefined;
    this.editingAvailableAdapter = undefined;
    this.editingAvailableAdapterForm = undefined;
    this.fileLabel = 'Choose File';
  }

  initAdapterSettingsModal(adapter: Adapter ){
    this.editingAdapter = adapter;
    const fc = {};
    for (const [k, v] of Object.entries(this.editingAdapter.adapterSettings)) {
      const validators = [];
      if( v.fileNames ){
        fc[v.name] = this._fb.array([]);
      } else {
        if (v.required) {
          validators.push(Validators.required);
        }
        const val = adapter.currentSettings[v.name];
        fc[v.name] = new FormControl({value: val, disabled: !v.modifiable}, validators);
      }
    }
    this.editingAdapterForm = new FormGroup( fc );
    this.adapterSettingsModal.show();
  }

  saveAdapterSettings(){
    const adapter = <any> this.editingAdapter;
    adapter.settings = {};
    for( const [k,v] of Object.entries( this.editingAdapterForm.controls )){
      const setting = this.getAdapterSetting(this.editingAdapter, k);
      if(!setting.modifiable || setting.fileNames){
        continue;
      }
      adapter.settings[k] = v.value;
    }
    this._crud.updateAdapterSettings( adapter ).subscribe(
      res => {
        const result = <ResultSet> res;
        if(result.error){
          this._toast.exception(result);
        } else {
          this._toast.success('Updated adapter settings');
        }
        this.adapterSettingsModal.hide();
        this.getStoresAndSources();
      }, err => {
        this._toast.error('Could not update adapter settings');
        console.log(err);
      }
    );
  }

  initDeployModal(adapter: AdapterInformation ){
    this.editingAvailableAdapter = adapter;
    const fc = {};

    for( const k of Object.keys(this.editingAvailableAdapter.adapterSettings)) {
      for (const v of this.editingAvailableAdapter.adapterSettings[k]) {
        const validators = [];
        if (v.required) {
          validators.push(Validators.required);
        }
        let val = v.defaultValue;
        if(!fc.hasOwnProperty(k)){
          fc[k] = {};
        }
        if (v.fileNames) {
          fc[k][v.name] = this._fb.array([]);
        } else {
          if (v.options) {
            val = v.options[0];
          } else if (v.fileNames) {
            val = new FormControl(val, validators);
          }
          fc[k][v.name] = new FormControl(val, validators);
        }
        fc[v.name] = new FormControl(val, validators);
      }
    }
    this.modeSettings = Object.keys(this.editingAvailableAdapter.adapterSettings).filter(name => name !== 'mode' && name !== 'default');
    this.editingAvailableAdapterForms = new Map<String, FormGroup>();
    // we generate a set of settings consisting of the default settings and the deployment specific ones
    this.modeSettings.forEach( mode => {
      console.log(mode);
      console.log(this.editingAvailableAdapterForms);
      if ( fc[mode] ){
        this.editingAvailableAdapterForms.set(mode, new FormGroup(Object.assign(fc[mode],fc['default'])));
      }else if ( fc['default']) {
        this.editingAvailableAdapterForms.set(mode, new FormGroup(fc['default']));
      }else {
        this.editingAvailableAdapterForms.set(mode, this._fb.group([]));
      }
    });

    console.log(this.editingAvailableAdapterForms);
    this.activeMode = null;
    // if we only have one mode we directly set it
    if(this.modeSettings.length === 0) {
      this.activeMode = 'default';
      this.editingAvailableAdapterForm = new FormGroup(fc['default']);
    }
    if(this.modeSettings.length === 1){
      this.activeMode = this.modeSettings[0];
      this.editingAvailableAdapterForm = this.editingAvailableAdapterForms.get(this.activeMode);
    }

    this.allSettings = Object.keys(this.editingAvailableAdapter.adapterSettings).map(header => adapter.adapterSettings[header]).reduce( (arr, val) => arr.concat(val));

    this.availableAdapterUniqueNameForm = new FormGroup({
      uniqueName: new FormControl(null, [Validators.required, Validators.pattern( this._crud.getValidationRegex() ), validateUniqueName([...this.stores, ...this.sources])])
    });
    this.adapterSettingsModal.show();
  }

  onFileChange(event, form: FormGroup, key) {
    const files = event.target.files;
    if(files){
      const fileNames = [];
      const arr = form.controls[key] as FormArray;
      arr.clear();
      for(let i = 0; i < files.length; i++){
        fileNames.push(files.item(i).name);
        arr.push(this._fb.control(files.item(i)));
      }
      this.fileLabel = fileNames.join(', ');
    } else {
      const arr = form.controls[key] as FormArray;
      arr.clear();
      this.fileLabel = 'Choose File';
    }
  }

  getFeedback(){
    const errors = this.availableAdapterUniqueNameForm.controls['uniqueName'].errors;
    if( errors ){
      if (errors.required) { return 'missing unique name'; }
      else if (errors.pattern) { return 'invalid unique name'; }
      else if (errors.unique) { return 'name is not unique'; }
    }
    return '';
  }

  getAdapterSetting( adapter, key: string ): AdapterSetting{
    if( adapter.adapterSettings.hasOwnProperty('default')){
      return this.allSettings.filter((a, i) => a.name === key)[0];
    }
    return adapter.adapterSettings.filter((a, i) => a.name === key)[0];
  }

  deploy(){
    if(!this.editingAvailableAdapterForm.valid) { return; }
    if(!this.availableAdapterUniqueNameForm.valid) { return; }
    const deploy = {
      uniqueName: this.availableAdapterUniqueNameForm.controls['uniqueName'].value,
      clazzName: this.editingAvailableAdapter.clazz,
      settings: {}
    };
    const fd: FormData = new FormData();
    for ( const key of Object.keys(this.editingAvailableAdapterForm.controls).filter( k => k !== 'mode')) {
      for (const [k, v] of Object.entries(this.editingAvailableAdapterForm.controls )) {
        const setting = this.getAdapterSetting(this.editingAvailableAdapter, k);
        if (setting.fileNames) {
          const fileNames = [];
          const arr = v as FormArray;
          for (let i = 0; i < arr.length; i++) {
            const file = arr.at(i).value as File;
            fd.append(file.name, file);
            fileNames.push(file.name);
          }
          setting.fileNames = fileNames;
        } else {
          setting.defaultValue = v.value;
        }
        deploy.settings[k] = setting;
      }
    }

    // we add the selected header to the settings, which is the mode (docker, embedded) for the adapter
    deploy.settings['mode'] = this.editingAvailableAdapter.adapterSettings['mode'][0];
    deploy.settings['mode'].defaultValue = this.activeMode;

    fd.append('body', JSON.stringify(deploy));
    this.deploying = true;
    this._crud.addAdapter( fd ).subscribe(
      res => {
        const result = <ResultSet> res;
        if(!result.error){
          this._toast.success('Deployed "' + deploy.uniqueName + '"', result.generatedQuery);
          this._router.navigate(['./../'], {relativeTo: this._route});
        } else {
          this._toast.exception(result, 'Could not deploy adapter');
        }
        this.adapterSettingsModal.hide();
      }, err => {
        this._toast.error('Could not deploy adapter');
      }
    ).add( () => this.deploying = false );
  }

  removeAdapter(adapter: Adapter ){
    if( this.deletingAdapter !== adapter ){
      this.deletingAdapter = adapter;
    } else {
      this._crud.removeAdapter( adapter.uniqueName ).subscribe(
        res => {
          const result = <ResultSet> res;
          if(!result.error){
            this._toast.success('Dropped "' + adapter.uniqueName + '"', result.generatedQuery);
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

  validate( form: AbstractControl, key ) {
    if(form === undefined) { return; }
    if ( !(form instanceof FormGroup)) {
      return ;
    }
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
      case 'MySQL':
        return path + 'mysql.png';
      case 'QFS':
        return 'fa fa-folder-open-o';
      case 'MongoDB':
        return path + 'mongodb.png';
      default:
        return 'fa fa-database';
    }
  }


  deployType():FormGroup {
    if( this.activeMode ){
      return this.editingAvailableAdapterForms.get(this.activeMode) as FormGroup;
    }
    return null;
  }

  setMode(mode: string) {
    this.editingAvailableAdapterForm = this.editingAvailableAdapterForms.get(mode);
    this.activeMode = mode;
  }
}

// see https://angular.io/guide/form-validation#custom-validators
function validateUniqueName(adapters: Adapter[]): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    if(! control.value) { return null; }
    for(const s of adapters ){
      if( s.uniqueName === control.value ) { return {unique: true}; }
    }
    return null;
  };
}

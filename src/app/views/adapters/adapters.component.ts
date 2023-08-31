import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AdapterModel, AdapterInformation, SourceModel, StoreModel, AdapterType} from './adapter.model';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {
  AbstractControl,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {PathAccessRequest, RelationalResult} from '../../components/data-view/models/result-set.model';
import {BehaviorSubject, Subscription} from 'rxjs';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {CatalogService} from '../../services/catalog.service';
import {filter, map} from 'rxjs/operators';
import {AdapterSettingModel} from '../../models/catalog.model';

@Component({
  selector: 'app-adapters',
  templateUrl: './adapters.component.html',
  styleUrls: ['./adapters.component.scss']
})
export class AdaptersComponent implements OnInit, OnDestroy {


  constructor(
      private _crud: CrudService,
      private _route: ActivatedRoute,
      private _router: Router,
      private _toast: ToasterService,
      private _fb: UntypedFormBuilder,
      private _catalog: CatalogService
  ) {
  }

  readonly stores: BehaviorSubject<StoreModel[]> = new BehaviorSubject<StoreModel[]>([]);
  readonly sources: BehaviorSubject<SourceModel[]> = new BehaviorSubject<SourceModel[]>([]);
  availableStores: AdapterInformation[];
  availableSources: AdapterInformation[];
  route: String;
  routeListener;
  private subscriptions = new Subscription();

  editingAdapter: AdapterModel;
  editingAdapterForm: UntypedFormGroup;
  deletingAdapter;
  deletingInProgress: AdapterModel[];

  editingAvailableAdapter: AdapterInformation;
  editingAvailableAdapterForm: UntypedFormGroup;
  editingAvailableAdapterForms: Map<String, UntypedFormGroup>;
  activeMode: string;
  availableAdapterUniqueNameForm: UntypedFormGroup;
  settingHeaders: string[];

  fileLabel = 'Choose File';
  deploying = false;
  handshaking = false;

  subgroups = new Map<string, string>();

  private allSettings: AdapterSettingModel[];
  public modeSettings: string[];
  positionOrder = function (adapter: AdapterInformation) {
    return function (a, b) {
      return this.getAdapterSetting(adapter, a.key).position - this.getAdapterSetting(adapter, b.key).position;
    }.bind(this);
  }.bind(this);
  public accessId: String;
  private data: { data: FormData; deploy: any };

  private readonly _name = 'name';
  modalActive = false;

  ngOnInit() {
    this.deletingInProgress = [];
    this.subscribeAdapters();
    this.fetchAvailableAdapters();
    this.route = this._route.snapshot.paramMap.get('action');
    this.routeListener = this._route.params.subscribe(params => {
      this.route = params['action'];
    });
    const sub = this._crud.onReconnection().subscribe(
        b => {
          if (b) {
            this.fetchAvailableAdapters();
          }
        }
    );
    this.subscriptions.add(sub);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  subscribeAdapters() {
    this._catalog.adapters.pipe(
        filter(a => !!a),
        map(adapters => Array.from(adapters.values()).sort((a, b) => (a.name > b.name) ? 1 : -1))).subscribe(adapters => {
      console.log(adapters);
      this.sources.next(adapters.filter(a => a.type === AdapterType.SOURCE).map(a => a as SourceModel));
      this.stores.next(adapters.filter(a => a.type === AdapterType.STORE).map(a => a as StoreModel));
    });
  }

  fetchAvailableAdapters() {
    this._crud.getAvailableStores().subscribe({
      next: res => {
        const stores = <AdapterInformation[]>res;
        stores.sort((a, b) => (a.name > b.name) ? 1 : -1);
        this.availableStores = stores;
      }
      ,
      error: err => {
        console.log(err);
      }
    });
    this._crud.getAvailableSources().subscribe({
      next: res => {
        const sources = <AdapterInformation[]>res;
        sources.sort((a, b) => (a.name > b.name) ? 1 : -1);
        this.availableSources = sources;
      }
      ,
      error: err => {
        console.log(err);
      }
    })
    ;
  }

  getAvailableAdapters() {
    if (this.route === 'addStore') {
      return this.availableStores;
    } else if (this.route === 'addSource') {
      return this.availableSources;
    }
    return null;
  }

  onCloseModal() {
    this.editingAdapter = undefined;
    this.editingAdapterForm = undefined;
    this.editingAvailableAdapter = undefined;
    this.editingAvailableAdapterForm = undefined;
    this.activeMode = undefined;
    this.settingHeaders = undefined;
    this.editingAvailableAdapterForms = undefined;
    this.fileLabel = 'Choose File';
  }

  initAdapterSettingsModal(adapter: AdapterModel) {
    this.editingAdapter = adapter;
    const fc = {};
    for (const [k, v] of Object.entries(this.editingAdapter.settings)) {
      const validators = [];
      if (v.fileNames) {
        fc[v.name] = this._fb.array([]);
      } else {
        if (v.required) {
          validators.push(Validators.required);
        }
        const val = adapter.settings[v.name];
        fc[v.name] = new UntypedFormControl({value: val, disabled: !v.modifiable}, validators);
      }
    }
    this.editingAdapterForm = new UntypedFormGroup(fc);
    this.handshaking = false;
    this.modalActive = true;
  }

  saveAdapterSettings() {
    const adapter = <any>this.editingAdapter;
    adapter.settings = {};
    for (const [k, v] of Object.entries(this.editingAdapterForm.controls)) {
      const setting = this.getAdapterSetting(this.editingAdapter, k);
      if (!setting.modifiable || setting.fileNames) {
        continue;
      }
      adapter.settings[k] = v.value;
    }
    this._crud.updateAdapterSettings(adapter).subscribe({
      next: res => {
        const result = <RelationalResult>res;
        if (result.error) {
          this._toast.exception(result);
        } else {
          this._toast.success('Updated adapter settings');
        }
        this.modalActive = false;
        this._catalog.updateIfNecessary();
      },
      error: err => {
        this._toast.error('Could not update adapter settings');
        console.log(err);
      }
    });
  }

  getDefaultUniqueName(): string {
    if (this.editingAvailableAdapter !== undefined) {
      const base = this.editingAvailableAdapter.name.toLowerCase(); // + "_"; // TODO: re-enable underscores when graph namespaces work with it
      let max_i = 0;
      for (const store of this.stores.value) {
        if (store.name.startsWith(base)) {
          const suffix = store.name.slice(base.length);
          const i = parseInt(suffix, 10);
          if (!isNaN(i)) {
            max_i = Math.max(max_i, i);
          }
        }
      }
      for (const store of this.sources.value) {
        if (store.name.startsWith(base)) {
          const suffix = store.name.slice(base.length);
          const i = parseInt(suffix, 10);
          if (!isNaN(i)) {
            max_i = Math.max(max_i, i);
          }
        }
      }
      return base + (max_i + 1).toString(10);
    }
    return null;
  }

  async initDeployModal(adapter: AdapterInformation) {
    this.editingAvailableAdapter = adapter;

    const fc = {};

    for (const k of Object.keys(this.editingAvailableAdapter.adapterSettings)) {
      for (const v of this.editingAvailableAdapter.adapterSettings[k]) {
        const validators = [];
        if (v.required) {
          validators.push(Validators.required);
        }
        let val = v.defaultValue;
        if (!fc.hasOwnProperty(k)) {
          fc[k] = {};
        }
        if (v.fileNames) {
          fc[k][v._name] = this._fb.array([]);
        } else {
          if (v.options) {
            val = v.options[0];
          } else if (v.fileNames) {
            val = new UntypedFormControl(val, validators);
          }
          fc[k][v._name] = new UntypedFormControl(val, validators);
        }
      }
    }

    this.modeSettings = Object.keys(this.editingAvailableAdapter.adapterSettings).filter(name => name !== 'mode' && name !== 'default');
    this.editingAvailableAdapterForms = new Map<String, UntypedFormGroup>();
    // we generate a set of settings consisting of the default settings and the deployment specific ones
    this.modeSettings.forEach(mode => {
      if (fc[mode]) {
        this.editingAvailableAdapterForms.set(mode, new UntypedFormGroup(Object.assign(fc[mode], fc['default'])));
      } else if (fc['default']) {
        this.editingAvailableAdapterForms.set(mode, new UntypedFormGroup(fc['default']));
      } else {
        this.editingAvailableAdapterForms.set(mode, this._fb.group([]));
      }
    });

    this.activeMode = null;
    // if we only have one mode we directly set it
    if (this.modeSettings.length === 0) {
      this.activeMode = 'default';
      if (fc['default']) {
        this.editingAvailableAdapterForm = new UntypedFormGroup(fc['default']);
      } else {
        this.editingAvailableAdapterForm = this._fb.group([]);
      }
    }
    if (this.modeSettings.length === 1) {
      this.activeMode = this.modeSettings[0];
      this.editingAvailableAdapterForm = this.editingAvailableAdapterForms.get(this.activeMode);
    }

    this.allSettings = Object.keys(this.editingAvailableAdapter.adapterSettings).map(header => adapter.adapterSettings[header]).reduce((arr, val) => arr.concat(val));

    this.availableAdapterUniqueNameForm = new UntypedFormGroup({
      uniqueName: new UntypedFormControl(this.getDefaultUniqueName(), [Validators.required, Validators.pattern(this._crud.getAdapterNameValidationRegex()), validateUniqueName([...this.stores.value, ...this.sources.value])])
    });
    this.modalActive = true;
  }

  onFileChange(event, form: UntypedFormGroup, key) {
    const files = event.target.files;
    if (files) {
      const fileNames = [];
      const arr = form.controls[key] as UntypedFormArray;
      arr.clear();
      for (let i = 0; i < files.length; i++) {
        fileNames.push(files.item(i)._name);
        arr.push(this._fb.control(files.item(i)));
      }
      this.fileLabel = fileNames.join(', ');
    } else {
      const arr = form.controls[key] as UntypedFormArray;
      arr.clear();
      this.fileLabel = 'Choose File';
    }
  }

  getFeedback() {
    const errors = this.availableAdapterUniqueNameForm.controls[this._name].errors;
    if (errors) {
      if (errors.required) {
        return 'missing unique name';
      } else if (errors.pattern) {
        return 'invalid unique name: unique name must only contain lower case letters, digits and underscores';
      } else if (errors.unique) {
        return 'name is not unique';
      }
    }
    return '';
  }

  getGenericFeedback(key: string) {
    let errors = this.editingAvailableAdapterForm.errors;
    if (errors) {
      if (errors.usedPort) {
        return errors.usedPort;
      } else if (errors.notNumber) {
        return errors.notNumber;
      } else if (errors.noDockerRunning) {
        return errors.noDockerRunning;
      }
    }
    errors = this.editingAvailableAdapterForm.controls[key].errors;
    if (errors) {
      if (errors.required) {
        return 'required';
      } else if (errors.pattern) {
        return 'is not correctly formatted';
      } else if (errors.unique) {
        return 'name is not unique';
      }
    }

    return '';
  }

  getAdapterSetting(adapter, key: string): AdapterSettingModel {
    if (adapter.adapterSettings.hasOwnProperty('default')) {
      return this.allSettings.filter((a, i) => a.name === key)[0];
    }
    return adapter.adapterSettings.filter((a, i) => a._name === key)[0];
  }

  deploy() {
    if (!this.editingAvailableAdapterForm.valid) {
      return;
    }
    if (!this.availableAdapterUniqueNameForm.valid) {
      return;
    }
    const deploy = {
      uniqueName: this.availableAdapterUniqueNameForm.controls[this._name].value,
      adapterName: this.editingAvailableAdapter.name,
      adapterType: this.editingAvailableAdapter.type,
      settings: {}
    };
    const fd: FormData = new FormData();
    for (const key of Object.keys(this.editingAvailableAdapterForm.controls).filter(k => k !== 'mode')) {
      for (const [k, v] of Object.entries(this.editingAvailableAdapterForm.controls)) {
        const setting = this.getAdapterSetting(this.editingAvailableAdapter, k);
        if (setting.fileNames) {
          const fileNames = [];
          const arr = v as UntypedFormArray;
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

    if (deploy.settings.hasOwnProperty('method') && deploy.settings['method'].defaultValue === 'link') {
      // secure deploy
      this.handshaking = true;
      this._crud.pathAccess(new PathAccessRequest(deploy.uniqueName, deploy.settings['directoryName'].defaultValue)).subscribe(
          res => {
            const id = <String>res;
            this.accessId = id;
            deploy.settings['access'] = id;
            this.data = {data: fd, deploy: deploy};
            if (!id || id.trim() === '') {
              // file is already placed
              this.continueSecureDeploy();
            }
          }
      );

    } else {
      // normal deploy
      this.startDeploying(fd, deploy);
    }

  }

  continueSecureDeploy() {
    this.handshaking = false;
    this.startDeploying(this.data.data, this.data.deploy);
  }

  createSecureFile() {
    const file = new Blob(['test'], {type: '.access'});
    const a = document.createElement('a'),
        url = URL.createObjectURL(file);
    a.href = url;
    a.download = 'polypheny.access';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }

  private startDeploying(fd: FormData, deploy: { settings: {}; uniqueName: any; adapterName: string; adapterType: string }) {
    this.deploying = true;
    this._crud.addAdapter(fd).subscribe({
      next: res => {
        const result = <RelationalResult>res;
        if (!result.error) {
          this._toast.success('Deployed "' + deploy.uniqueName + '"', result.query);
          this._router.navigate(['./../'], {relativeTo: this._route});
        } else {
          this._toast.exception(result, 'Could not deploy adapter');
        }
        this.modalActive = true;
      },
      error: err => {
        this._toast.error('Could not deploy adapter');
      }
    }).add(() => this.deploying = false);
  }

  removeAdapter(adapter: AdapterModel) {
    if (this.deletingAdapter !== adapter) {
      this.deletingAdapter = adapter;
    } else {
      if (this.deletingInProgress.includes(adapter)) {
        return;
      }

      this.deletingInProgress.push(adapter);
      this._crud.removeAdapter(adapter.name).subscribe({
        next: res => {
          const result = <RelationalResult>res;
          if (!result.error) {
            this._toast.success('Dropped "' + adapter.name + '"', result.query);
          } else {
            this._toast.exception(result);
          }
          this.deletingInProgress = this.deletingInProgress.filter(el => el !== adapter);
          this.deletingAdapter = undefined;
          this._catalog.updateIfNecessary();
        }, error: err => {
          this._toast.error('Could not remove adapter', 'server error');
          console.log(err);
          this.deletingInProgress = this.deletingInProgress.filter(el => el !== adapter);
          this.deletingAdapter = undefined;
        }
      });
    }
  }

  validate(form: AbstractControl, key) {
    if (form === undefined) {
      return;
    }

    if (form instanceof UntypedFormControl) {
      return this.validateControl(form, key);
    }
    if (!(form instanceof UntypedFormGroup)) {
      return;
    }
    if (form.controls[key].status === 'DISABLED') {
      return;
    }


    if (form.controls[key].valid) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  getLogo(adapterName: string) {
    const path = 'assets/dbms-logos/';
    switch (adapterName) {
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
      case 'Ethereum':
        return path + 'ethereum.png';
      case 'Neo4j':
        return path + 'neo4j.png';
      case 'Excel':
        return path + 'xls.png';
      case 'GoogleSheets':
        return path + 'google.png';
      default:
        return 'fa fa-database';
    }
  }

  deployType(): UntypedFormGroup {
    if (this.activeMode) {
      return this.editingAvailableAdapterForms.get(this.activeMode) as UntypedFormGroup;
    }
    return null;
  }

  setMode(mode: string) {
    this.editingAvailableAdapterForm = this.editingAvailableAdapterForms.get(mode);
    this.activeMode = mode;
  }

  private validateControl(form: UntypedFormControl, key: string) {
    if ((key === 'port' || key === 'instanceId') && this.activeMode === 'docker') {
      if (this.editingAvailableAdapterForm.valid) {
        return 'is-valid';
      } else {
        return 'is-invalid';
      }
    }

    if (form.valid) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  resetDeletingAdapter(adapter: AdapterModel) {
    if (this.deletingAdapter === adapter && this.deletingInProgress.includes(adapter)) {
      return;
    }
    this.deletingAdapter = undefined;
  }

  isDeleting(adapter: AdapterModel) {
    return this.deletingInProgress.includes(adapter);
  }

  subIsActive(information: AdapterInformation, subOf: string) {
    if (!subOf) {
      return true;
    }
    const keys = subOf.split('_');

    if (!this.subgroups.has(keys[0])) {

      const setting = this.getAdapterSetting(information, keys[0]);

      this.subgroups.set(keys[0], setting.defaultValue);

    }


    return this.subgroups.has(keys[0]) && this.subgroups.get(keys[0]) === keys[1];
  }

  onChange(key: string, value: AbstractControl) {
    this.subgroups.set(key, value.value);
  }

}

// see https://angular.io/guide/form-validation#custom-validators
function validateUniqueName(adapters: AdapterModel[]): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) {
      return null;
    }
    for (const s of adapters) {
      if (s.name === control.value) {
        return {unique: true};
      }
    }
    return null;
  };
}

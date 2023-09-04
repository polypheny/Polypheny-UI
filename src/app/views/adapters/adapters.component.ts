import {Component, OnDestroy, OnInit} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AdapterModel, AdapterType, SourceModel, StoreModel} from './adapter.model';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {AbstractControl, Form, FormArray, FormGroup, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidatorFn, Validators} from '@angular/forms';
import {PathAccessRequest, RelationalResult} from '../../components/data-view/models/result-set.model';
import {BehaviorSubject, combineLatest, Subscription} from 'rxjs';
import {CatalogService} from '../../services/catalog.service';
import {filter, map, mergeMap} from 'rxjs/operators';
import {AdapterSettingModel, AdapterSettingValueModel, AdapterTemplateModel, DeployMode} from '../../models/catalog.model';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';

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
      private _catalog: CatalogService,
      private _left: LeftSidebarService
  ) {
    this._left.close();
  }

  readonly stores: BehaviorSubject<StoreModel[]> = new BehaviorSubject<StoreModel[]>([]);
  readonly sources: BehaviorSubject<SourceModel[]> = new BehaviorSubject<SourceModel[]>([]);
  readonly availableAdapters: BehaviorSubject<AdapterTemplateModel[]> = new BehaviorSubject<AdapterTemplateModel[]>([]);
  readonly currentRoute: BehaviorSubject<String> = new BehaviorSubject<String>(null);
  private subscriptions = new Subscription();

  readonly adapter: BehaviorSubject<Adapter> = new BehaviorSubject<Adapter>(null);
  editingAdapterForm: FormGroup;
  deletingAdapter;
  deletingInProgress: AdapterModel[];

  editingAvailableAdapterForm: UntypedFormGroup;
  readonly activeMode: BehaviorSubject<DeployMode> = new BehaviorSubject<DeployMode>(null);
  settingHeaders: string[];

  fileLabel = 'Choose File';
  deploying = false;
  handshaking = false;

  subgroups = new Map<string, string>();

  public accessId: String;
  private data: { data: FormData; deploy: any };

  modalActive = false;

  protected readonly Array = Array;

  protected readonly DeployMode = DeployMode;

  readonly _name: string = 'uniqueName';


  readonly positionOrder = () => {
    return (a, b) => {
      return a.position - b.position;
    };
  }


  ngOnInit() {
    this.deletingInProgress = [];
    this.subscribeAdapters();
    this.subscribeActiveChange();

    this.currentRoute.next(this._route.snapshot.paramMap.get('action'));
    const sub = this._route.params.subscribe(params => {
      this.currentRoute.next(params['action']);
    });
    this.subscriptions.add(sub);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  subscribeAdapters() {
    this._catalog.adapters.pipe(
        filter(a => !!a),
        map(adapters => Array.from(adapters.values()).sort((a, b) => (a.name > b.name) ? 1 : -1))).subscribe(adapters => {
      this.sources.next(adapters.filter(a => a.type === AdapterType.SOURCE).map(a => a as SourceModel));
      this.stores.next(adapters.filter(a => a.type === AdapterType.STORE).map(a => a as StoreModel));
    });

    this.currentRoute.pipe(
        mergeMap(route => this._catalog.getAdapterTemplates()),
        map(adapters => adapters.filter(a => a.adapterType === this.getMatchingAdapterType()))).subscribe(adapters => {
      this.availableAdapters.next(adapters);
    });
  }

  subscribeActiveChange() {
    const sub = combineLatest([this.activeMode, this.adapter]).pipe(filter(pair => !!pair[0] && !!pair[1])).subscribe((pair) => {
      const fc = {};

      for (const setting of this.adapter.value.settings.values()) {
        const validators = [];
        if (setting.template.required) {
          validators.push(Validators.required);
        }
        let val = setting.template.defaultValue;
        if (setting.template.fileNames) {
          fc[setting.template.name] = this._fb.array([]);
        } else {
          if (setting.template.options) {
            val = setting.template.options[0];
          } else if (setting.template.fileNames) {
            val = new UntypedFormControl(val, validators).value;
          }
          fc[setting.template.name] = new UntypedFormControl(val, validators);
        }
      }
      fc['uniqueName'] = new UntypedFormControl(this.getDefaultUniqueName(), [Validators.required, Validators.pattern(this._crud.getAdapterNameValidationRegex()), validateUniqueName([...this.stores.value, ...this.sources.value])]);

      if (pair[1].task === Task.DEPLOY) {
        this.editingAvailableAdapterForm = new UntypedFormGroup(fc);
      } else {
        this.editingAdapterForm = new UntypedFormGroup(fc);
      }


    });

    this.subscriptions.add(sub);
  }

  private getMatchingAdapterType() {
    if (this.currentRoute.value === 'addStore') {
      return AdapterType.STORE;
    } else if (this.currentRoute.value === 'addSource') {
      return AdapterType.SOURCE;
    }
    return null;
  }

  onVisibilityChange() {
    if (this.modalActive) {
      return;
    }
    this.adapter.next(null);
    this.editingAdapterForm = null;
    this.editingAvailableAdapterForm = null;
    this.activeMode.next(null);
    this.settingHeaders = null;
    this.fileLabel = 'Choose File';
  }

  initAdapterSettingsModal(adapter: AdapterModel) {
    const allSettings = this._catalog.getAdapterTemplate(adapter.adapterName, adapter.type).value;

    this.adapter.next(Adapter.from(allSettings, adapter, Task.CHANGE));

    this.handshaking = false;
    this.modalActive = true;
  }

  saveAdapterSettings() {
    const adapter = <any>this.adapter;
    adapter.settings = {};
    for (const [k, v] of Object.entries(this.editingAdapterForm.controls)) {
      const setting = this.getAdapterSetting(k);
      if (!setting[0].modifiable || setting[0].fileNames) {
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
    if (this.adapter !== undefined) {
      const base = this.adapter.value.adapterName.toLowerCase(); // + "_"; // TODO: re-enable underscores when graph namespaces work with it
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

  async initDeployModal(adapter: AdapterTemplateModel) {
    this.activeMode.next(null);
    // if we only have one mode we directly set it
    if (adapter.modes.length === 0) {
      this.activeMode.next(DeployMode.ALL);
    } else if (adapter.modes.length === 1) {
      this.activeMode.next(adapter.modes[0]);
    }

    this.adapter.next(Adapter.from(adapter, null, Task.DEPLOY));

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

  getFeedback(form: UntypedFormGroup) {
    const errors = form.controls['adapterName']?.errors;
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

  getGenericFeedback(key: string | any) {
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

  getAdapterSetting(key: string | unknown): MergedSetting {
    return this.adapter.value.settings.get(<string>key);
  }

  deploy() {
    if (!this.editingAvailableAdapterForm.valid) {
      return;
    }
    const deploy = new AdapterModel(this.editingAvailableAdapterForm.controls['uniqueName'].value, this.adapter.value.adapterName, [], this.adapter.value.persistent, this.adapter.value.type, this.activeMode.value);
    const fd: FormData = new FormData();

    for (const [k, v] of Object.entries(this.editingAvailableAdapterForm.controls)) {
      const setting = this.getAdapterSetting(k);
      if (!setting) {
        continue;
      }

      if (setting.template.fileNames) {
        const fileNames = [];
        const arr = v as UntypedFormArray;
        for (let i = 0; i < arr.length; i++) {
          const file = arr.at(i).value as File;
          fd.append(file.name, file);
          fileNames.push(file.name);
        }
        setting.current.value = fileNames.toString();
      } else {
        setting.current.value = v.value;
      }

      deploy.settings[k] = setting.current.value;
    }


    if (deploy.settings.hasOwnProperty('method') && deploy.settings['method'].defaultValue === 'link') {
      // secure deploy
      this.handshaking = true;
      this._crud.pathAccess(new PathAccessRequest(deploy.name, deploy.settings['directoryName'].defaultValue)).subscribe(
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

  private startDeploying(fd: FormData, deploy: AdapterModel) {
    this.deploying = true;
    this._crud.addAdapter(fd).subscribe({
      next: (result: RelationalResult) => {
        if (!result.error) {
          this._toast.success('Deployed "' + deploy.name + '"', result.query);
          this._router.navigate(['./../'], {relativeTo: this._route}).then(r => null);
        } else {
          this._toast.exception(result, 'Could not deploy adapter');
        }
        this.modalActive = false;
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
        next: (result: RelationalResult) => {
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

  validate(form: AbstractControl | unknown, key) {
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

  private validateControl(form: UntypedFormControl, key: string) {
    if ((key === 'port' || key === 'instanceId') && this.activeMode.value === DeployMode.DOCKER) {
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

  subIsActive(subOf: string) {
    if (!subOf) {
      return true;
    }
    const keys = subOf.split('_');

    if (!this.subgroups.has(keys[0])) {

      const setting = this.getAdapterSetting(keys[0]);

      this.subgroups.set(keys[0], setting[1].value);

    }


    return this.subgroups.has(keys[0]) && this.subgroups.get(keys[0]) === keys[1];
  }

  onChange(key: string | unknown, value: AbstractControl | unknown) {
    if (key == null || value == null) {
      return;
    }
    this.subgroups.set(<string>key, (<AbstractControl>value).value);
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

class Adapter {
  uniqueName: string;
  adapterName: string;
  persistent: boolean;
  modes: DeployMode[];
  mode: DeployMode;
  task: Task;
  type: AdapterType;

  constructor(uniqueName: string, adapterName: string, persistent: boolean, modes: DeployMode[], type: AdapterType, settings: Map<string, MergedSetting>, task: Task) {
    this.uniqueName = uniqueName;
    this.settings = settings;
    this.adapterName = adapterName;
    this.persistent = persistent;
    this.modes = modes;
    this.task = task;
    this.type = type;
  }


  settings: Map<string, MergedSetting>;

  public static from(adapter: AdapterTemplateModel, current: AdapterModel | null, task: Task): Adapter {
    const settings: Map<string, MergedSetting> = new Map();

    for (const template of adapter.defaultSettings) {
      const temp = (current === null ? [] : current.settings).filter(c => template.name === c.key);
      const val = new MergedSetting(template, new AdapterSettingValueModel( template.name, null ));
      if (temp.length === 1) {
        val.current = temp[0];
      }
      settings.set(template.name, val);
    }
    return new Adapter(current === null ? '' : current.name, adapter.adapterName, adapter.persistent, adapter.modes, adapter.adapterType, settings, task);
  }
}

class MergedSetting {
  template: AdapterSettingModel;
  current: AdapterSettingValueModel;

  constructor(template: AdapterSettingModel, current: AdapterSettingValueModel) {
    this.template = template;
    this.current = current;
  }
}

enum Task {
  DEPLOY,
  CHANGE
}

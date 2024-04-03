import {
    Component,
    computed,
    effect,
    inject,
    Injector,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    WritableSignal
} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AdapterModel, AdapterType, PolyMap} from './adapter.model';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {
    AbstractControl,
    FormGroup,
    UntypedFormBuilder,
    UntypedFormControl,
    UntypedFormGroup,
    ValidatorFn,
    Validators
} from '@angular/forms';
import {PathAccessRequest, RelationalResult} from '../../components/data-view/models/result-set.model';
import {Subscription} from 'rxjs';
import {CatalogService} from '../../services/catalog.service';
import {
    AdapterSettingModel,
    AdapterSettingValueModel,
    AdapterTemplateModel,
    DeployMode
} from '../../models/catalog.model';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';

@Component({
    selector: 'app-adapters',
    templateUrl: './adapters.component.html',
    styleUrls: ['./adapters.component.scss']
})
export class AdaptersComponent implements OnInit, OnDestroy {

    private readonly _crud = inject(CrudService);
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    private readonly _fb = inject(UntypedFormBuilder);
    private readonly _catalog = inject(CatalogService);
    private readonly _left = inject(LeftSidebarService);

    constructor(private injector: Injector) {
        this.availableAdapters = computed(() => {
            console.log(this.currentRoute());
            const route = this.currentRoute();
            return this._catalog.getAdapterTemplates().filter(a => a.adapterType === this.getMatchingAdapterType());
        });

        this.stores = computed(() => {
            this._catalog.listener();
            return this._catalog.getStores();
        });

        this.sources = computed(() => {
            this._catalog.listener();
            return this._catalog.getSources();
        });
    }

    readonly stores: Signal<AdapterModel[]>;
    readonly sources: Signal<AdapterModel[]>;
    readonly availableAdapters: Signal<AdapterTemplateModel[]>;
    readonly currentRoute: WritableSignal<String> = signal(null);
    private subscriptions = new Subscription();

    readonly adapter: WritableSignal<Adapter> = signal(null);
    editingAdapterForm: FormGroup;
    deletingAdapter;
    deletingInProgress: AdapterModel[];

    editingAvailableAdapterForm: UntypedFormGroup;
    readonly activeMode: WritableSignal<DeployMode> = signal(null);
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

    protected readonly fetch = fetch;

    protected readonly AdapterModel = AdapterModel;

    protected readonly Task = Task;

    private readonly files = new Map<string, File>();


    readonly positionOrder = () => {
        return (a, b) => {
            return a.position - b.position;
        };
    };


    ngOnInit() {
        this._left.close();
        this.deletingInProgress = [];
        this.subscribeActiveChange();

        this.currentRoute.set(this._route.snapshot.paramMap.get('action'));

        const sub = this._route.params.subscribe(params => {
            this.currentRoute.set(params['action']);
        });
        this.subscriptions.add(sub);
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    subscribeActiveChange() {

        effect(() => {
            const mode = this.activeMode();
            const adapter = this.adapter();
            if (!mode || !adapter) {
                return;
            }
            const fc = {};


            for (const setting of adapter.settings.values()) {
                const validators = [];
                if (setting.template.required) {
                    validators.push(Validators.required);
                }
                let val = setting.template.defaultValue;
                if (setting.template.type.toLowerCase() === 'directory') {
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

            if (adapter.task === Task.DEPLOY) {
                fc['uniqueName'] = new UntypedFormControl(this.getDefaultUniqueName(), [Validators.required, Validators.pattern(this._crud.getAdapterNameValidationRegex()), validateUniqueName([...this.stores(), ...this.sources()])]);
                this.editingAvailableAdapterForm = new UntypedFormGroup(fc);
                this.editingAvailableAdapterForm.controls['mode'].setValue(this.activeMode().toLowerCase());
            } else {
                fc['uniqueName'] = new UntypedFormControl(adapter.uniqueName, [Validators.required, Validators.pattern(this._crud.getAdapterNameValidationRegex()), validateUniqueName([...this.stores(), ...this.sources()].filter(a => a.name !== adapter.uniqueName))]);
                this.editingAdapterForm = new UntypedFormGroup(fc);
            }

        }, {injector: this.injector});
    }

    private getMatchingAdapterType() {
        if (this.currentRoute() === 'addStore') {
            return AdapterType.STORE;
        } else if (this.currentRoute() === 'addSource') {
            return AdapterType.SOURCE;
        }
        return null;
    }

    onVisibilityChange(status: boolean) {

        if (this.modalActive) {
            if (!status) {
                this.modalActive = false;
            }

            return;
        }
        this.adapter.set(null);
        this.editingAdapterForm = null;
        this.editingAvailableAdapterForm = null;
        this.activeMode.set(null);
        this.settingHeaders = null;
        this.fileLabel = 'Choose File';
    }

    initAdapterSettingsConfigureModal(adapter: AdapterModel) {
        const allSettings = this._catalog.getAdapterTemplate(adapter.adapterName, adapter.type);

        const current = Adapter.from(allSettings, adapter, Task.CHANGE);
        this.adapter.set(current);
        this.activeMode.set(current.modes[0]);

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
                // this._catalog.updateIfNecessary();
            },
            error: err => {
                this._toast.error('Could not update adapter settings');
                console.log(err);
            }
        });
    }

    getDefaultUniqueName(): string {
        if (this.adapter !== undefined) {
            const base = this.adapter().adapterName.toLowerCase(); // + "_"; // TODO: re-enable underscores when graph namespaces work with it
            let max_i = 0;
            for (const store of this.stores()) {
                if (store.name.startsWith(base)) {
                    const suffix = store.name.slice(base.length);
                    const i = parseInt(suffix, 10);
                    if (!isNaN(i)) {
                        max_i = Math.max(max_i, i);
                    }
                }
            }
            for (const store of this.sources()) {
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
        this.activeMode.set(null);

        // if we only have one mode we directly set it
        if (adapter.modes.length === 0) {
            this.activeMode.set(DeployMode.ALL);
        } else if (adapter.modes.length === 1) {
            this.activeMode.set(adapter.modes[0]);
        }

        this.adapter.set(Adapter.from(adapter, null, Task.DEPLOY));

        this.modalActive = true;
    }

    onFileChange(event, key) {

        const files = event.target.files;
        if (!files) {
            return;
        }
        const fileNames = [];
        const setting = this.getAdapterSetting(key);
        setting.template.fileNames = [];
        for (let file of files) {
            fileNames.push(file.name);
            this.files.set(file.name, file);
            setting.template.fileNames.push(file.name)
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
        return this.adapter().settings.get(<string>key);
    }

    deploy() {
        if (!this.editingAvailableAdapterForm.valid) {
            return;
        }
        const deploy = new AdapterModel(this.editingAvailableAdapterForm.controls['uniqueName'].value, this.adapter().adapterName, new PolyMap(), this.adapter().persistent, this.adapter().type, this.activeMode());
        const fd: FormData = new FormData();

        for (const [k, v] of Object.entries(this.editingAvailableAdapterForm.controls)) {
            const setting = this.getAdapterSetting(k);
            if (!setting) {
                continue;
            }

            if (!setting.current) {
                setting.current = new AdapterSettingValueModel(k, null);
            }

            if (setting.template.type.toLowerCase() === "directory") {
                const fileNames = [];

                for (let fileName of setting.template.fileNames) {
                    fd.append(fileName, this.files.get(fileName));
                }
                setting.current.value = JSON.stringify(setting.template.fileNames);
            } else {
                setting.current.value = v.value;
            }

            deploy.settings.set(k, setting.current);
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
                        this.continueSecureDeploy(fd);
                    }
                }
            );

        } else {
            // normal deploy
            this.startDeploying(deploy, fd);
        }

    }

    continueSecureDeploy(formdata: FormData = new FormData()) {
        this.handshaking = false;
        this.startDeploying(this.data.deploy, formdata);
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

    private startDeploying(deploy: AdapterModel, formdata: FormData) {
        console.log(deploy)
        this.deploying = true;
        this._crud.createAdapter(deploy, formdata).subscribe({
            next: (result: RelationalResult) => {
                if (!result.error) {
                    this._toast.success('Deployed "' + deploy.name + '"', result.query);
                    this._router.navigate(['./../'], {relativeTo: this._route}).then(r => null);
                } else {
                    this._toast.exception(result, 'Could not deploy adapter');
                }
                this.modalActive = false;
            },
            error: _err => {
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
                    // this._catalog.updateIfNecessary();
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

    getLogo(adapterLogo: string) {
        return `${this._catalog.getHttpUrl()}/${adapterLogo}`;
    }

    private validateControl(form: UntypedFormControl, key: string) {
        if ((key === 'port' || key === 'instanceId') && this.activeMode() === DeployMode.DOCKER) {
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

            if (setting && setting.template) {
                this.subgroups.set(keys[0], setting.template.defaultValue);
            } else {
                return false;
            }

        }

        return this.subgroups.has(keys[0]) && this.subgroups.get(keys[0]) === keys[1];
    }

    onChange(key: string | unknown, value: AbstractControl | unknown) {
        if (key == null || value == null) {
            return;
        }
        this.subgroups.set(<string>key, (<AbstractControl>value).value);
    }

    setMode(mode: DeployMode) {
        this.activeMode.set(mode);
    }

    isSettingDisplayed(key: string) {
        const setting = this.getAdapterSetting(key);

        if (setting.template.subOf && !this.subIsActive(setting.template.subOf)) {
            // parent is inactive
            return false;
        }

        if (this.activeMode()) {
            if (key === 'mode') {
                return false;
            } else if (setting.template.appliesTo.includes(DeployMode.ALL)) {
                return true;
            } else if (setting.template.appliesTo.includes(this.activeMode())) {
                return true;
            }
            return false;
        }
        return true;
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
    settings: Map<string, MergedSetting>;

    constructor(uniqueName: string, adapterName: string, persistent: boolean, modes: DeployMode[], type: AdapterType, settings: Map<string, MergedSetting>, task: Task) {
        this.uniqueName = uniqueName;
        this.settings = settings;
        this.adapterName = adapterName;
        this.persistent = persistent;
        this.modes = modes;
        this.task = task;
        this.type = type;
    }


    public static from(adapter: AdapterTemplateModel, current: AdapterModel | null, task: Task): Adapter {
        const settings: Map<string, MergedSetting> = new Map();

        for (const template of adapter.settings) {
            const temp = current === null ? null : current.settings[template.name];
            const val = new MergedSetting(template, new AdapterSettingValueModel(template.name, template.defaultValue));
            val.current = temp;

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
    DEPLOY = 'DEPLOY',
    CHANGE = 'CHANGE'
}

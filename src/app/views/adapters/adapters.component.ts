import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Adapter, AdapterInformation, AdapterSetting, Source, Store} from './adapter.model';
import {ToastService} from '../../components/toast/toast.service';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators
} from '@angular/forms';
import {PathAccessRequest, ResultSet} from '../../components/data-view/models/result-set.model';
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
    deletingInProgress: Adapter[];

    editingAvailableAdapter: AdapterInformation;
    editingAvailableAdapterForm: FormGroup;
    editingAvailableAdapterForms: Map<String, FormGroup>;
    activeMode: string;
    availableAdapterUniqueNameForm: FormGroup;
    settingHeaders: string[];

    usedDockerPorts: Map<Number, Number[]>;

    fileLabel = 'Choose File';
    deploying = false;
    handshaking = false;

    subgroups = new Map<string, string>();

    @ViewChild('adapterSettingsModal', {static: false}) public adapterSettingsModal: ModalDirective;
    private allSettings: AdapterSetting[];
    public modeSettings: string[];
    positionOrder = function (adapter: AdapterInformation) {
        return function (a, b) {
            return this.getAdapterSetting(adapter, a.key).position - this.getAdapterSetting(adapter, b.key).position;
        }.bind(this);
    }.bind(this);
    public accessId: String;
    private data: { data: FormData; deploy: any };


    constructor(
        private _crud: CrudService,
        private _route: ActivatedRoute,
        private _router: Router,
        private _toast: ToastService,
        private _fb: FormBuilder
    ) {
    }

    ngOnInit() {
        this.deletingInProgress = [];
        this.getStoresAndSources();
        this.fetchAvailableAdapters();
        this.route = this._route.snapshot.paramMap.get('action');
        this.routeListener = this._route.params.subscribe(params => {
            this.route = params['action'];
        });
        const sub = this._crud.onReconnection().subscribe(
            b => {
                if (b) {
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

    getStoresAndSources() {
        this._crud.getStores().subscribe(
            res => {
                const stores = <Store[]>res;
                stores.sort((a, b) => (a.uniqueName > b.uniqueName) ? 1 : -1);
                this.stores = stores;
            }, err => {
                console.log(err);
            }
        );
        this._crud.getSources().subscribe(
            res => {
                this.sources = <Source[]>res;
            }, err => {
                console.log(err);
            }
        );
    }

    fetchAvailableAdapters() {
        this._crud.getAvailableStores().subscribe(
            res => {
                const stores = <AdapterInformation[]>res;
                stores.sort((a, b) => (a.name > b.name) ? 1 : -1);
                this.availableStores = stores;
            }, err => {
                console.log(err);
            }
        );
        this._crud.getAvailableSources().subscribe(
            res => {
                const sources = <AdapterInformation[]>res;
                sources.sort((a, b) => (a.name > b.name) ? 1 : -1);
                this.availableSources = sources;
            }, err => {
                console.log(err);
            }
        );
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

    initAdapterSettingsModal(adapter: Adapter) {
        this.editingAdapter = adapter;
        const fc = {};
        for (const [k, v] of Object.entries(this.editingAdapter.adapterSettings)) {
            const validators = [];
            if (v.fileNames) {
                fc[v.name] = this._fb.array([]);
            } else {
                if (v.required) {
                    validators.push(Validators.required);
                }
                const val = adapter.currentSettings[v.name];
                fc[v.name] = new FormControl({value: val, disabled: !v.modifiable}, validators);
            }
        }
        this.editingAdapterForm = new FormGroup(fc);
        this.handshaking = false;
        this.adapterSettingsModal.show();
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
        this._crud.updateAdapterSettings(adapter).subscribe(
            res => {
                const result = <ResultSet>res;
                if (result.error) {
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

    async initDeployModal(adapter: AdapterInformation) {
        this.editingAvailableAdapter = adapter;
        await this.refreshUsedDockerPorts();

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
                    fc[k][v.name] = this._fb.array([]);
                } else {
                    if (v.options) {
                        val = v.options[0];
                    } else if (v.fileNames) {
                        val = new FormControl(val, validators);
                    }
                    fc[k][v.name] = new FormControl(val, validators);
                }
            }
        }

        this.modeSettings = Object.keys(this.editingAvailableAdapter.adapterSettings).filter(name => name !== 'mode' && name !== 'default');
        this.editingAvailableAdapterForms = new Map<String, FormGroup>();
        // we generate a set of settings consisting of the default settings and the deployment specific ones
        this.modeSettings.forEach(mode => {
            if (fc[mode]) {
                this.editingAvailableAdapterForms.set(mode, new FormGroup(Object.assign(fc[mode], fc['default'])));
            } else if (fc['default']) {
                this.editingAvailableAdapterForms.set(mode, new FormGroup(fc['default']));
            } else {
                this.editingAvailableAdapterForms.set(mode, this._fb.group([]));
            }
        });

        //when docker is supported we can attach a special validator to the docker FormGroup
        if (this.editingAvailableAdapterForms.has('docker')) {
            this.attachUsedPortValidator();
        }

        this.activeMode = null;
        // if we only have one mode we directly set it
        if (this.modeSettings.length === 0) {
            this.activeMode = 'default';
            if (fc['default']) {
                this.editingAvailableAdapterForm = new FormGroup(fc['default']);
            } else {
                this.editingAvailableAdapterForm = this._fb.group([]);
            }
        }
        if (this.modeSettings.length === 1) {
            this.activeMode = this.modeSettings[0];
            this.editingAvailableAdapterForm = this.editingAvailableAdapterForms.get(this.activeMode);
        }

        this.allSettings = Object.keys(this.editingAvailableAdapter.adapterSettings).map(header => adapter.adapterSettings[header]).reduce((arr, val) => arr.concat(val));

        this.availableAdapterUniqueNameForm = new FormGroup({
            uniqueName: new FormControl(null, [Validators.required, Validators.pattern(this._crud.getValidationRegex()), validateUniqueName([...this.stores, ...this.sources])])
        });
        this.adapterSettingsModal.show();
    }

    private attachUsedPortValidator() {
        const dockerValidator: (control: AbstractControl) => (ValidationErrors | null) = (control: AbstractControl) => {
            const port = Number(control.get('port').value);
            const instanceId = Number(control.get('instanceId').value);

            if (isNaN(port)) {
                return {notNumber: 'The declared port is not a number.'};
            }
            if (!this.usedDockerPorts.has(instanceId)) {
                return {noDockerRunning: 'There is no docker instance running, please check your configuration.'};
            }

            if (this.usedDockerPorts.get(instanceId).includes(port)) {
                return {usedPort: 'This port is already used for the specified dockerInstance.'};
            }
            return null;
        };
        this.editingAvailableAdapterForms.get('docker').setValidators(dockerValidator);
    }

    onFileChange(event, form: FormGroup, key) {
        const files = event.target.files;
        if (files) {
            const fileNames = [];
            const arr = form.controls[key] as FormArray;
            arr.clear();
            for (let i = 0; i < files.length; i++) {
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

    getFeedback() {
        const errors = this.availableAdapterUniqueNameForm.controls['uniqueName'].errors;
        if (errors) {
            if (errors.required) {
                return 'missing unique name';
            } else if (errors.pattern) {
                return 'invalid unique name';
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

    getAdapterSetting(adapter, key: string): AdapterSetting {
        if (adapter.adapterSettings.hasOwnProperty('default')) {
            return this.allSettings.filter((a, i) => a.name === key)[0];
        }
        return adapter.adapterSettings.filter((a, i) => a.name === key)[0];
    }

    deploy() {
        if (!this.editingAvailableAdapterForm.valid) {
            return;
        }
        if (!this.availableAdapterUniqueNameForm.valid) {
            return;
        }
        const deploy = {
            uniqueName: this.availableAdapterUniqueNameForm.controls['uniqueName'].value,
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
        this._crud.addAdapter(fd).subscribe(
            res => {
                const result = <ResultSet>res;
                if (!result.error) {
                    this._toast.success('Deployed "' + deploy.uniqueName + '"', result.generatedQuery);
                    this._router.navigate(['./../'], {relativeTo: this._route});
                } else {
                    this._toast.exception(result, 'Could not deploy adapter');
                }
                this.adapterSettingsModal.hide();
            }, err => {
                this._toast.error('Could not deploy adapter');
            }
        ).add(() => this.deploying = false);
    }

    removeAdapter(adapter: Adapter) {
        if (this.deletingAdapter !== adapter) {
            this.deletingAdapter = adapter;
        } else {
            if (this.deletingInProgress.includes(adapter)) {
                return;
            }

            this.deletingInProgress.push(adapter);
            this._crud.removeAdapter(adapter.uniqueName).subscribe(
                res => {
                    const result = <ResultSet>res;
                    if (!result.error) {
                        this._toast.success('Dropped "' + adapter.uniqueName + '"', result.generatedQuery);
                        this.getStoresAndSources();
                    } else {
                        this._toast.exception(result);
                    }
                    this.deletingInProgress = this.deletingInProgress.filter(el => el !== adapter);
                    this.deletingAdapter = undefined;
                }, err => {
                    this._toast.error('Could not remove adapter', 'server error');
                    console.log(err);
                    this.deletingInProgress = this.deletingInProgress.filter(el => el !== adapter);
                    this.deletingAdapter = undefined;
                }
            );
        }
    }

    validate(form: AbstractControl, key) {
        if (form === undefined) {
            return;
        }

        if (form instanceof FormControl) {
            return this.validateControl(form, key);
        }
        if (!(form instanceof FormGroup)) {
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
            case 'Google':
                return path + 'google.png';default:
                return 'fa fa-database';
        }
    }

    async refreshUsedDockerPorts() {
        const res = await this._crud.getUsedDockerPorts().toPromise();
        const ports = new Map<Number, Number[]>();
        Object.keys(res).forEach(k => {
            const values: Number[] = res[k].filter(e => e !== null);
            ports.set(Number(k), values);
        });
        this.usedDockerPorts = ports;
    }


    deployType(): FormGroup {
        if (this.activeMode) {
            return this.editingAvailableAdapterForms.get(this.activeMode) as FormGroup;
        }
        return null;
    }

    setMode(mode: string) {
        this.editingAvailableAdapterForm = this.editingAvailableAdapterForms.get(mode);
        this.activeMode = mode;
    }

    private validateControl(form: FormControl, key: string) {
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

    resetDeletingAdapter(adapter: Adapter) {
        if (this.deletingAdapter === adapter && this.deletingInProgress.includes(adapter)) {
            return;
        }
        this.deletingAdapter = undefined;
    }

    isDeleting(adapter: Adapter) {
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
function validateUniqueName(adapters: Adapter[]): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        if (!control.value) {
            return null;
        }
        for (const s of adapters) {
            if (s.uniqueName === control.value) {
                return {unique: true};
            }
        }
        return null;
    };
}


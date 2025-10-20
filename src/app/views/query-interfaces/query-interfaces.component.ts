import {Component, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {Subscription} from 'rxjs';
import {AbstractControl, UntypedFormControl, UntypedFormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {RelationalResult} from '../../components/data-view/models/result-set.model';
import {QueryInterface, QueryInterfaceCreateRequest, QueryInterfaceSetting, QueryInterfaceTemplate} from './query-interfaces.model';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';

@Component({
    selector: 'app-query-interfaces',
    templateUrl: './query-interfaces.component.html',
    styleUrls: ['./query-interfaces.component.scss'],
    standalone: false
})
export class QueryInterfacesComponent implements OnInit, OnDestroy {

    private readonly _crud = inject(CrudService);
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    private readonly _sidebar = inject(LeftSidebarService);

    queryInterfaces: QueryInterface[];
    availableQueryInterfaces: QueryInterfaceTemplate[];
    route: String;
    routeListener;
    private subscriptions = new Subscription();

    editingQI: QueryInterface;
    editingQIForm: UntypedFormGroup;
    deletingQI;

    editingAvailableQI: QueryInterfaceTemplate;
    editingAvailableQIForm: UntypedFormGroup;
    availableQIUniqueNameForm: UntypedFormGroup;

    @ViewChild('QISettingsModal', {static: false}) public QISettingsModal: ModalDirective;

    constructor() {

    }

    ngOnInit() {
        this._sidebar.hide();
        this.getQueryInterfaces();
        this.getAvailableQueryInterfaces();
        this.route = this._route.snapshot.paramMap.get('action');
        this.routeListener = this._route.params.subscribe(params => {
            this.route = params['action'];
        });
        const sub = this._crud.onReconnection().subscribe(
            b => {
                if (b) {
                    this.getQueryInterfaces();
                    this.getAvailableQueryInterfaces();
                }
            }
        );
        this.subscriptions.add(sub);
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    getQueryInterfaces() {
        this._crud.getQueryInterfaces().subscribe({
            next: res => {
                const queryInterfaces = <QueryInterface[]>res;
                queryInterfaces.sort((a, b) => (a.uniqueName > b.uniqueName) ? 1 : -1);
                this.queryInterfaces = queryInterfaces;
            }, error: err => {
                console.log(err);
            }
        });
    }

    getAvailableQueryInterfaces() {
        this._crud.getAvailableQueryInterfaces().subscribe({
            next: availableQIs => {
                availableQIs.sort((a, b) => (a.interfaceType > b.interfaceType) ? 1 : -1);
                this.availableQueryInterfaces = availableQIs;
            }, error: err => {
                console.log(err);
            }
        });
    }

    onCloseModal() {
        this.editingQI = undefined;
        this.editingQIForm = undefined;
        this.editingAvailableQI = undefined;
        this.editingAvailableQIForm = undefined;
    }

    initQueryInterfaceSettings(queryInterface: QueryInterface) {
        this.editingQI = queryInterface;
        const fc = {};
        for (const [k, v] of Object.entries(this.editingQI.availableSettings)) {
            const validators = [];
            if (v.required) {
                validators.push(Validators.required);
            }
            const val = queryInterface.currentSettings[v.name];
            fc[v.name] = new UntypedFormControl({value: val, disabled: !v.modifiable}, validators);
        }
        this.editingQIForm = new UntypedFormGroup(fc);
        this.QISettingsModal.show();
    }

    saveQISettings() {
        const queryInterface = <any>this.editingQI;
        queryInterface.availableSettings = null;
        for (const [k, v] of Object.entries(this.editingQIForm.controls)) {
            if (!v.disabled) {
                queryInterface.currentSettings[k] = v.value;
            } else {
                //remove disabled (=non-modifiable) entries, else the backend will throw an exception
                delete queryInterface.currentSettings[k];
            }
        }
        console.log('submitting query interface settings', queryInterface);
        this._crud.updateQueryInterfaceSettings(queryInterface).subscribe({
            next: res => {
                const result = <RelationalResult>res;
                if (!result?.error) {
                    this._toast.success('Updated Query Interface settings');
                } else {
                    this._toast.exception(result);
                }
                this.QISettingsModal.hide();
                this.getQueryInterfaces();
            }, error: err => {
                this._toast.error('Could not update Query Interface settings');
                console.log(err);
            }
        });
    }

    initAvailableQISettings(availableQI: QueryInterfaceTemplate) {
        this.editingAvailableQI = availableQI;
        const fc = {};
        for (const [k, v] of Object.entries(this.editingAvailableQI.availableSettings)) {
            const validators = [];
            if (v.required) {
                validators.push(Validators.required);
            }
            let val = v.defaultValue;
            if (v.options) {
                val = v.options[0];
            }
            fc[v.name] = new UntypedFormControl(val, validators);
        }
        this.editingAvailableQIForm = new UntypedFormGroup(fc);
        this.availableQIUniqueNameForm = new UntypedFormGroup({
            uniqueName: new UntypedFormControl(null, [Validators.required, Validators.pattern(this._crud.getValidationRegex()), validateUniqueQI(this.queryInterfaces)])
        });
        this.QISettingsModal.show();
    }

    getFeedback() {
        const errors = this.availableQIUniqueNameForm.controls['uniqueName'].errors;
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

    getAvailableQISetting(availableQI, key: string): QueryInterfaceSetting {
        return availableQI.availableSettings.filter((a, i) => a.name === key)[0];
    }

    addQueryInterface() {
        if (!this.editingAvailableQIForm.valid) {
            return;
        }
        if (!this.availableQIUniqueNameForm.valid) {
            return;
        }
        const deploy: QueryInterfaceCreateRequest = {
            interfaceType: this.editingAvailableQI.interfaceType,
            uniqueName: this.availableQIUniqueNameForm.controls['uniqueName'].value,
            settings: new Map()
        };
        for (const [k, v] of Object.entries(this.editingAvailableQIForm.controls)) {
            deploy.settings[k] = v.value;
        }
        this._crud.createQueryInterface(deploy).subscribe({
            next: _ => {
                this._toast.success('Added query interface: ' + deploy.uniqueName);
                this._router.navigate(['./../'], {relativeTo: this._route});
                this.QISettingsModal.hide();
            }, error: err => {
                this._toast.error('Could not add query interface: ' + deploy.uniqueName);
                console.log(err);
            }
        });
    }

    removeQueryInterface(queryInterface: QueryInterface) {
        if (this.deletingQI !== queryInterface) {
            this.deletingQI = queryInterface;
        } else {
            this._crud.removeQueryInterface(queryInterface.uniqueName).subscribe({
                next: res => {
                    const result = <RelationalResult>res;
                    if (!result.error) {
                        this._toast.success('Removed query interface: ' + queryInterface.uniqueName, result.query);
                        this.getQueryInterfaces();
                    } else {
                        this._toast.exception(result);
                    }
                }, error: err => {
                    this._toast.error('Could not remove query interface: ' + queryInterface.uniqueName, 'server error');
                    console.log(err);
                }
            });
        }
    }

    validate(form: UntypedFormGroup, key) {
        if (form === undefined) {
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

}

// see https://angular.io/guide/form-validation#custom-validators
function validateUniqueQI(queryInterfaces: QueryInterface[]): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        if (!control.value) {
            return null;
        }
        for (const s of queryInterfaces) {
            if (s.uniqueName === control.value) {
                return {unique: true};
            }
        }
        return null;
    };
}

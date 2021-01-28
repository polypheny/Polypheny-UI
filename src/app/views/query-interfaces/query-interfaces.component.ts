import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {Subscription} from 'rxjs';
import {AbstractControl, FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastService} from '../../components/toast/toast.service';
import {ResultSet} from '../../components/data-view/models/result-set.model';
import {QueryInterface, QueryInterfaceInformation, QueryInterfaceInformationRequest, QueryInterfaceSetting} from './query-interfaces.model';

@Component({
  selector: 'app-query-interfaces',
  templateUrl: './query-interfaces.component.html',
  styleUrls: ['./query-interfaces.component.scss']
})
export class QueryInterfacesComponent implements OnInit, OnDestroy {

  queryInterfaces: QueryInterface[];
  availableQueryInterfaces: QueryInterfaceInformation[];
  route: String;
  routeListener;
  private subscriptions = new Subscription();

  editingQI: QueryInterface;
  editingQIForm: FormGroup;
  deletingQI;

  editingAvailableQI: QueryInterfaceInformation;
  editingAvailableQIForm: FormGroup;
  availableQIUniqueNameForm: FormGroup;

  @ViewChild('QISettingsModal', {static: false}) public QISettingsModal: ModalDirective;

  constructor(
    private _crud: CrudService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _toast: ToastService
  ) { }

  ngOnInit() {
    this.getQueryInterfaces();
    this.getAvailableQueryInterfaces();
    this.route = this._route.snapshot.paramMap.get('action');
    this.routeListener = this._route.params.subscribe(params => {
      this.route = params['action'];
    });
    const sub = this._crud.onReconnection().subscribe(
      b => {
        if(b) {
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

  getQueryInterfaces(){
    this._crud.getQueryInterfaces().subscribe(
      res => {
        const queryInterfaces = <QueryInterface[]> res;
        queryInterfaces.sort((a, b) => (a.uniqueName > b.uniqueName) ? 1 : -1);
        this.queryInterfaces = queryInterfaces;
      }, err => {
        console.log(err);
      }
    );
  }

  getAvailableQueryInterfaces(){
    this._crud.getAvailableQueryInterfaces().subscribe(
      res => {
        const availableQIs = <QueryInterfaceInformation[]> res;
        availableQIs.sort((a, b) => (a.name > b.name) ? 1 : -1);
        this.availableQueryInterfaces = <QueryInterfaceInformation[]> res;
      }, err => {
        console.log(err);
      }
    );
  }

  onCloseModal(){
    this.editingQI = undefined;
    this.editingQIForm = undefined;
    this.editingAvailableQI = undefined;
    this.editingAvailableQIForm = undefined;
  }

  initQueryInterfaceSettings(queryInterface: QueryInterface ){
    this.editingQI = queryInterface;
    const fc = {};
    for (const [k, v] of Object.entries(this.editingQI.availableSettings)) {
      const validators = [];
      if (v.required) {
        validators.push(Validators.required);
      }
      const val = queryInterface.currentSettings[v.name];
      fc[v.name] = new FormControl({value: val, disabled: !v.modifiable}, validators);
    }
    this.editingQIForm = new FormGroup( fc );
    this.QISettingsModal.show();
  }

  saveQISettings(){
    const queryInterface = <any> this.editingQI;
    queryInterface.availableSettings = null;
    for( const [k,v] of Object.entries( this.editingQIForm.controls )){
      if(!v.disabled){
        queryInterface.currentSettings[k] = v.value;
      } else {
        //remove disabled (=non-modifiable) entries, else the backend will throw an exception
        delete queryInterface.currentSettings[k];
      }
    }
    this._crud.updateQueryInterfaceSettings( queryInterface ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( !result.error ) {
          this._toast.success('updated queryInterface settings');
        } else {
          this._toast.exception( result );
        }
        this.QISettingsModal.hide();
        this.getQueryInterfaces();
      }, err => {
        this._toast.error('could not update queryInterface settings');
        console.log(err);
      }
    );
  }

  initAvailableQISettings(availableQI: QueryInterfaceInformation ){
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
      fc[v.name] = new FormControl(val, validators);
    }
    this.editingAvailableQIForm = new FormGroup( fc );
    this.availableQIUniqueNameForm = new FormGroup({
      uniqueName: new FormControl(null, [Validators.required, Validators.pattern( this._crud.getValidationRegex() ), validateUniqueQI(this.queryInterfaces)])
    });
    this.QISettingsModal.show();
  }

  getFeedback(){
    const errors = this.availableQIUniqueNameForm.controls['uniqueName'].errors;
    if( errors ){
      if (errors.required) { return 'missing unique name'; }
      else if (errors.pattern) { return 'invalid unique name'; }
      else if (errors.unique) { return 'name is not unique'; }
    }
    return '';
  }

  getAvailableQISetting(availableQI, key: string ): QueryInterfaceSetting{
    return availableQI.availableSettings.filter((a, i) => a.name === key)[0];
  }

  addQueryInterface(){
    if(!this.editingAvailableQIForm.valid) { return; }
    if(!this.availableQIUniqueNameForm.valid) { return; }
    const deploy: QueryInterfaceInformationRequest = {
      uniqueName: this.availableQIUniqueNameForm.controls['uniqueName'].value,
      clazzName: this.editingAvailableQI.clazz,
      currentSettings: {}
    };
    for( const [k,v] of Object.entries( this.editingAvailableQIForm.controls )){
      deploy.currentSettings[k] = v.value;
    }
    this._crud.addQueryInterface( deploy ).subscribe(
      res => {
        const result = <ResultSet> res;
        if( !result.error ){
          this._toast.success('Added query interface');
          this._router.navigate(['./../'], {relativeTo: this._route});
        } else {
          this._toast.exception( result );
        }
        this.QISettingsModal.hide();
      }, err => {
        this._toast.error('Could not add query interface');
        console.log(err);
      }
    );
  }

  removeQueryInterface(queryInterface: QueryInterface ){
    if( this.deletingQI !== queryInterface ){
      this.deletingQI = queryInterface;
    } else {
      this._crud.removeQueryInterface( queryInterface.uniqueName ).subscribe(
        res => {
          const result = <ResultSet> res;
          if(!result.error){
            this._toast.success('Removed queryInterface');
            this.getQueryInterfaces();
          }else{
            this._toast.exception( result );
          }
        }, err => {
          this._toast.error('Could not remove queryInterface', 'server error');
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

}

// see https://angular.io/guide/form-validation#custom-validators
function validateUniqueQI(queryInterfaces: QueryInterface[]): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    if(! control.value) { return null; }
    for(const s of queryInterfaces ){
      if( s.uniqueName === control.value ) { return {unique: true}; }
    }
    return null;
  };
}

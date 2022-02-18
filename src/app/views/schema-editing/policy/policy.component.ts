import {Component, OnDestroy, OnInit} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';
import {PolicyBooleanChangeRequest, PolicyRequest} from '../../../models/ui-request.model';
import {PolicySet} from '../../../components/data-view/models/result-set.model';

@Component({
  selector: 'app-policy',
  templateUrl: './policy.component.html',
  styleUrls: ['./policy.component.scss']
})
export class PolicyComponent implements OnInit, OnDestroy {


  subscriptions = new Subscription();
  tableId: string;
  policySet: PolicySet;
  policySetToChoose: PolicySet;

  constructor(
      private _crud: CrudService,
      private _route: ActivatedRoute,
      private _leftSidebar: LeftSidebarService,
      private _router: Router,
      private _toast: ToastService
  ) {
  }

  ngOnInit(): void {
    this.tableId = this._route.snapshot.paramMap.get('id');
    this.getPolicies(this.tableId);
    this.getAllPossiblePolicies(this.tableId);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  getPolicies(tableId: string) {
    this._crud.getPolicies(new PolicyRequest(tableId)).subscribe(
        res => {
          this.policySet = <PolicySet>res;
          console.log(this.policySet);
          console.log(res);
        }, err => {
          this.policySet = null;
          this._toast.warn('There is an issue with the default policies.');

        }
    );
  }

  getAllPossiblePolicies(tableId: string){
    this._crud.getAllPossiblePolicies(new  PolicyRequest(tableId)).subscribe(
        res =>{
          console.log('get all possible policies');
          console.log(res);
          this.policySetToChoose = <PolicySet>res;


        }, err =>{
          this._toast.warn('Not possible to show all possible policies.');
        }
    );
  }


  setBooleanPolicies(checked: boolean, oldValue: boolean, target: string, id: number) {

    this._crud.setPolicies(new PolicyBooleanChangeRequest(id, target, !oldValue)).subscribe(
        res => {
          this._toast.success('Policy successfully changed.');
        },
        err => {
          this._toast.warn('Not possible to change this policy, already existing settings go against it.');
        }
    );
    this.getPolicies(this.tableId);
  }


  saveBooleanPoliciesBeforeSaving(checked: boolean, oldValue: boolean, target: string, id: number) {

  }


  booleanPolicySwitch() {
    return true;
  }

  addPolicy() {

  }
}

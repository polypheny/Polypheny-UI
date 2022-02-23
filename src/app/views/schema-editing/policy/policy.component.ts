import {Component, OnDestroy, OnInit} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';
import {PolicyBooleanChangeRequest, PolicyChangeRequest, PolicyRequest} from '../../../models/ui-request.model';
import {Policies, Policy, PolicySet} from '../../../components/data-view/models/result-set.model';

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
  addPoliciesKind = 'Addition';
  activePoliciesKind = 'Active';

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
          const policies = <Policies>res;
          this.policySet = policies.policies;

          if (policies.policies === null) {
            this._toast.warn(policies.errormessage);
          }
        }, err => {
          this.policySet = null;
          this._toast.warn('There is an issue with the default policies.');

        }
    );
  }

  getAllPossiblePolicies(tableId: string) {
    this._crud.getAllPossiblePolicies(new PolicyRequest(tableId)).subscribe(
        res => {
          const policies = <Policies>res;
          this.policySetToChoose = policies.policies;

          if (policies.policies === null) {
            this._toast.warn(policies.errormessage);
          }
        }, err => {
          this._toast.warn('Not possible to show all possible policies.');
        }
    );
  }


  setBooleanPolicies(policy: Policy) {

    this._crud.setPolicies(new PolicyBooleanChangeRequest(policy.clause.clauseName, policy.target, !policy.clause.value)).subscribe(
        res => {
          this._toast.success('Policy successfully changed.');
        },
        err => {
          this._toast.warn('Not possible to change this policy, already existing settings go against it.');
        }
    );
    this.getPolicies(this.tableId);
  }





  addPolicy(policy: Policy) {

    this._crud.addPolicy(new PolicyBooleanChangeRequest(policy.clause.clauseName, policy.target, policy.clause.value, policy.targetId)).subscribe(
        res => {
          this.getPolicies(this.tableId);
          this.getAllPossiblePolicies(this.tableId);
        },
        err => {
          this._toast.warn('Not possible to add this policy, already existing settings go against it.');
        }
    );
  }

  deletePolicy(policy: Policy) {

    this._crud.deletePolicy(new PolicyChangeRequest('deleteRequest', policy.clause.clauseName, policy.target, policy.targetId)).subscribe(
        res => {
          this.getPolicies(this.tableId);
          this.getAllPossiblePolicies(this.tableId);
        },
        err => {
          this._toast.warn('Not possible to delete this Policy.');
        }
    );

  }
}

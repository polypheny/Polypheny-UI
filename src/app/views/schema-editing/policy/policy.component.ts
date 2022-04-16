import {Component, OnDestroy, OnInit} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';
import {ClauseBooleanChangeRequest, ClauseChangeRequest, ClauseRequest} from '../../../models/ui-request.model';
import {Clauses, Policy} from '../../../components/data-view/models/result-set.model';

@Component({
  selector: 'app-policy',
  templateUrl: './policy.component.html',
  styleUrls: ['./policy.component.scss']
})
export class PolicyComponent implements OnInit, OnDestroy {


  subscriptions = new Subscription();
  tableId: string;
  policySet: Policy[];
  policySetToChoose: Policy[];
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
    this.getClauses(this.tableId);
    this.getAllPossiblePolicies(this.tableId);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }


  getClauses(tableId: string) {
    this._crud.getClauses(new ClauseRequest(tableId)).subscribe(
        res => {
          const policies = <Clauses>res;
          this.policySet = policies.policies;
          if (this.policySet === null) {
            this._toast.warn(policies.errormessage);
          }
        }, err => {
          this.policySet = null;
          this._toast.warn('There is an issue with the default policies.');

        }
    );
  }

  getAllPossiblePolicies(tableId: string) {
    this._crud.getAllPossibleClauses(new ClauseRequest(tableId)).subscribe(
        res => {
          const policies = <Clauses>res;
          this.policySetToChoose = policies.policies;
          if (this.policySetToChoose === null) {
            this._toast.warn(policies.errormessage);
          }
        }, err => {
          this._toast.warn('Not possible to show all possible policies.');
        }
    );
  }


  setBooleanPolicies(policy: Policy) {
    this._crud.setClauses(new ClauseBooleanChangeRequest(policy.clause.clauseName, policy.target, !policy.clause.value)).subscribe(
        res => {
          if (res !== null) {
            const clause = <Clauses>res;
            this._toast.warn(clause.errormessage);
          }else{
            this._toast.success('Policy successfully changed.');
            this.getClauses(this.tableId);
          }
        },
        err => {
          this._toast.warn('Error while changing clause.');
        }
    );

  }

  addPolicy(policy: Policy) {
    this._crud.addClause(new ClauseBooleanChangeRequest(policy.clause.clauseName, policy.target, policy.clause.value, policy.targetId)).subscribe(
        res => {
          if (res !== null) {
            const clause = <Clauses>res;
            this._toast.warn('addPolicy' + clause.errormessage);
          }
          this.getClauses(this.tableId);
          this.getAllPossiblePolicies(this.tableId);
        },
        err => {
          this._toast.warn('Not possible to add this policy, already existing settings go against it.');
        }
    );

  }

  deletePolicy(policy: Policy) {
    this._crud.deleteClause(new ClauseChangeRequest('deleteRequest', policy.clause.clauseName, policy.target, policy.targetId)).subscribe(
        res => {

          if (res !== null) {
            const clause = <Clauses>res;
            this._toast.warn(clause.errormessage);
          }
          this.getClauses(this.tableId);
          this.getAllPossiblePolicies(this.tableId);
        },
        err => {
          this._toast.warn('Not possible to delete this Policy.');
        }
    );

  }

  selfAdaptSystem() {
    this._crud.selfAdaptSystem().subscribe(
        res =>{
          this._toast.warn('System has been adapted.');
        },
        err=>{
          this._toast.warn('There was an issue while adapting the system.');
        }
    );
  }
}

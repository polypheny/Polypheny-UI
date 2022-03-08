import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Policy} from '../../../../components/data-view/models/result-set.model';

@Component({
  selector: 'app-policy-collapse',
  templateUrl: './policy-collapse.component.html',
  styleUrls: ['./policy-collapse.component.scss']
})
export class PolicyCollapseComponent implements OnInit, OnDestroy {

  showInformation:boolean;
  booleanValue:boolean;
  @Input()
  kind: string;
  @Output()
  policyChange = new EventEmitter<Policy>();
  @Output()
  changeBoolValue = new EventEmitter<Policy>();
  sorted: Map<string, any>;

  constructor() {
  }

  ngOnInit(): void {
    if(this.kind === 'Addition' ){
      this.showInformation = false;
    }else if (this.kind === 'Active'){
      this.showInformation = true;
    }
  }

  ngOnDestroy() {
  }

  toggleShowInformation() {
    this.showInformation = !this.showInformation;
  }

  setBooleanPolicies(policy: Policy) {
    this.changeBoolValue.emit(policy);
  }

  getTitle() {
    if(this.kind === 'Addition' ){
      return 'Add Clause';
    }else if (this.kind === 'Active'){
      return 'Active Clauses';
    }
  }

  changePolicy(policy) {
    this.policyChange.emit(<Policy>policy);
  }

  getButtonName() {
    if(this.kind === 'Addition' ){
      return 'Add Clause';
    }else if (this.kind === 'Active'){
      return 'Delete Clause';
    }
  }

  @Input()
  set policyInfo(policyInfo: Policy[]){
    this.sorted = new Map<string, any>();
    if(policyInfo != null){
      for (const policy of policyInfo) {
        if( !this.sorted.has(policy.clause.category)){
          this.sorted.set(policy.clause.category, [policy]);
        }else{
          this.sorted.get(policy.clause.category).push(policy);
        }
      }
    }
  }

  getPolicies(value) {
    return <Policy[]> value;
  }
}

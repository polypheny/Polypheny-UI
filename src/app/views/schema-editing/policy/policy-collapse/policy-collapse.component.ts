import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Policy, PolicySet} from '../../../../components/data-view/models/result-set.model';

@Component({
  selector: 'app-policy-collapse',
  templateUrl: './policy-collapse.component.html',
  styleUrls: ['./policy-collapse.component.scss']
})
export class PolicyCollapseComponent implements OnInit, OnDestroy {

  showInformation:boolean;
  booleanValue:boolean;
  @Input()
  policyInfo: PolicySet;
  @Input()
  kind: string;
  @Output()
  policyChange = new EventEmitter<Policy>();
  @Output()
  changeBoolValue = new EventEmitter<Policy>();


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
      return 'Add Policy';
    }else if (this.kind === 'Active'){
      return 'Active Policies';
    }
  }

  changePolicy(policy: Policy) {
    this.policyChange.emit(policy);
  }

  getButtonName() {
    if(this.kind === 'Addition' ){
      return 'Add Policy';
    }else if (this.kind === 'Active'){
      return 'Delete Policy';
    }
  }

}

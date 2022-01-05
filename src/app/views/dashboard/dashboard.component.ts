import {Component, OnDestroy, OnInit,} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {MonitoringRequest} from '../../models/ui-request.model';
import {DashboardData} from '../../components/data-view/models/result-set.model';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})


export class DashboardComponent implements OnInit, OnDestroy{
  data = [];
  labels = [];
  line = 'line';
  showDml = false;
  min = 0;
  max = 0;
  test= [];

  constructor(
      public _crud: CrudService
  ) {
  }

  ngOnInit(){
    this.getDmlInformation();
  }

  ngOnDestroy() {

  }

  getDmlInformation() {
    this.data = [];
    this.labels = [];
    this._crud.getDmlInformation(new MonitoringRequest()).subscribe(
        res =>{
          console.log(res);
          const information = <DashboardData>res;


          for (const key in information) {
            const num = information[key];



            this.labels.push(key);
            this.data.push(num);

            if(this.min > num){
              this.min = num;
            }
            if(this.max < num){
              this.max = num;
            }

          }

          console.log(this.labels);
          console.log(this.max);

          this.test = [{
            label: 'DML Information',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: this.data

          }];

          console.log(this.data);
          console.log(this.labels);



        }
    );

  }

  getQueryInformation() {

  }

  show() {
    this.showDml = true;
  }
}


export class InformationDashboard{
  backgroundColor: string;
  borderColor: string;
  data: any[];
  label: string;
  pointBackgroundColor: string;
  pointBorderColor: string;
  pointHoverBackgroundColor: string;
  pointHoverBorderColor: string;

  constructor() {
  }
}

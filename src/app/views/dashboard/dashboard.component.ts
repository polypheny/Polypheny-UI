import {Component, OnDestroy, OnInit,} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {MonitoringRequest, StatisticRequest} from '../../models/ui-request.model';
import {DashboardData, DashboardSet} from '../../components/data-view/models/result-set.model';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})


export class DashboardComponent implements OnInit, OnDestroy {
  dataDml = [];
  dataDql = [];
  labels = [];
  line = 'line';
  min = 0;
  max = 0;
  diagram = [];

  dashboardSet: DashboardSet;
  dashboardInformation: DashboardData;


  constructor(
      public _crud: CrudService
  ) {
  }

  ngOnInit() {
    this.getDmlInformation();
    this.getDashboardInformation();
  }

  ngOnDestroy() {

  }

  getDmlInformation() {
    this.dataDml = [];
    this.dataDql = [];
    this.labels = [];
    this._crud.getDashboardDiagram(new MonitoringRequest()).subscribe(
        res => {
          this.dashboardInformation = <DashboardData>res;

          Object.entries(this.dashboardInformation).forEach(
              ([key, value]) => {
                this.labels.push(key);

                this.dataDml.push(value.right);
                this.dataDql.push(value.left);

                this.updateMinMax(value.right);
                this.updateMinMax(value.left);
              }
          );

          this.diagram = [{
            label: 'DML Information',
            borderColor: 'rgb(255, 99, 132)',
            data: this.dataDml
          },
            {
              label: 'DQL Information',
              borderColor: 'rgb(18,105,199)',
              data: this.dataDql
            }];
        }
    );

  }


  private updateMinMax(value: number) {
    if (this.min > value) {
      this.min = value;
    }
    if (this.max < value) {
      this.max = value;
    }
  }

  getDashboardInformation() {
    this._crud.getDashboardInformation(new StatisticRequest()).subscribe(
        res => {
          this.dashboardSet = <DashboardSet>res;
        }
    );
  }
}

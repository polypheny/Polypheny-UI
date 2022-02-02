import {Component, OnDestroy, OnInit,} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {MonitoringRequest, StatisticRequest} from '../../models/ui-request.model';
import {DashboardData, DashboardSet} from '../../components/data-view/models/result-set.model';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})


export class DashboardComponent implements OnInit, OnDestroy {
  dataWorkload = [];
  dataDql = [];
  labels = [];
  line = 'line';
  min = 0;
  max = 0;
  diagram = [];

  dashboardSet: DashboardSet;
  dashboardInformation: DashboardData;
  xLabel: string;
  yLabel: string;
  maintainAspectRatio = false;
  digramInterval: number;

  constructor(
      public _crud: CrudService
  ) {
  }

  ngOnInit() {
    this.getDiagram(this._crud);
    this.getDashboardInformation();
    this.digramInterval = setInterval(this.getDiagram, 10000, this._crud);
  }

  ngOnDestroy() {
  clearInterval(this.digramInterval);
  }

  getDiagram(crud: CrudService) {
    this.dataWorkload = [];
    this.dataDql = [];
    this.labels = [];
    crud.getDashboardDiagram(new MonitoringRequest()).subscribe(
        res => {
          this.dashboardInformation = <DashboardData>res;

          Object.entries(this.dashboardInformation).forEach(
              ([key, value]) => {
                this.labels.push(key);

                this.dataWorkload.push(value.right);
                this.dataDql.push(value.left);


                //find min and max between Workload and Query Information
                if (this.min > value.right) {
                  this.min = value.right;
                }
                if (this.max < value.right) {
                  this.max = value.right;
                }
                if (this.min > value.left) {
                  this.min = value.left;
                }
                if (this.max < value.left) {
                  this.max = value.left;
                }
              }
          );
        }
    );

    this.diagram = [{
      label: 'Workload Information',
      borderColor: 'rgb(255, 99, 132)',
      data: this.dataWorkload,
    },
      {
        label: 'Query Information',
        borderColor: 'rgb(18,105,199)',
        data: this.dataDql
      }];

    this.xLabel = 'Time';
    this.yLabel = 'Number of Statements';

  }

  getDashboardInformation() {
    this._crud.getDashboardInformation(new StatisticRequest()).subscribe(
        res => {
          this.dashboardSet = <DashboardSet>res;
        }
    );
  }
}

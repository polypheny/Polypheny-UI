import {Component, OnDestroy, OnInit,} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {MonitoringRequest, StatisticRequest} from '../../models/ui-request.model';
import {DashboardData, DashboardSet, WorkloadInfo, WorkloadSet} from '../../components/data-view/models/result-set.model';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';


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
  diagram = [];

  diagramWorkload = [];
  dataJoin = [];
  dataAggregate = [];
  dataSort = [];
  dataFilter = [];
  labelsWorkload = [];
  workloadSet: WorkloadSet;

  diagramExecutionTime = [];
  executionTime = [];

  dashboardSet: DashboardSet;
  dashboardInformation: DashboardData;
  xLabel: string;
  yLabel: string;
  maintainAspectRatio = false;
  digramInterval: number;
  informationInterval: number;
  workloadSetInterval: number;

  infoCounter: number;
  diagramCounter: number;
  workloadSetCounter: number;


  constructor(
      public _crud: CrudService,
      private _breadcrumb: BreadcrumbService
  ) {
  }

  ngOnInit() {
    this.infoCounter = 0;
    this.diagramCounter = 0;

    this.getDiagram();
    this.getDashboardInformation();
    this.checkIfInformationAvailable();
    this.getWorkloadInformation();
  }

  ngOnDestroy() {
    clearInterval(this.digramInterval);
    clearInterval(this.informationInterval);
  }


  private checkIfInformationAvailable() {
    if (this.dashboardInformation == null) {
      this.digramInterval = setInterval(this.getDiagram.bind(this), 1000);
    }
    if (this.dashboardSet == null) {
      this.informationInterval = setInterval(this.getDashboardInformation.bind(this), 1000);
    }
    if (this.workloadSet == null) {
      this.workloadSetInterval = setInterval(this.getDashboardInformation.bind(this), 1000);
    }
  }


  getDiagram() {
    this.dataWorkload = [];
    this.dataDql = [];
    this.labels = [];
    this._crud.getDashboardDiagram(new MonitoringRequest()).subscribe(
        res => {
          this.dashboardInformation = <DashboardData>res;

          if (this.dashboardInformation != null || this.diagramCounter > 120) {
            clearInterval(this.digramInterval);
            Object.entries(this.dashboardInformation).forEach(
                ([key, value]) => {
                  this.labels.push(key);

                  this.dataWorkload.push(value.right);
                  this.dataDql.push(value.left);
                }
            );
          }
          this.diagramCounter++;
        }

    );

    this.diagram = [{
      label: 'DML',
      borderColor: 'rgb(255, 99, 132)',
      data: this.dataWorkload,
    },
      {
        label: 'DQL',
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
          if(this.dashboardSet != null || this.infoCounter > 120){
            clearInterval(this.informationInterval);
          }
          this.infoCounter++;
        }
    );
  }

  getWorkloadInformation(){
    this.diagramWorkload = [];
    this.dataJoin = [];
    this.dataAggregate = [];
    this.dataSort = [];
    this.dataFilter = [];

    this.diagramExecutionTime = [];
    this.executionTime = [];

    this._crud.getWorkloadInformation().subscribe(
        res =>{
          this.workloadSet = <WorkloadSet>res;

          if(this.workloadSet != null || this.workloadSetCounter > 120){
            clearInterval(this.workloadSetInterval);
            Object.entries(this.workloadSet).forEach(
                ([key, value]) =>{
                  this.labelsWorkload.push(key);
                  this.dataAggregate.push((<WorkloadInfo>value).aggregateInformation.overAllCount);
                  this.dataJoin.push((<WorkloadInfo>value).joinInformation.joinCount);
                  this.dataSort.push((<WorkloadInfo>value).sortCount);
                  this.dataFilter.push((<WorkloadInfo>value).filterCount);

                  this.executionTime.push((<WorkloadInfo>value).executionTime);

                }
            );
            this.workloadSetCounter++;
          }
        }
    );


    this.diagramWorkload = [{
      label: 'Join',
      borderColor: 'rgb(255, 99, 132)',
      data: this.dataJoin
    },
      {
        label: 'Aggregate',
        borderColor: 'rgb(18,105,199)',
        data: this.dataAggregate
      },
      {
        label: 'Filter',
        borderColor: 'rgb(232,197,17)',
        data: this.dataFilter
      },
      {
        label: 'Sort',
        borderColor: 'rgb(42,46,51)',
        data: this.dataSort
      }];

    this.diagramExecutionTime = [{
      label: 'average execution time for query',
      borderColor: 'rgb(255, 99, 132)',
      data: this.executionTime
    }];


  }


}

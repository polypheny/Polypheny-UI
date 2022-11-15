import {Component, OnDestroy, OnInit,} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {MonitoringRequest, StatisticRequest} from '../../models/ui-request.model';
import {DashboardData, DashboardSet} from '../../components/data-view/models/result-set.model';
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
  colorList = [];
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
  informationInterval: number;
  infoCounter: number;
  diagramCounter: number;
  selectIntervalDisplay = 'All';

  constructor(
      public _crud: CrudService,
      private _breadcrumb: BreadcrumbService
  ) {
  }

  ngOnInit() {
    this.infoCounter = 0;
    this.diagramCounter = 0;

    this.getDiagram('all');
    this.getDashboardInformation();
    this.checkIfInformationAvailable();
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
  }


  getDiagram(interval: string) {
    this.dataWorkload = [];
    this.dataDql = [];
    this.labels = [];
    this.min = 0;
    this.max = 0;
    this._crud.getDashboardDiagram(new MonitoringRequest(interval)).subscribe(
        res => {
          this.dashboardInformation = <DashboardData>res;

          if (this.dashboardInformation != null || this.diagramCounter > 120) {
            clearInterval(this.digramInterval);
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

  public setSelectInterval(interval: string){
    if( interval === 'all' ){
      this.selectIntervalDisplay = 'All';
    }
    const numberInterval = Number(interval);

    if( isNaN(numberInterval) ){
      this.selectIntervalDisplay = 'All';
    }else{
      this.selectIntervalDisplay = this.getIntervalString(numberInterval);
    }

    this.getDiagram(interval);
  }

  private getIntervalString(numberInterval: number):string {
    const hours = Math.floor(numberInterval/60 );

    const minutes = numberInterval % 60;

    return (hours > 0 ? ( '' + hours + (hours === 1 ? ' hour' : ' hours' )) : '' ) + (minutes > 0 ? ( '' + minutes + (minutes === 1 ? ' minute' : ' minutes' )) : '' ) ;
  }
}

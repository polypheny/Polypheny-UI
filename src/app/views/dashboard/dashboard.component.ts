import {Component, inject, OnDestroy, OnInit,} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {MonitoringRequest, StatisticRequest} from '../../models/ui-request.model';
import {DashboardData, DashboardSet} from '../../components/data-view/models/result-set.model';
import {CatalogService} from '../../services/catalog.service';


@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})


export class DashboardComponent implements OnInit, OnDestroy {
    public readonly _crud = inject(CrudService);
    public readonly _catalog = inject(CatalogService);

    dataDml = [];
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
    diagramInterval: number;
    informationInterval: number;
    infoCounter: number;
    diagramCounter: number;
    selectIntervalDisplay = 'All';

    constructor() {
    }

    ngOnInit() {
        this.infoCounter = 0;
        this.diagramCounter = 0;

        this.getDiagram('all');
        this.getDashboardInformation();
        this.checkIfInformationAvailable();

    }

    ngOnDestroy() {
        clearInterval(this.diagramInterval);
        clearInterval(this.informationInterval);
    }


    private checkIfInformationAvailable() {
        if (this.dashboardInformation == null) {
            this.diagramInterval = setInterval(this.getDiagram.bind(this), 1000);
        }
        if (this.dashboardSet == null) {
            this.informationInterval = setInterval(this.getDashboardInformation.bind(this), 1000);
        }
    }


    getDiagram(interval: string) {
        this.dataDml = [];
        this.dataDql = [];
        this.labels = [];
        this.min = 0;
        this.max = 0;
        this._crud.getDashboardDiagram(new MonitoringRequest(interval)).subscribe(
            res => {
                this.dashboardInformation = <DashboardData>res;

                if (this.dashboardInformation != null || this.diagramCounter > 120) {
                    clearInterval(this.diagramInterval);

                    Object.entries(this.dashboardInformation).forEach(
                        ([key, {'left': dql, 'right': dml}]) => {
                            const timestamp = key && key.length > 10 ? key.substring(0, key.length - 10) : key;
                            this.labels.push(timestamp);
                            this.dataDml.push(dml);
                            this.dataDql.push(dql);

                            //find min and max between Workload and Query Information
                            if (this.min > dml) {
                                this.min = dml;
                            }
                            if (this.max < dml) {
                                this.max = dml;
                            }
                            if (this.min > dql) {
                                this.min = dql;
                            }
                            if (this.max < dql) {
                                this.max = dql;
                            }
                        }
                    );
                }
                this.diagramCounter++;
            }
        );

        this.diagram = [
            {
                label: 'DML',
                borderColor: 'rgb(255, 99, 132)',
                data: this.dataDml,
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

                if (this.dashboardSet != null || this.infoCounter > 120) {
                    clearInterval(this.informationInterval);
                }
                this.infoCounter++;
            }
        );
    }

    public setSelectInterval(interval: string) {
        if (interval === 'all') {
            this.selectIntervalDisplay = 'All';
        }
        const numberInterval = Number(interval);

        if (isNaN(numberInterval)) {
            this.selectIntervalDisplay = 'All';
        } else {
            this.selectIntervalDisplay = this.getIntervalString(numberInterval);
        }

        this.getDiagram(interval);
    }

    private getIntervalString(numberInterval: number): string {
        const hours = Math.floor(numberInterval / 60);

        const minutes = numberInterval % 60;

        return (hours > 0 ? ('' + hours + (hours === 1 ? ' hour' : ' hours')) : '') + (minutes > 0 ? ('' + minutes + (minutes === 1 ? ' minute' : ' minutes')) : '');
    }
}

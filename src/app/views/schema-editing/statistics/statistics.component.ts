import {Component, OnDestroy, OnInit} from '@angular/core';
import {StatisticColumnSet, StatisticTableSet} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {StatisticRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit, OnDestroy {


  subscriptions = new Subscription();
  tableId: string;
  statisticSet: StatisticTableSet;
  alphabeticStatisticSet: StatisticColumnSet;
  numericalStatisticSet: StatisticColumnSet;
  temporalStatisticSet: StatisticColumnSet;

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
    this.getTableStatistics(this.tableId);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  getTableStatistics(tableId: string) {
    this._crud.getTableStatistics(new StatisticRequest(tableId)).subscribe(
        res => {

          this.statisticSet = <StatisticTableSet>res;
          console.log(this.statisticSet);
          this.alphabeticStatisticSet = this.statisticSet.alphabeticColumn;
          this.numericalStatisticSet = this.statisticSet.numericalColumn;
          this.temporalStatisticSet = this.statisticSet.temporalColumn;
        }, err => {
          this._toast.warn('There are no statistics for this entity.');

        }
    );
  }


}

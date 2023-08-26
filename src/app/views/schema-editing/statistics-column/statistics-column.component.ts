import {Component, OnDestroy, OnInit} from '@angular/core';
import {StatisticColumnSet, StatisticTableSet} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {StatisticRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';

@Component({
  selector: 'app-statistics-column',
  templateUrl: './statistics-column.component.html',
  styleUrls: ['./statistics-column.component.scss']
})
export class StatisticsColumnComponent implements OnInit, OnDestroy {


  subscriptions = new Subscription();
  entityId: number;
  statisticSet: StatisticTableSet;
  alphabeticStatisticSet: StatisticColumnSet;
  numericalStatisticSet: StatisticColumnSet;
  temporalStatisticSet: StatisticColumnSet;

  constructor(
      private _crud: CrudService,
      private _route: ActivatedRoute,
      private _leftSidebar: LeftSidebarService,
      private _router: Router,
      private _toast: ToasterService
  ) {
  }

  ngOnInit(): void {
    this.getTableStatistics(this.entityId);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  getTableStatistics(entityId: number) {
    this._crud.getTableStatistics(new StatisticRequest(entityId)).subscribe({
      next: (res: StatisticTableSet) => {
        this.statisticSet = res;
        this.alphabeticStatisticSet = this.statisticSet.alphabeticColumn;
        this.numericalStatisticSet = this.statisticSet.numericalColumn;
        this.temporalStatisticSet = this.statisticSet.temporalColumn;
      }, error: err => {
        this._toast.warn('There are no statistics for this entity.');

      }
    });
  }


}

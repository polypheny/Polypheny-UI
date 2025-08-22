import {Component, inject, input, OnDestroy, OnInit} from '@angular/core';
import {StatisticColumnSet, StatisticTableSet} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {StatisticRequest} from '../../../models/ui-request.model';
import {Subscription} from 'rxjs';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {EntityModel} from '../../../models/catalog.model';
import _ from 'lodash';

@Component({
    selector: 'app-statistics-column',
    templateUrl: './statistics-column.component.html',
    styleUrls: ['./statistics-column.component.scss']
})
export class StatisticsColumnComponent implements OnInit, OnDestroy {

    entity = input.required<EntityModel>();

    private readonly _crud = inject(CrudService);
    private readonly _toast = inject(ToasterService);

    subscriptions = new Subscription();
    statisticSet: StatisticTableSet;
    alphabeticStatisticSet: StatisticColumnSet;
    numericalStatisticSet: StatisticColumnSet;
    temporalStatisticSet: StatisticColumnSet;

    constructor() {
    }

    ngOnInit(): void {
        this.getStatistics(this.entity().id);
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    getStatistics(entityId: number) {
        this._crud.getTableStatistics(new StatisticRequest(entityId)).subscribe({
            next: (res: StatisticTableSet) => {
                if (_.isEmpty(res)) {
                    this.statisticSet = null;
                    return;
                }
                this.statisticSet = res;
                this.alphabeticStatisticSet = this.statisticSet.alphabeticColumn;
                this.numericalStatisticSet = this.statisticSet.numericalColumn;
                this.temporalStatisticSet = this.statisticSet.temporalColumn;
            }, error: err => {
                this._toast.warn('Unable to retrieve statistics for this entity.');
            }
        });
    }


}

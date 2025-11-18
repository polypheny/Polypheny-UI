import {Component, computed, inject, input, OnDestroy, OnInit, signal} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {StatisticRequest} from '../../../models/ui-request.model';
import {Subscription} from 'rxjs';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {EntityModel} from '../../../models/catalog.model';
import _ from 'lodash';
import {TableStatistics} from '../../../components/data-view/models/result-set.model';

@Component({
    selector: 'app-statistics-column',
    templateUrl: './statistics-column.component.html',
    styleUrls: ['./statistics-column.component.scss'],
    standalone: false
})
export class StatisticsColumnComponent implements OnInit, OnDestroy {

    entity = input.required<EntityModel>();

    private readonly _crud = inject(CrudService);
    private readonly _toast = inject(ToasterService);

    subscriptions = new Subscription();
    readonly statistics = signal<TableStatistics>(null);
    readonly hasWorkload = computed<boolean>(() => {
        const c = this.statistics().calls;
        return c.numberOfSelects > 0 || c.numberOfInserts > 0 || c.numberOfDeletes > 0 || c.numberOfUpdates > 0;
    });
    readonly workloadData = computed<any>(() => {
        const c = this.statistics().calls;
        return {workloadData: {data: [c.numberOfDeletes, c.numberOfSelects, c.numberOfInserts, c.numberOfUpdates], label: 'workloadData'}};
    });

    loading = signal(true);

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
            next: (res: TableStatistics) => {
                if (_.isEmpty(res)) {
                    this.statistics.set(null);
                    return;
                }
                this.statistics.set(res);
                this.loading.set(false);
            }, error: err => {
                //this._toast.warn('Unable to retrieve statistics for this entity.');
                this.loading.set(false);
            }
        });
    }


}

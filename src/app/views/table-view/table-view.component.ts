import {Component, computed, effect, OnDestroy, OnInit, Signal, untracked} from '@angular/core';
import {DataTemplateComponent} from '../../components/data-view/data-template/data-template.component';
import {Router} from '@angular/router';
import {EntityType} from '../../models/catalog.model';
import {DataModel} from '../../models/ui-request.model';

@Component({
    selector: 'app-table-view',
    templateUrl: './table-view.component.html',
    styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent extends DataTemplateComponent implements OnInit, OnDestroy {

    readonly fullName: Signal<string>;
    private lastInitialTableRefreshRoute: string = null;

    // Reload Button:
    reload = () => {// we can preserve the "this" context
        if (!this.entity()) {
            return;
        }
        this.loading.set(true);
        this.refreshEntityData('button');
    }

    constructor(readonly _router: Router) {
        super();
        this.fullName = computed(() => <string>this.routeParams()['id']);

        // Newly selected table:
        effect(() => {
            const route = this.currentRoute();
            const entity = this.entity();
            // wait until both are ready
            if (!route || !entity) {
                return;
            }

            untracked(() => {
                if (this.lastInitialTableRefreshRoute === route) {
                    return;
                }
                this.lastInitialTableRefreshRoute = route;
                this.$result.set(null);
                this.loading.set(true);
                this.refreshEntityData('selection');
            });
        });

        // Update Sidebar:
        effect(() => {
            const catalog = this._catalog.listener();
            untracked(() => {
                this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
            });
        });
    }

    ngOnInit() {
        super.ngOnInit();

        const sub = this.webSocket.reconnecting.subscribe(
            b => {
                if (b) {
                    this.getEntityData();
                }
            }
        );
        this.subscriptions.add(sub);

        this.subscriptions.add(
            this._sidebar.getSourceRefreshSubject().subscribe(sourceIds => {
                if (!sourceIds?.length) {
                    return;
                }

                const entity = this.entity();
                if (!entity || entity.entityType !== EntityType.SOURCE) {
                    return;
                }

                const isAffected = this._catalog.getAllocations(entity.id)
                    .some(allocation => {
                        const placement = this._catalog.placements().get(allocation.placementId);
                        return placement ? sourceIds.includes(placement.adapterId) : false;
                    });
                if (isAffected) {
                    this.getEntityData();
                }
            })
        );

    }


    ngOnDestroy() {
        this._sidebar.close();
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }

    openSchemaView() {
        this._router.navigate(['/views/schema-editing/' + this.fullName()]).then();
    }
}

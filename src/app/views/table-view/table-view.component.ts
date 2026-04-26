import {Component, computed, effect, OnDestroy, OnInit, Signal, signal, untracked} from '@angular/core';
import {DataTemplateComponent} from '../../components/data-view/data-template/data-template.component';
import {Router} from '@angular/router';
import {EntityType} from '../../models/catalog.model';
import {RefreshRequest} from '../../models/ui-request.model';
import {UiColumnDefinition} from '../../components/data-view/models/result-set.model';

@Component({
    selector: 'app-table-view',
    templateUrl: './table-view.component.html',
    styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent extends DataTemplateComponent implements OnInit, OnDestroy {

    readonly fullName: Signal<string>;
    readonly showRefreshModal = signal(false);
    private previousTableRoute: string = null;
    private revertRouteOnRefreshModalClose = false;
    private lastInitialTableRefreshRoute: string = null;
    reload = () => {// we can preserve the "this" context
        if (!this.entity()) {
            return;
        }

        this.checkSourceSchemaAndMaybePrompt(true, false, false);
    }

    constructor(readonly _router: Router) {
        super();
        this.fullName = computed(() => <string>this.routeParams()['id']);

        // For a newly selected table route, refresh the table once after the entity is available.
        effect(() => {
            const route = this.currentRoute();
            const entity = this.entity();
            if (!route || !entity) {
                return;
            }

            untracked(() => {
                if (this.lastInitialTableRefreshRoute === route) {
                    return;
                }
                this.previousTableRoute = this.lastInitialTableRefreshRoute;
                this.lastInitialTableRefreshRoute = route;
                this.checkSourceSchemaAndMaybePrompt(false, true, true);
            });
        });

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

    }


    ngOnDestroy() {
        this._sidebar.close();
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }

    openSchemaView() {
        this._router.navigate(['/views/schema-editing/' + this.fullName()]).then();
    }

    closeRefreshModal() {
        this.showRefreshModal.set(false);
    }

    handleRefreshModalVisibilityChange(visible: boolean) {
        this.showRefreshModal.set(visible);
        if (!visible && this.revertRouteOnRefreshModalClose) {
            const routeToRestore = this.previousTableRoute;
            this.revertRouteOnRefreshModalClose = false;
            if (routeToRestore) {
                this._router.navigate(['/views/data-table/' + routeToRestore]).then();
            }
        }
    }

    confirmRefresh() {
        this.revertRouteOnRefreshModalClose = false;
        this.loading.set(true);
        this.refreshEntityData();
        this.closeRefreshModal();
    }

    cancelRefresh() {
        const shouldRevertRoute = this.revertRouteOnRefreshModalClose;
        const routeToRestore = this.previousTableRoute;
        this.revertRouteOnRefreshModalClose = false;
        this.closeRefreshModal();
        if (shouldRevertRoute && routeToRestore) {
            this._router.navigate(['/views/data-table/' + routeToRestore]).then();
        }
    }

    private checkSourceSchemaAndMaybePrompt(showNoChangesToast: boolean, loadDataWhenNoRefresh: boolean, loadDataOnCancel: boolean) {
        if (this.entity().entityType !== EntityType.SOURCE) {
            this.getEntityData();
            return;
        }

        const filterObj = this.mapToObject(this.filter);
        const sortState = {};
        this.$result()?.header?.forEach((h: UiColumnDefinition) => {
            this.sortStates.set(h.name, h.sort);
            sortState[h.name] = h.sort;
        });

        const request = new RefreshRequest(
            this.entity().id,
            this._catalog.getNamespaceFromId(this.entity().namespaceId).name,
            this.currentPage(),
            filterObj,
            sortState
        );

        this.loading.set(true);
        const sub = this._crud.checkSourceSchemaRefresh(request).subscribe({
            next: result => {
                this.loading.set(false);
                if (result.refreshNeeded) {
                    this.revertRouteOnRefreshModalClose = loadDataOnCancel;
                    this.showRefreshModal.set(true);
                } else {
                    this.revertRouteOnRefreshModalClose = false;
                    if (showNoChangesToast) {
                        this._toast.info('No schema synchronization needed.');
                    }
                    if (loadDataWhenNoRefresh) {
                        this.getEntityData();
                    }
                }
            },
            error: () => {
                this.loading.set(false);
                this.revertRouteOnRefreshModalClose = false;
                this._toast.error('Could not check the source schema.');
            }
        });
        this.subscriptions.add(sub);
    }
}

import {Component, computed, effect, inject, OnDestroy, OnInit, Signal, signal, untracked} from '@angular/core';
import {DataTemplateComponent} from '../../components/data-view/data-template/data-template.component';
import {Router} from '@angular/router';
import {EntityType} from '../../models/catalog.model';
import {RefreshRequest} from '../../models/ui-request.model';
import {UiColumnDefinition} from '../../components/data-view/models/result-set.model';
import {CombinedResult} from '../../components/data-view/data-view.model';
import {EntityResultCacheService} from '../../services/entity-result-cache.service';

@Component({
    selector: 'app-table-view',
    templateUrl: './table-view.component.html',
    styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent extends DataTemplateComponent implements OnInit, OnDestroy {

    readonly fullName: Signal<string>;
    readonly showRefreshModal = signal(false);
    private lastInitialTableRefreshRoute: string = null;
    private readonly _resultCache = inject(EntityResultCacheService);

    // Reload Button:
    reload = () => {// we can preserve the "this" context
        if (!this.entity()) {
            return;
        }

        this.checkSourceSchemaAndMaybePrompt({
            showNoChangesToast: true,
            loadDataWhenNoRefresh: true,
            promptWhenNoCache: true
        });
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
                // cache current table before opening the newly selected one
                this.cacheDisplayedResult();
                // prevent effect to run multiple times on same table
                this.lastInitialTableRefreshRoute = route;
                // mark as visited
                this._resultCache.markVisited(entity.id);
                // display cached data if available, otherwise clear
                if (!this.restoreCachedResultForEntity(entity.id)) {
                    this.$result.set(null);
                }

                this.checkSourceSchemaAndMaybePrompt({
                    showNoChangesToast: false,
                    loadDataWhenNoRefresh: true,
                    promptWhenNoCache: false
                });
            });
        });

        // Update Sidebar:
        effect(() => {
            const catalog = this._catalog.listener();
            untracked(() => {
                this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
            });
        });

        // Update cache when data is updated through refresh button:
        effect(() => {
            const result = this.$result();
            if (!result || result.error) {
                return;
            }

            untracked(() => {
                const cacheEntityId = this.resolveEntityIdForResult(result);
                if (cacheEntityId != null) {
                    this._resultCache.set(cacheEntityId, this.cloneCombinedResult(result));
                }
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
        this.cacheDisplayedResult();
        this._router.navigate(['/views/schema-editing/' + this.fullName()]).then();
    }

    closeRefreshModal() {
        this.showRefreshModal.set(false);
    }

    handleRefreshModalVisibilityChange(visible: boolean) {
        this.showRefreshModal.set(visible);
    }

    confirmRefresh() {
        this.loading.set(true);
        this.refreshEntityData();
        this.closeRefreshModal();
    }

    cancelRefresh() {
        this.closeRefreshModal();

        // Ensures that cancelling keeps the last known valid table state visible.
        const entity = this.entity();
        if (entity) {
            this.restoreCachedResultForEntity(entity.id);
        }
    }

    private checkSourceSchemaAndMaybePrompt(options: {
        showNoChangesToast: boolean,
        loadDataWhenNoRefresh: boolean,
        promptWhenNoCache: boolean
    }) {
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

                // if refresh needed:
                if (result.refreshNeeded) {
                    const entityId = this.entity().id;
                    const cachedResult = this.getCachedResultForEntity(entityId);
                    if (cachedResult && this.hasVisitedEntity(entityId)) {
                        this.$result.set(this.cloneCombinedResult(cachedResult));
                        this.showRefreshModal.set(true);
                        return;
                    }

                    if (options.promptWhenNoCache) {
                        this.showRefreshModal.set(true);
                    } else {
                        this.loading.set(true);
                        this.refreshEntityData();
                    }

                // if no refresh needed:
                } else {
                    if (options.showNoChangesToast) {
                        this._toast.info('No schema synchronization needed.');
                    }
                    if (options.loadDataWhenNoRefresh) {
                        this.getEntityData();
                    }
                }
            },
            error: () => {
                this.loading.set(false);
                this._toast.error('Could not check the source schema.');
            }
        });
        this.subscriptions.add(sub);
    }

    private cloneCombinedResult(result: CombinedResult): CombinedResult {
        const cloned = new CombinedResult();
        cloned.dataModel = result.dataModel;
        cloned.namespace = result.namespace;
        cloned.query = result.query;
        cloned.queryType = result.queryType;
        cloned.data = result.data ? result.data.map(row => [...row]) : result.data;
        cloned.header = result.header ? [...result.header] : result.header;
        cloned.exception = result.exception;
        cloned.error = result.error;
        cloned.language = result.language;
        cloned.hasMore = result.hasMore;
        cloned.currentPage = result.currentPage;
        cloned.highestPage = result.highestPage;
        cloned.entityName = result.entityName;
        cloned.entityId = result.entityId;
        cloned.entites = result.entites ? [...result.entites] : result.entites;
        cloned.affectedTuples = result.affectedTuples;
        cloned.type = result.type;
        return cloned;
    }

    private getCachedResultForEntity(entityId: number): CombinedResult | null {
        return this._resultCache.get(entityId);
    }

    private hasVisitedEntity(entityId: number): boolean {
        return this._resultCache.hasVisited(entityId);
    }

    private restoreCachedResultForEntity(entityId: number): boolean {
        const cachedResult = this.getCachedResultForEntity(entityId);
        if (cachedResult) {
            this.$result.set(this.cloneCombinedResult(cachedResult));
            return true;
        }
        return false;
    }

    private cacheDisplayedResult() {
        const result = this.$result();
        if (!result || result.error) {
            return;
        }

        const cacheEntityId = this.resolveEntityIdForResult(result);
        if (cacheEntityId == null) {
            return;
        }

        this._resultCache.set(cacheEntityId, this.cloneCombinedResult(result));
    }

    private resolveEntityIdForResult(result: CombinedResult): number | null {
        if (result.entityId != null) {
            return result.entityId;
        }

        if (result.namespace && result.entityName) {
            const entity = this._catalog.getEntityFromName(result.namespace, result.entityName);
            if (entity?.id != null) {
                return entity.id;
            }
        }

        return null;
    }
}

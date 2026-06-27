import {Component, computed, effect, OnDestroy, OnInit, Signal, signal, untracked} from '@angular/core';
import {DataTemplateComponent} from '../../components/data-view/data-template/data-template.component';
import {Router} from '@angular/router';
import {EntityType} from '../../models/catalog.model';
import {RelationalResult, Result} from '../../components/data-view/models/result-set.model';
import {CombinedResult} from '../../components/data-view/data-view.model';

@Component({
    selector: 'app-table-view',
    templateUrl: './table-view.component.html',
    styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent extends DataTemplateComponent implements OnInit, OnDestroy {

    readonly fullName: Signal<string>;
    readonly synchronizedMaterializedSource: Signal<string>;
    readonly showRefreshSummaryModal = signal(false);
    readonly showSynchronizedRefreshPromptModal = signal(false);
    readonly refreshChangeDescriptions = signal<string[]>([]);
    private pendingRefreshTrigger: string | null = null;
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
        this.synchronizedMaterializedSource = computed(() => this._catalog.getSynchronizedSourceFullName(this.entity()));

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

    protected override initWebsocket() {
        const sub = this.webSocket.onMessage().subscribe({
            next: (result: Result<any, any>) => {
                if (!result) {
                    return;
                }

                if (this.$result && +this._route.snapshot.paramMap.get('page') > this.$result()?.highestPage) {
                    this._router.navigate(['/views/data-table/' + this.entity()?.name + '/' + this.$result().highestPage]).then(null);
                }
                this.editing = -1;
                this.buildInsertObject();

                this.entityConfig.update(conf => {
                    const entity = this.entity();
                    if (entity?.entityType === EntityType.ENTITY && entity.modifiable) {
                        conf.create = true;
                        conf.update = true;
                        conf.delete = true;
                    } else {
                        conf.create = false;
                        conf.update = false;
                        conf.delete = false;
                    }
                    return conf;
                });

                this.handleRefreshFeedback(result as RelationalResult);
                this.$result.set(CombinedResult.from(result));
                this.loading.set(false);
            }, error: err => {
                console.log(err);
                this.loading.set(false);
                this.$result.set(CombinedResult.fromRelational(new RelationalResult('Server is not available')));
            }
        });
        this.subscriptions.add(sub);
    }

    override refreshEntityData(refreshTrigger?: string) {
        this.pendingRefreshTrigger = refreshTrigger ?? null;
        this.showSynchronizedRefreshPromptModal.set(false);
        this.showRefreshSummaryModal.set(false);
        this.refreshChangeDescriptions.set([]);
        super.refreshEntityData(refreshTrigger);
    }

    closeRefreshSummaryModal() {
        this.showRefreshSummaryModal.set(false);
    }

    closeSynchronizedRefreshPromptModal() {
        this.showSynchronizedRefreshPromptModal.set(false);
    }

    hasAddableSynchronizedRefreshChanges() {
        return this.refreshChangeDescriptions()
            .some(change => !change.includes('requires synchronized materialization'));
    }

    hasSynchronizedRefreshChanges() {
        return this.refreshChangeDescriptions().length > 0;
    }

    applySynchronizedRefreshChanges(refreshData: boolean = false) {
        this.showSynchronizedRefreshPromptModal.set(false);
        this.loading.set(true);
        this.refreshEntityData(refreshData ? 'synchronizedApplyWithData' : 'synchronizedApply');
    }

    private handleRefreshFeedback(result: RelationalResult) {
        const refreshTrigger = this.pendingRefreshTrigger;
        this.pendingRefreshTrigger = null;

        if (!refreshTrigger) {
            return;
        }

        const changeDescriptions = result.changeDescriptions ?? [];
        if (this.entity()?.synchronizedSourceEntityId) {
            if (refreshTrigger === 'synchronizedApply' || refreshTrigger === 'synchronizedApplyWithData') {
                if (changeDescriptions.length > 0) {
                    this.refreshChangeDescriptions.set(changeDescriptions);
                    this.showRefreshSummaryModal.set(true);
                    this._catalog.updateIfNecessary().subscribe();
                } else {
                    this.refreshChangeDescriptions.set([]);
                    this.showRefreshSummaryModal.set(false);
                    this._toast.info('No addable schema changes detected.');
                }
                return;
            }

            if (changeDescriptions.length > 0) {
                this.refreshChangeDescriptions.set(changeDescriptions);
                this.showSynchronizedRefreshPromptModal.set(true);
                return;
            }

            if (refreshTrigger === 'button') {
                this.refreshChangeDescriptions.set([]);
                this.showSynchronizedRefreshPromptModal.set(true);
            }
            return;
        }

        if (this.entity()?.entityType !== EntityType.SOURCE) {
            return;
        }

        if (changeDescriptions.length > 0) {
            this.refreshChangeDescriptions.set(changeDescriptions);
            this.showRefreshSummaryModal.set(true);
            return;
        }

        if (refreshTrigger === 'button') {
            this.refreshChangeDescriptions.set([]);
            this.showRefreshSummaryModal.set(false);
            this._toast.info('No schema changes detected.');
        }
    }
}

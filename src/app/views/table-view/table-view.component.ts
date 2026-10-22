import {Component, computed, effect, OnDestroy, OnInit, Signal, signal, untracked} from '@angular/core';
import {DataTemplateComponent} from '../../components/data-view/data-template/data-template.component';
import {Router} from '@angular/router';
import {EntityType} from '../../models/catalog.model';
import {RelationalResult, Result} from '../../components/data-view/models/result-set.model';
import {CombinedResult} from '../../components/data-view/data-view.model';
import {DataModel, MaterializedRequest} from '../../models/ui-request.model';

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
    readonly showDataRefreshConfirmModal = signal(false);
    readonly showDeletedSourceMaterializationModal = signal(false);
    readonly deletedSourceMaterializationMessage = signal('');
    readonly dataRefreshRowCount = signal<number | null>(null);
    readonly dataRefreshUnit = computed(() => this.entity()?.dataModel === DataModel.DOCUMENT ? 'documents' : 'rows');
    readonly refreshChangeDescriptions = signal<string[]>([]);
    readonly refreshSummaryTrigger = signal<string | null>(null);
    private pendingRefreshTrigger: string | null = null;
    private pendingConfirmedRefreshTrigger: string | null = null;
    private lastInitialTableRefreshRoute: string = null;

    reload = () => {// we can preserve the "this" context
        if (!this.entity()) {
            return;
        }
        this.loading.set(true);
        if (this.entity()?.synchronizedSourceEntityId && this.entity()?.dataModel === DataModel.DOCUMENT) {
            this.refreshEntityData('synchronizedApplyWithData');
            return;
        }
        if (!this.shouldUseRefreshFlow(this.entity())) {
            this.getEntityData();
            return;
        }
        this.refreshEntityData('button');
    }

    constructor(readonly _router: Router) {
        super();
        this.fullName = computed(() => <string>this.routeParams()['id']);
        this.synchronizedMaterializedSource = computed(() => this._catalog.getSynchronizedSourceFullName(this.entity()));

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
                this.lastInitialTableRefreshRoute = route;
                this.$result.set(null);
                this.loading.set(true);
                if (entity.synchronizedSourceEntityId || !this.shouldUseRefreshFlow(entity)) {
                    this.getEntityData();
                    return;
                }
                this.refreshEntityData('selection');
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

                if (this.handleRefreshFeedback(result as RelationalResult)) {
                    this.$result.set(null);
                    this.loading.set(false);
                    return;
                }
                this.$result.set(CombinedResult.from(result));
                this.loading.set(false);
            }, error: () => {
                this.loading.set(false);
                this.$result.set(CombinedResult.fromRelational(new RelationalResult('Server is not available')));
            }
        });
        this.subscriptions.add(sub);
    }

    override refreshEntityData(refreshTrigger?: string, confirmedDataRefresh = false) {
        this.pendingRefreshTrigger = refreshTrigger ?? null;
        this.showSynchronizedRefreshPromptModal.set(false);
        this.showDataRefreshConfirmModal.set(false);
        this.showRefreshSummaryModal.set(false);
        this.refreshChangeDescriptions.set([]);
        this.refreshSummaryTrigger.set(null);
        super.refreshEntityData(refreshTrigger, confirmedDataRefresh);
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

    closeDataRefreshConfirmModal() {
        this.showDataRefreshConfirmModal.set(false);
        this.dataRefreshRowCount.set(null);
        this.pendingConfirmedRefreshTrigger = null;
    }

    confirmSynchronizedDataRefresh() {
        const refreshTrigger = this.pendingConfirmedRefreshTrigger;
        if (!refreshTrigger) {
            return;
        }
        this.showDataRefreshConfirmModal.set(false);
        this.dataRefreshRowCount.set(null);
        this.loading.set(true);
        this.refreshEntityData(refreshTrigger, true);
    }

    private handleRefreshFeedback(result: RelationalResult): boolean {
        const refreshTrigger = this.pendingRefreshTrigger;
        this.pendingRefreshTrigger = null;

        if (!refreshTrigger) {
            return false;
        }

        const changeDescriptions = result.changeDescriptions ?? [];
        const schemaChangeDescriptions = this.schemaChangeDescriptions(changeDescriptions);
        if (result.sourceEntityDeleted) {
            if (this.entity()?.synchronizedSourceEntityId) {
                this.refreshChangeDescriptions.set([]);
                this.showRefreshSummaryModal.set(false);
                this.showSynchronizedRefreshPromptModal.set(false);
                this.deletedSourceMaterializationMessage.set(changeDescriptions[0] ?? 'The source entity was deleted in the source.');
                this.showDeletedSourceMaterializationModal.set(true);
                return true;
            }
            this.refreshChangeDescriptions.set([]);
            this.showRefreshSummaryModal.set(false);
            this._toast.warn(changeDescriptions[0] ?? 'The source entity was deleted in the source.');
            this._catalog.updateIfNecessary().subscribe();
            return true;
        }
        if (result.dataRefreshRowCount !== undefined && result.dataRefreshRowCount !== null) {
            this.pendingConfirmedRefreshTrigger = refreshTrigger;
            this.dataRefreshRowCount.set(result.dataRefreshRowCount);
            this.showDataRefreshConfirmModal.set(true);
            this.loading.set(false);
            return true;
        }

        if (this.entity()?.dataModel === DataModel.DOCUMENT) {
            this._toast.info(refreshTrigger === 'selection' ? 'Automatically refreshed after table selection. Data refreshed.' : 'Data refreshed.');
            return false;
        }

        if (this.entity()?.synchronizedSourceEntityId) {
            if (refreshTrigger === 'synchronizedApply' || refreshTrigger === 'synchronizedApplyWithData') {
                if (schemaChangeDescriptions.length > 0) {
                    this.refreshChangeDescriptions.set(schemaChangeDescriptions);
                    this.refreshSummaryTrigger.set(refreshTrigger);
                    this.showRefreshSummaryModal.set(true);
                    this._catalog.updateIfNecessary().subscribe();
                } else {
                    this.refreshChangeDescriptions.set([]);
                    this.showRefreshSummaryModal.set(false);
                    this._toast.info(refreshTrigger === 'synchronizedApplyWithData' ? 'Data refreshed.' : 'No applicable schema changes detected.');
                }
                return false;
            }

            if (schemaChangeDescriptions.length > 0) {
                this.refreshChangeDescriptions.set(schemaChangeDescriptions);
                this.showSynchronizedRefreshPromptModal.set(true);
                return false;
            }

            if (refreshTrigger === 'button') {
                this.refreshChangeDescriptions.set([]);
                this.showSynchronizedRefreshPromptModal.set(true);
            }
            return false;
        }

        if (this.entity()?.entityType !== EntityType.SOURCE) {
            return false;
        }

        if (schemaChangeDescriptions.length > 0) {
            this.refreshChangeDescriptions.set(schemaChangeDescriptions);
            this.refreshSummaryTrigger.set(refreshTrigger);
            this.showRefreshSummaryModal.set(true);
            return false;
        }

        if (refreshTrigger === 'button' || refreshTrigger === 'selection') {
            this.refreshChangeDescriptions.set([]);
            this.showRefreshSummaryModal.set(false);
            this._toast.info(refreshTrigger === 'selection'
                ? 'Automatically refreshed after table selection. No schema changes detected. Data refreshed.'
                : 'No schema changes detected. Data refreshed.');
        }
        return false;
    }

    private schemaChangeDescriptions(changeDescriptions: string[]): string[] {
        return changeDescriptions.filter(change => change !== 'Refreshed data from source');
    }

    closeDeletedSourceMaterializationModal() {
        this.showDeletedSourceMaterializationModal.set(false);
        this.deletedSourceMaterializationMessage.set('');
    }

    deleteSynchronizedMaterialization() {
        const entity = this.entity();
        if (!entity) {
            return;
        }
        this.loading.set(true);
        this._crud.dropSynchronizedSourceMaterialization(new MaterializedRequest(entity.id)).subscribe({
            next: result => {
                if (result.error) {
                    this._toast.exception(result);
                    return;
                }
                this.closeDeletedSourceMaterializationModal();
                this.$result.set(null);
                this._catalog.updateIfNecessary().subscribe();
                this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
                this._toast.success(`Deleted synchronized materialization "${entity.name}".`);
            },
            error: () => this._toast.error('Could not delete the synchronized materialization.')
        }).add(() => this.loading.set(false));
    }

    private shouldUseRefreshFlow(entity = this.entity()): boolean {
        if (!entity) {
            return false;
        }
        if (entity.dataModel === DataModel.DOCUMENT) {
            return true;
        }
        if (entity.synchronizedSourceEntityId) {
            return true;
        }
        return entity.entityType === EntityType.SOURCE
            && entity.dataModel === DataModel.RELATIONAL
            && this.isSupportedRelationalSource(entity.id);
    }

    private isSupportedRelationalSource(entityId: number): boolean {
        return this._catalog.getAllocations(entityId)
            .some(allocation => {
                const placement = this._catalog.placements().get(allocation.placementId);
                const adapter = placement ? this._catalog.getAdapter(placement.adapterId) : null;
                return adapter?.adapterName === 'PostgreSQL' || adapter?.adapterName === 'MySQL';
            });
    }
}

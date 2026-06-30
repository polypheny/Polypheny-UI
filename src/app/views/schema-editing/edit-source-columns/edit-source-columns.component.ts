import {Component, computed, effect, inject, input, Input, OnDestroy, OnInit, Signal, signal, untracked} from '@angular/core';
import {RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ColumnRequest, RefreshRequest, SourceMaterializationRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import * as $ from 'jquery';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {ForeignKey} from '../../uml/uml.model';
import {CatalogService} from '../../../services/catalog.service';
import {AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, EntityType, ForeignKeyModel, NamespaceModel, TableModel} from '../../../models/catalog.model';
import {AdapterModel} from '../../adapters/adapter.model';
import {WebSocket} from '../../../services/webSocket';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';

const tabs = ['column', 'source', 'foreign', 'statistics', 'source-materialization'] as const;
type Tabs = (typeof tabs)[number]; // returns the type of any element in the tabs array
type SourceMaterializationMode = 'independent' | 'synchronized';
const RELATIONAL_STORE_ADAPTERS = new Set(['HSQLDB', 'PostgreSQL', 'MySQL', 'MonetDB', 'File']);

@Component({
    selector: 'app-edit-source-columns',
    templateUrl: './edit-source-columns.component.html',
    styleUrls: ['./edit-source-columns.component.scss']
})
export class EditSourceColumnsComponent implements OnInit, OnDestroy {

    private readonly _crud = inject(CrudService);
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);
    private readonly _sidebar = inject(LeftSidebarService);
    protected readonly webSocket: WebSocket;
    readonly showRefreshSummaryModal = signal(false);
    readonly refreshChangeDescriptions = signal<string[]>([]);
    readonly refreshSummaryTrigger = signal<string | null>(null);
    readonly showSourceMaterializationWarningModal = signal(false);
    readonly sourceMaterializationWarnings = signal<string[]>([]);
    readonly showSourceDeletedModal = signal(false);
    readonly sourceDeletedMessage = signal('');
    private createdSourceMaterializationRoute: string | null = null;
    private readonly viewInitialized = signal(false);
    private pendingRefreshTrigger: string | null = null;

    constructor() {
        this.webSocket = new WebSocket();

        this.foreignKeys = computed(() => {
            const catalog = this._catalog.listener();
            const namespace = this.namespace();
            const entity = this.entity();
            if (!namespace || !entity) {
                return this.foreignKeys();
            }

            const fks = new Map<string, ForeignKeyModel>();
            this._catalog.getKeys(entity.id).filter(k => !k.isPrimary).map(k => <ForeignKeyModel>k).forEach(k => {
                fks.set(catalog.getConstraintName(k.id), k);
                return [...fks.values()];
            });
        });


        this.columns = computed(() => {
            const catalog = this._catalog.listener();
            if (!this.entity) {
                return [];
            }

            const entity = this.entity();
            if (!entity) {
                return this.columns();
            }
            const columns = this._catalog.getColumns(entity.id);

            return columns.map(c => {
                const primaries: number[] = this._catalog.getPrimaryKey(c.entityId)?.columnIds || [];
                return UiColumnDefinition.fromModel(c, primaries);
            });
        });

        effect(() => {
            const route = this.currentRoute();
            const entity = this.entity();
            const viewInitialized = this.viewInitialized();
            if (!route || !entity || !viewInitialized) {
                return;
            }

            untracked(() => {
                if (this.lastCheckedRoute === route) {
                    return;
                }
                this.lastCheckedRoute = route;
                this.loading.set(true);
                this.refreshEntityData('selection');
            });
        });
    }

    @Input()
    readonly entity: Signal<TableModel>;
    @Input()
    readonly namespace: Signal<NamespaceModel>;
    @Input()
    readonly placements: Signal<AllocationPlacementModel[]>;
    @Input()
    readonly partitions: Signal<AllocationPartitionModel[]>;
    @Input()
    readonly allocations: Signal<AllocationEntityModel[]>;
    @Input()
    readonly stores: Signal<AdapterModel[]>;
    @Input()
    readonly addableStores: Signal<AdapterModel[]>;

    currentRoute = input.required<string>();
    currentTab = input.required<string>();

    activeTab = computed<Tabs>(() =>
        (tabs.includes(this.currentTab() as Tabs) && (this.currentTab() !== 'source-materialization' || this.showSourceMaterializationTab()) ? this.currentTab() : 'column') as Tabs
    );

    readonly columns: Signal<UiColumnDefinition[]>;
    readonly foreignKeys: Signal<ForeignKey[]>;
    readonly loading = signal(false);
    readonly showExistingStoreModal = signal(false);
    readonly showSourceMaterializationConfirmModal = signal(false);
    readonly selectedMaterializationStoreId = signal<number>(null);
    readonly selectedSourceMaterializationMode = signal<SourceMaterializationMode | null>(null);
    readonly targetMaterializationName = signal('');
    readonly showTargetMaterializationNameError = signal(false);
    readonly creatingSourceMaterialization = signal(false);
    readonly sourceAdapter = computed(() => this.getAdapters()()?.[0] ?? null);
    readonly showSourceMaterializationTab = computed(() => {
        const sourceAdapter = this.sourceAdapter();
        return sourceAdapter?.adapterName === 'PostgreSQL' || sourceAdapter?.adapterName === 'MySQL';
    });
    readonly availableStores = computed(() =>
        (this.stores?.() ?? []).filter(store => store.persistent && RELATIONAL_STORE_ADAPTERS.has(store.adapterName))
    );
    readonly selectedMaterializationStore = computed(() =>
        this.availableStores().find(store => store.id === this.selectedMaterializationStoreId()) ?? null
    );
    readonly targetMaterializationNameExists = computed(() => {
        const namespace = this.namespace();
        const name = this.normalizedTargetMaterializationName();
        if (!namespace || !name) {
            return false;
        }
        return Array.from(this._catalog.entities().values())
            .some(entity => entity.namespaceId === namespace.id && entity.name.toLowerCase() === name.toLowerCase());
    });
    errorMsg: string;
    editingCol: string;
    private lastCheckedRoute: string = null;
    subscriptions = new Subscription();
    reload = () => {
        this.loading.set(true);
        this.refreshEntityData('button');
    }

    public readonly EntityType = EntityType;

    ngOnInit(): void {
        //this.getPlacements();
        this.initWebsocket();
        this.viewInitialized.set(true);

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
                    this.refreshEntityData();
                }
            })
        );

        const self = this;
        $(document).on('click', function (e) {
            if ($(e.target).hasClass('rename') || $(e.target).hasClass('add-col')) {
                return;
            }
            if ($(e.target).parents('.editing').length === 0) {
                self.editingCol = undefined;
            }
        });
    }

    ngOnDestroy() {
        $(document).off('click');
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }

    protected initWebsocket() {
        const sub = this.webSocket.onMessage().subscribe({
            next: (result: RelationalResult) => {
                this.loading.set(false);

                if (result?.error) {
                    this._toast.exception(result);
                    return;
                }

                if (this.handleRefreshFeedback(result)) {
                    return;
                }
                this._catalog.updateIfNecessary().subscribe();
            },
            error: () => {
                this.loading.set(false);
                this._toast.error('Could not refresh the source table.');
            }
        });
        this.subscriptions.add(sub);
    }


    getAddableColumns(): Observable<UiColumnDefinition[]> {
        const cols: UiColumnDefinition[] = [];

        for (const col of this.columns()) {
            if (!this._catalog.getColumns(this.entity().id).find(h => h.name === col.name)) {
                cols.push(col);
            }
        }

        return new BehaviorSubject(cols);
    }

    dropColumn(col: UiColumnDefinition) {
        const oldColumn = new ColumnRequest(this.entity().id, col);
        this._crud.dropColumn(oldColumn).subscribe({
            next: (res: RelationalResult) => {
                if (res.error) {
                    this._toast.exception(res);
                } else {
                    this._toast.success('The source column was dropped');
                }
                //this._catalog.updateIfNecessary();
            }, error: err => {
                console.log(err);
            }
        });
    }

    renameColumn(input: HTMLInputElement, oldCol: UiColumnDefinition, newName: string, tableType: string) {
        if (newName.trim() === '') {
            this._toast.error('Name can not be empty.');
            return;
        }
        const newCol = Object.assign({}, oldCol);
        newCol.name = newName;
        console.log(newCol);
        const request = new ColumnRequest(this.entity().id, oldCol, newCol, true, tableType);
        this._crud.updateColumn(request).subscribe({
            next: (res: RelationalResult) => {
                if (res.error) {
                    this._toast.exception(res);
                } else {
                    this._toast.success('Renamed column "' + oldCol.name + '" to "' + newName + '"');
                }
                this.editingCol = undefined;
                input.value = '';
                //this._catalog.updateIfNecessary();
            }, error: err => {
                this._toast.error('Could not rename the column "' + oldCol.name + '" to "' + newName + '"');
                console.log(err);
            }
        });
    }

    addColumn(col: UiColumnDefinition, newName: string, newDefault: string) {
        const request = new ColumnRequest(this.entity().id, null, new UiColumnDefinition(-1, col.name, null, null, col.dataType, '', null, null, newDefault, -1, -1, newName));
        this._crud.createColumn(request).subscribe({
            next: res => {
                const result = <RelationalResult>res;
                if (result.error) {
                    this._toast.exception(result);
                } else {
                    this._toast.success('Added column "' + newName + '"');
                }
                //this._catalog.updateIfNecessary();
                this.editingCol = undefined;
            }, error: err => {
                this._toast.error('Could not add the column "' + newName + '"');
                console.log(err);
            }
        });
    }


    validTableName(name: string): boolean {
        return name.trim() !== '';
    }

    getTitle() {
        return this._route.params['id'];
    }

    getAdapters(): Signal<AdapterModel[]> {
        return computed(() => this.placements()?.map(a => this._catalog.getAdapter(a.adapterId)).filter(a => a));
    }

    openDataView() {
        this._router.navigate(['/views/data-table/' + this.currentRoute()]).then();
    }

    refreshEntityData(refreshTrigger: string = 'selection') {
        const entity = this.entity();
        const namespace = entity ? this._catalog.getNamespaceFromId(entity.namespaceId) : null;
        if (!entity || !namespace) {
            return;
        }

        this.loading.set(true);
        const request = new RefreshRequest(entity.id, namespace.name, 1);
        request.refreshTrigger = refreshTrigger;
        this.pendingRefreshTrigger = refreshTrigger;
        if (!this._crud.refreshEntityData(this.webSocket, request)) {
            this.pendingRefreshTrigger = null;
            this.loading.set(false);
            this._toast.error('Could not establish a connection with the server.');
        }
    }

    closeRefreshSummaryModal() {
        this.showRefreshSummaryModal.set(false);
        this.refreshSummaryTrigger.set(null);
    }

    closeSourceMaterializationWarningModal() {
        this.showSourceMaterializationWarningModal.set(false);
        const route = this.createdSourceMaterializationRoute;
        this.createdSourceMaterializationRoute = null;
        if (route) {
            this._router.navigate(['/views/schema-editing/' + route]).then();
        }
    }

    closeSourceDeletedModal() {
        if (!this.showSourceDeletedModal()) {
            return;
        }
        this.showSourceDeletedModal.set(false);
        this.sourceDeletedMessage.set('');
        this._catalog.updateIfNecessary().subscribe();
    }

    openExistingStoreModal() {
        this.showExistingStoreModal.set(true);
    }

    closeExistingStoreModal() {
        this.showExistingStoreModal.set(false);
    }

    openSourceMaterializationConfirmModal() {
        if (!this.selectedMaterializationStore()) {
            return;
        }
        this.selectedSourceMaterializationMode.set(null);
        this.targetMaterializationName.set('');
        this.showTargetMaterializationNameError.set(false);
        this.showExistingStoreModal.set(false);
        this.showSourceMaterializationConfirmModal.set(true);
    }

    closeSourceMaterializationConfirmModal() {
        this.showSourceMaterializationConfirmModal.set(false);
    }

    selectMaterializationStore(storeId: number) {
        this.selectedMaterializationStoreId.set(storeId);
    }

    selectSourceMaterializationMode(mode: SourceMaterializationMode) {
        this.selectedSourceMaterializationMode.set(mode);
    }

    updateTargetMaterializationName(name: string) {
        this.targetMaterializationName.set(name);
        this.showTargetMaterializationNameError.set(false);
    }

    createSourceMaterialization() {
        const entity = this.entity();
        const store = this.selectedMaterializationStore();
        const namespace = this.namespace();
        if (!entity || !store || !namespace) {
            return;
        }

        if (this.targetMaterializationNameExists()) {
            this.showTargetMaterializationNameError.set(true);
            return;
        }

        this.creatingSourceMaterialization.set(true);
        const mode = this.selectedSourceMaterializationMode();
        const request = new SourceMaterializationRequest(entity.id, store.id, namespace.id, this.normalizedTargetMaterializationName());
        const createRequest = mode === 'synchronized'
            ? this._crud.createSynchronizedSourceMaterialization(request)
            : this._crud.createIndependentSourceMaterialization(request);

        createRequest.subscribe({
            next: result => {
                if (result.error) {
                    this._toast.exception(result);
                    return;
                }
                this.closeSourceMaterializationConfirmModal();
                this._catalog.updateIfNecessary().subscribe();
                const materializedRoute = `${result.namespace}.${result.table}`;
                const changeDescriptions = result.changeDescriptions ?? [];
                if (mode === 'synchronized') {
                    if (changeDescriptions.length > 0) {
                        this.sourceMaterializationWarnings.set(changeDescriptions);
                        this.createdSourceMaterializationRoute = materializedRoute;
                        this.showSourceMaterializationWarningModal.set(true);
                        return;
                    }
                    this._toast.success(`Created synchronized materialization "${result.table}" on store "${store.name}".`);
                    this._router.navigate(['/views/schema-editing/' + materializedRoute]).then();
                } else {
                    this._toast.success(`Created independent materialization "${result.table}" on store "${store.name}".`);
                }
            },
            error: () => {
                this._toast.error(`Could not create the ${mode === 'synchronized' ? 'synchronized materialization' : 'independent materialization'}.`);
            }
        }).add(() => this.creatingSourceMaterialization.set(false));
    }

    private normalizedTargetMaterializationName(): string | null {
        const name = this.targetMaterializationName().trim();
        return name.length > 0 ? name : null;
    }

    private handleRefreshFeedback(result: RelationalResult): boolean {
        const refreshTrigger = this.pendingRefreshTrigger;
        this.pendingRefreshTrigger = null;

        const changeDescriptions = result.changeDescriptions ?? [];
        if (result.sourceEntityDeleted) {
            this.refreshChangeDescriptions.set([]);
            this.showRefreshSummaryModal.set(false);
            this._toast.warn(changeDescriptions[0] ?? 'The source table was deleted in the source.');
            this._catalog.updateIfNecessary().subscribe();
            return true;
        }

        if (!refreshTrigger) {
            return false;
        }

        if (changeDescriptions.length > 0) {
            this.refreshChangeDescriptions.set(changeDescriptions);
            this.refreshSummaryTrigger.set(refreshTrigger);
            this.showRefreshSummaryModal.set(true);
            return true;
        }

        if (refreshTrigger === 'button' || refreshTrigger === 'selection') {
            this._toast.info(refreshTrigger === 'selection'
                ? 'Automatically refreshed after table selection. No schema changes detected. Data refreshed.'
                : 'No schema changes detected. Data refreshed.');
            return true;
        }
        return false;
    }

    setTab(tab: Tabs) {
        if (tab === 'source-materialization' && !this.showSourceMaterializationTab()) {
            return;
        }
        this._router.navigate(['/views/schema-editing/', this.currentRoute(), tab]).then();
    }
}

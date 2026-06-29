import {Component, computed, effect, HostListener, inject, input, Input, OnDestroy, OnInit, Signal, signal, untracked, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import {CrudService} from '../../../services/crud.service';
import {PolyType, RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {MaterializedRequest, Method, RefreshRequest, SourceMaterializationRequest} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {AdapterModel} from '../../adapters/adapter.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {Subscription} from 'rxjs';
import {CatalogService} from '../../../services/catalog.service';
import {AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, EntityType, NamespaceModel, TableModel} from '../../../models/catalog.model';
import {Router} from '@angular/router';
import {WebSocket} from '../../../services/webSocket';

const tabs = ['fields', 'placement', 'source-materialization', 'statistics'] as const;
type Tabs = (typeof tabs)[number]; // returns the type of any element in the tabs array
type SourceMaterializationMode = 'independent' | 'synchronized';

@Component({
    selector: 'app-document-edit-collection',
    templateUrl: './document-edit-collection.component.html',
    styleUrls: ['./document-edit-collection.component.scss']
})

export class DocumentEditCollectionComponent implements OnInit, OnDestroy {

    public readonly _crud = inject(CrudService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);
    private readonly _toast = inject(ToasterService);
    private readonly _router = inject(Router);
    protected readonly webSocket: WebSocket;

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
        (tabs.includes(this.currentTab() as Tabs) && (this.currentTab() !== 'source-materialization' || this.showSourceMaterializationTab()) ? this.currentTab() : 'fields') as Tabs
    );


    types: PolyType[] = [];
    editColumn = -1;
    createColumn = new UiColumnDefinition(-1, '', false, true, 'text', '', null, null, null);
    confirm = -1;
    updateColumn = new UntypedFormGroup({name: new UntypedFormControl('')});


    //data placement handling

    selectedStore: AdapterModel;
    placementMethod: Method;
    isAddingPlacement = false;

    subscriptions = new Subscription();
    readonly loading = signal(false);
    readonly showExistingStoreModal = signal(false);
    readonly showSourceMaterializationConfirmModal = signal(false);
    readonly showDataRefreshConfirmModal = signal(false);
    readonly dataRefreshDocumentCount = signal<number | null>(null);
    readonly showSourceDeletedModal = signal(false);
    readonly sourceDeletedMessage = signal('');
    readonly selectedMaterializationStoreId = signal<number>(null);
    readonly selectedSourceMaterializationMode = signal<SourceMaterializationMode | null>(null);
    readonly targetMaterializationName = signal('');
    readonly showTargetMaterializationNameError = signal(false);
    readonly creatingSourceMaterialization = signal(false);
    readonly synchronizedMaterializedSource = computed(() => this._catalog.getSynchronizedSourceFullName(this.entity()));
    private pendingRefreshTrigger: string | null = null;
    private lastAutoRefreshRoute: string | null = null;
    private readonly websocketReady = signal(false);
    readonly sourceAdapter = computed(() => this.getAdapters()()?.[0] ?? null);
    readonly showSourceMaterializationTab = computed(() => {
        const sourceAdapter = this.sourceAdapter();
        return this.entity()?.entityType === EntityType.SOURCE && sourceAdapter?.adapterName === 'MongoDB';
    });
    readonly availableMaterializationStores = computed(() =>
        (this.stores?.() ?? []).filter(store => store.persistent && store.adapterName === 'MongoDB')
    );
    readonly selectedMaterializationStore = computed(() =>
        this.availableMaterializationStores().find(store => store.id === this.selectedMaterializationStoreId()) ?? null
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

    @ViewChild('placementModal', {static: false}) public placementModal: ModalDirective;
    @ViewChild('partitioningModal', {static: false}) public partitioningModal: ModalDirective;
    @ViewChild('partitionFunctionModal', {static: false}) public partitionFunctionModal: ModalDirective;

    protected readonly Method = Method;

    protected readonly EntityType = EntityType;

    reload = () => {
        if (this.synchronizedMaterializedSource()) {
            this.refreshSynchronizedMaterializationData(false, 'button');
            return;
        }
        this.refreshEntityData('button');
    }

    constructor() {
        this.webSocket = new WebSocket();
        effect(() => {
            const route = this.currentRoute();
            const entity = this.entity();
            const websocketReady = this.websocketReady();
            if (!route || this.currentTab() || !entity || !websocketReady) {
                return;
            }

            untracked(() => {
                if (this.lastAutoRefreshRoute === route) {
                    return;
                }
                this.lastAutoRefreshRoute = route;
                if (this.synchronizedMaterializedSource()) {
                    return;
                }
                this.refreshEntityData('selection');
            });
        });
    }

    ngOnInit() {

        this.getFixedFields();
        this.initWebsocket();
        this.websocketReady.set(true);
    }

    ngOnDestroy() {
        $(document).off('click');
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }

    //see https://medium.com/claritydesignsystem/1b66d45b3e3d
    @HostListener('window:click', ['$event.target'])
    onClick(targetElement: string) {
        const self = this;
        if ($(targetElement).parents('.editing').length === 0) {
            self.editColumn = -1;
        }
    }


    getFixedFields() {
        return [];
    }

    private initWebsocket() {
        const sub = this.webSocket.onMessage().subscribe({
            next: (result: RelationalResult) => {
                this.loading.set(false);

                if (result?.error) {
                    this._toast.exception(result);
                    return;
                }
                if (result?.dataRefreshRowCount !== undefined && result.dataRefreshRowCount !== null) {
                    this.dataRefreshDocumentCount.set(result.dataRefreshRowCount);
                    this.showDataRefreshConfirmModal.set(true);
                    return;
                }
                if (result?.sourceEntityDeleted) {
                    this.pendingRefreshTrigger = null;
                    this.sourceDeletedMessage.set(result.changeDescriptions?.[0] ?? 'The source collection was deleted in the source.');
                    this.showSourceDeletedModal.set(true);
                    return;
                }

                const refreshTrigger = this.pendingRefreshTrigger;
                this.pendingRefreshTrigger = null;
                this._catalog.updateIfNecessary().subscribe();
                console.log('[DocumentEditCollection] Document refresh completed', {
                    trigger: refreshTrigger,
                    entity: this.entity()?.name,
                    synchronizedSourceEntityId: this.entity()?.synchronizedSourceEntityId ?? null
                });
                this._toast.info(refreshTrigger === 'selection'
                    ? 'Automatically refreshed after table selection. Data refreshed.'
                    : 'Data refreshed.');
            },
            error: () => {
                this.pendingRefreshTrigger = null;
                this.loading.set(false);
                this._toast.error('Could not refresh the source collection.');
            }
        });
        this.subscriptions.add(sub);
    }

    modifyPlacement(method: Method, storeId: number = null) {
        this.placementMethod = method;
        if (storeId != null) {
            this.selectedStore = this._catalog.getAdapter(storeId);
        }
        if (!this.stores) {
            return;
        }
        this.isAddingPlacement = true;
        this._crud.addDropCollectionPlacement(this.namespace().name, this.entity().name, this.selectedStore.name, this.placementMethod).subscribe({
                next: (result: RelationalResult) => {
                    if (result.error) {
                        this._toast.exception(result);
                    } else {
                        if (this.placementMethod === Method.ADD) {
                            this._toast.success('Added placement on store ' + this.selectedStore.name, result.query, 'Added placement');
                        } else if (this.placementMethod === Method.MODIFY) {
                            this._toast.success('Modified placement on store ' + this.selectedStore.name, result.query, 'Modified placement');
                        }
                        //this._catalog.updateIfNecessary();
                    }
                    this.selectedStore = null;
                }, error: err => {
                    this._toast.error('Could not ' + this.placementMethod.toLowerCase() + ' placement on store ' + this.selectedStore.name);
                }
            }
        ).add(() => {
            this.isAddingPlacement = false;
        });
    }


    validate(defaultValue) {
        if (defaultValue === null) {
            return '';
        } else if (isNaN(defaultValue) || defaultValue === '') {
            return 'is-invalid';
        } else {
            return 'is-valid';
        }
    }

    openDataView() {
        this._router.navigate(['/views/data-table/' + this.currentRoute()]).then();
    }

    refreshEntityData(refreshTrigger: string = 'button') {
        const entity = this.entity();
        const namespace = entity ? this._catalog.getNamespaceFromId(entity.namespaceId) : null;
        if (!entity || !namespace) {
            return;
        }

        this.loading.set(true);
        this.pendingRefreshTrigger = refreshTrigger;
        const request = new RefreshRequest(entity.id, namespace.name, 1);
        request.refreshTrigger = refreshTrigger;
        if (!this._crud.refreshEntityData(this.webSocket, request)) {
            this.pendingRefreshTrigger = null;
            this.loading.set(false);
            this._toast.error('Could not establish a connection with the server.');
        }
    }

    refreshSynchronizedMaterializationData(confirmedDataRefresh = false, refreshTrigger: string = 'button') {
        const entity = this.entity();
        const namespace = entity ? this._catalog.getNamespaceFromId(entity.namespaceId) : null;
        if (!entity || !namespace || !this.synchronizedMaterializedSource()) {
            return;
        }

        this.loading.set(true);
        this.pendingRefreshTrigger = refreshTrigger;
        this.showDataRefreshConfirmModal.set(false);
        const request = new RefreshRequest(entity.id, namespace.name, 1);
        request.refreshTrigger = 'synchronizedApplyWithData';
        request.confirmedDataRefresh = confirmedDataRefresh;
        if (!this._crud.refreshEntityData(this.webSocket, request)) {
            this.pendingRefreshTrigger = null;
            this.loading.set(false);
            this._toast.error('Could not establish a connection with the server.');
        }
    }

    closeDataRefreshConfirmModal() {
        this.showDataRefreshConfirmModal.set(false);
        this.dataRefreshDocumentCount.set(null);
        this.pendingRefreshTrigger = null;
    }

    closeSourceDeletedModal() {
        if (!this.showSourceDeletedModal()) {
            return;
        }
        if (this.synchronizedMaterializedSource()) {
            this.keepSynchronizedMaterializationAfterSourceDeleted();
            return;
        }
        this.showSourceDeletedModal.set(false);
        this.sourceDeletedMessage.set('');
        this._catalog.updateIfNecessary().subscribe();
    }

    keepSynchronizedMaterializationAfterSourceDeleted() {
        this.showSourceDeletedModal.set(false);
        this.sourceDeletedMessage.set('');
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
                this.showSourceDeletedModal.set(false);
                this.sourceDeletedMessage.set('');
                this._catalog.updateIfNecessary().subscribe();
                this._router.navigate(['/views/schema-editing/']).then();
                this._toast.success(`Deleted synchronized materialization "${entity.name}".`);
            },
            error: () => this._toast.error('Could not delete the synchronized materialization.')
        }).add(() => this.loading.set(false));
    }

    confirmSynchronizedDataRefresh() {
        const refreshTrigger = this.pendingRefreshTrigger ?? 'button';
        this.showDataRefreshConfirmModal.set(false);
        this.dataRefreshDocumentCount.set(null);
        this.refreshSynchronizedMaterializationData(true, refreshTrigger);
    }

    getAdapters(): Signal<AdapterModel[]> {
        return computed(() => this.placements()?.map(a => this._catalog.getAdapter(a.adapterId)).filter(a => a));
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
        const namespace = this.namespace();
        const store = this.selectedMaterializationStore();
        if (!entity || !namespace || !store || this.creatingSourceMaterialization()) {
            return;
        }

        if (this.targetMaterializationNameExists()) {
            this.showTargetMaterializationNameError.set(true);
            return;
        }

        this.creatingSourceMaterialization.set(true);
        const mode = this.selectedSourceMaterializationMode();
        const request = new SourceMaterializationRequest(entity.id, store.id, namespace.id, this.normalizedTargetMaterializationName());
        const materializationRequest = mode === 'synchronized'
            ? this._crud.createSynchronizedSourceCollectionMaterialization(request)
            : this._crud.createIndependentSourceCollectionMaterialization(request);
        materializationRequest.subscribe({
            next: (result: RelationalResult) => {
                if (result.error) {
                    this._toast.exception(result, 'Could not create materialization:');
                    return;
                }

                this.closeSourceMaterializationConfirmModal();
                this.closeExistingStoreModal();
                this.selectedMaterializationStoreId.set(null);
                this.selectedSourceMaterializationMode.set(null);
                this._catalog.updateIfNecessary().subscribe();
                this._toast.success(
                    `Created ${mode} materialization ${result.table} on store ${store.name}`,
                    result.query,
                    'Materialization'
                );
            },
            error: err => {
                this._toast.error('Could not create materialization.');
                console.log(err);
            }
        }).add(() => this.creatingSourceMaterialization.set(false));
    }

    private normalizedTargetMaterializationName(): string | null {
        const name = this.targetMaterializationName().trim();
        return name.length > 0 ? name : null;
    }

    setTab(tab: Tabs) {
        if (tab === 'source-materialization' && !this.showSourceMaterializationTab()) {
            return;
        }
        this._router.navigate(['/views/schema-editing/', this.currentRoute(), tab]).then();
    }
}

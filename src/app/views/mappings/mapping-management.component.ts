import {Component, effect, inject, Input, OnChanges, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, forkJoin, of, Subject, Subscription} from 'rxjs';
import {catchError, startWith, switchMap} from 'rxjs/operators';
import {EntityType} from '../../models/catalog.model';
import {DataModel} from '../../models/ui-request.model';
import {MappingService} from '../../services/mapping.service';
import {CatalogService} from '../../services/catalog.service';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {MappingSidebarService} from './mapping-sidebar.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {DocumentMappingSource, MAPPING_KINDS, mappingDetailLink, mappingKindLabel, MappingError, MappingKind, MappingSource, MappingSummary, PhysicalSourceSelection, readPhysicalSource, mappingUsesSource} from './mapping.model';

type CreationSource = MappingSource | DocumentMappingSource;

@Component({
    selector: 'app-mapping-management',
    templateUrl: './mapping-management.component.html',
    styleUrls: ['./mapping-management.component.scss']
})
export class MappingManagementComponent implements OnInit, OnDestroy, OnChanges {
    private readonly mappings = inject(MappingService);
    private readonly catalog = inject(CatalogService);
    private readonly route = inject(ActivatedRoute);
    private readonly breadcrumbs = inject(BreadcrumbService);
    private readonly sidebar = inject(MappingSidebarService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToasterService);
    private readonly subscriptions = new Subscription();
    private readonly reload = new Subject<void>();

    @Input() targetEntityId: number;

    get embedded(): boolean { return this.targetEntityId != null; }
    get target() { return this.embedded ? this.catalog.entities().get(this.targetEntityId) : null; }
    get documentTarget(): boolean { return this.target?.dataModel === DataModel.DOCUMENT; }
    get canCreate(): boolean {
        if (this.sourceFilter) { return !!this.createSource; }
        return !this.embedded || (this.target?.entityType === EntityType.SOURCE && !this.target.modifiable
            && (!this.documentTarget || !!this.rows.length));
    }
    ngOnChanges() {
        this.sourceModelSelection = null;
        this.selectedSource = '';
        this.refresh();
    }

    adapterContext = false;

    get adapterName(): string {
        return this.rows.find(mapping => mapping.adapterId === this.adapterId)?.adapterName
            || this.sources.find(source => source.adapterId === this.adapterId)?.adapterName
            || this.catalog.adapters().get(this.adapterId)?.name
            || 'Adapter ' + this.adapterId;
    }

    sourceFilter: PhysicalSourceSelection;

    get sourceTargets(): boolean { return this.sourceFilter != null; }
    get sourceLabel(): string {
        if (!this.sourceFilter) { return ''; }
        const adapterName = this.rows.find(mapping => mapping.adapterId === this.sourceFilter.adapterId)?.adapterName
            || this.sources.find(source => source.adapterId === this.sourceFilter.adapterId)?.adapterName
            || 'Adapter ' + this.sourceFilter.adapterId;
        return adapterName + '.' + this.sourceFilter.physicalName;
    }

    rows: MappingSummary[] = [];
    sources: CreationSource[] = [];
    dataModels: DataModel[] = [];
    private sourceModelSelection: DataModel | null = null;
    selectedSource = '';
    selectedKind: MappingKind = 'PHYSICAL_TO_LOGICAL';
    viewKind: MappingKind;
    readonly mappingKinds = MAPPING_KINDS;
    readonly mappingKindLabel = mappingKindLabel;
    selectedId: number = null;
    blockedRemovalId: number = null;
    adapterId: number;
    loading = true;
    loadError: string;
    sourceError: string;
    removal: MappingSummary;
    removing = false;
    removeError: MappingError;
    refreshError = false;

    get removalTargetLabel(): string {
        return this.removal?.targetModel === DataModel.DOCUMENT ? 'collection' : 'table';
    }

    constructor() {
        effect(() => {
            if (this.catalog.listener() && !this.loading && !this.removing && !this.removal) {
                this.refresh();
            }
        });
    }

    ngOnInit() {
        if (!this.embedded) { this.sidebar.show([]); }
        this.subscriptions.add(combineLatest([this.route.paramMap, this.route.queryParamMap, this.reload.pipe(startWith(undefined))]).pipe(
            switchMap(([params, query]) => {
                this.loading = true;
                this.loadError = null;
                this.sourceError = null;
                this.selectedId = null;
                this.blockedRemovalId = null;
                const previousAdapter = this.adapterContext ? this.adapterId : null;
                this.adapterContext = !this.embedded && params.has('adapterId');
                const sourceAdapterId = this.embedded ? null : params.get('sourceAdapterId');
                this.sourceFilter = sourceAdapterId == null ? null
                    : readPhysicalSource(sourceAdapterId, query.get('sourceNamespace'), query.get('sourceTable'));
                if (sourceAdapterId != null && !this.sourceFilter) {
                    this.loadError = 'The physical source is invalid.';
                    return of(null);
                }
                const kind = params.get('kind');
                this.viewKind = this.sourceTargets ? 'PHYSICAL_TO_LOGICAL' : this.embedded ? undefined : MAPPING_KINDS.find(value => value === kind);
                this.setBreadcrumbs();
                if (!this.embedded && kind != null && !this.viewKind) {
                    this.loadError = 'The mapping kind is invalid.';
                    return of(null);
                }
                if (this.viewKind || this.adapterContext) {
                    this.selectKind(this.adapterContext ? 'PHYSICAL_TO_LOGICAL' : this.viewKind);
                }
                const value = this.embedded ? null : params.get('adapterId') ?? sourceAdapterId ?? query.get('adapterId');
                this.adapterId = value == null ? undefined : Number(value);
                if ((this.adapterContext ? this.adapterId : null) !== previousAdapter) {
                    this.sourceModelSelection = null;
                }
                if (value != null && (!/^\d+$/.test(value) || !Number.isSafeInteger(this.adapterId))) {
                    this.loadError = 'The adapter ID is invalid.';
                    return of(null);
                }
                const handleSourceError = (error: unknown) => {
                    this.sourceError = MappingService.error(error).message;
                    return of({sources: []});
                };
                const loadRelationalSources = () => (this.embedded ? this.mappings.getSources(undefined, this.targetEntityId)
                    : this.mappings.getSources(this.adapterId)).pipe(catchError(handleSourceError));
                return forkJoin({
                    mappings: this.embedded ? this.mappings.getMappings(undefined, this.targetEntityId) : this.mappings.getMappings(this.adapterId),
                    relationalSources: this.adapterContext || this.documentTarget ? of(null) : loadRelationalSources()
                }).pipe(
                    switchMap(response => {
                        const adapterModels = response.mappings.adapterSourceModels ?? [];
                        const hasDocumentSource = this.documentTarget || (this.adapterContext ? adapterModels.includes(DataModel.DOCUMENT)
                            : !this.embedded && (!this.viewKind || this.viewKind === 'PHYSICAL_TO_LOGICAL')
                                && response.mappings.mappings.some(mapping => mapping.kind === 'PHYSICAL_TO_LOGICAL'
                                    && mapping.sourceModel === DataModel.DOCUMENT && (!this.sourceFilter || mappingUsesSource(mapping, this.sourceFilter))));
                        return forkJoin({
                            mappings: of(response.mappings),
                            relationalSources: this.adapterContext && adapterModels.includes(DataModel.RELATIONAL)
                                ? loadRelationalSources() : of(response.relationalSources),
                            documentSources: hasDocumentSource ? (this.documentTarget
                                ? this.mappings.getDocumentSources(undefined, this.targetEntityId)
                                : this.mappings.getDocumentSources(this.adapterId)).pipe(catchError(handleSourceError)) : of(null)
                        });
                    }),
                    catchError(error => {
                        this.loadError = MappingService.error(error).message;
                        return of(null);
                    })
                );
            })
        ).subscribe(response => {
            this.loading = false;
            this.dataModels = (this.adapterContext ? response?.mappings.adapterSourceModels : response?.mappings.dataModels) ?? [];
            this.rows = (response?.mappings.mappings || []).filter(mapping => (!this.embedded || mapping.targetEntityId === this.targetEntityId)
                && (!this.sourceFilter || mappingUsesSource(mapping, this.sourceFilter)));
            this.sources = [...(response?.relationalSources?.sources ?? []), ...(response?.documentSources?.sources ?? [])]
                .filter(source => !this.sourceFilter || (source.adapterId === this.sourceFilter.adapterId
                    && source.namespaceName === this.sourceFilter.namespaceName && this.sourceName(source) === this.sourceFilter.physicalName));
            if (this.sourceTargets) {
                this.selectedSource = this.filteredSources.length ? this.sourceKey(this.filteredSources[0]) : '';
            } else if (!this.createSource) {
                this.selectedSource = '';
            }
            this.setBreadcrumbs();
            if (!this.embedded) { this.sidebar.show(this.rows, undefined, this.adapterContext ? this.adapterId : undefined, this.viewKind, this.mappingQuery()); }
        }));
    }

    private setBreadcrumbs() {
        if (!this.embedded) {
            this.breadcrumbs.setBreadcrumbs(this.adapterContext
                ? [new BreadcrumbItem('Adapters', '/views/adapters'), new BreadcrumbItem(this.adapterName + ' Mappings')]
                : this.sourceTargets
                ? [new BreadcrumbItem('Mappings', '/views/mappings'),
                    new BreadcrumbItem(mappingKindLabel(this.viewKind), ['/views/mappings/kind', this.viewKind]),
                    new BreadcrumbItem('Targets for ' + this.sourceLabel)]
                : this.viewKind
                    ? [new BreadcrumbItem('Mappings', '/views/mappings'), new BreadcrumbItem(mappingKindLabel(this.viewKind))]
                    : [new BreadcrumbItem('Mappings')]);
        }
    }

    get selected(): MappingSummary {
        return this.visibleMappings.find(mapping => mapping.mappingId === this.selectedId);
    }

    get visibleMappings(): MappingSummary[] {
        return this.viewKind || this.adapterContext ? this.rows.filter(mapping => !this.viewKind || mapping.kind === this.viewKind)
            .sort((a, b) => a.mappingName.localeCompare(b.mappingName) || a.mappingId - b.mappingId) : this.rows;
    }

    mappingLink(mapping: MappingSummary): (string | number)[] {
        return mappingDetailLink(mapping, this.adapterContext ? this.adapterId : undefined);
    }

    mappingQuery() {
        return this.embedded ? {returnTargetEntityId: this.targetEntityId} : this.sourceFilter ? {
            returnSourceAdapterId: this.sourceFilter.adapterId,
            returnSourceNamespace: this.sourceFilter.namespaceName,
            returnSourceTable: this.sourceFilter.physicalName
        } : null;
    }
    sourceKey(source: CreationSource): string {
        if ('sourceEntityId' in source) {
            return ['document', source.adapterId, source.sourceEntityId, source.sourceAllocationId].join(':');
        }
        return [source.adapterId, source.targetEntityId, ...(source.sourceAllocationId == null ? [] : [source.sourceAllocationId])].join(':');
    }

    creationSourceLabel(source: CreationSource): string {
        return `${source.namespaceName}.${this.sourceName(source)} (${source.adapterName})`;
    }

    private sourceName(source: CreationSource): string {
        return 'sourceEntityId' in source ? source.physicalName : source.logicalTableName;
    }

    private sourceModel(source: CreationSource): DataModel {
        return 'sourceEntityId' in source ? DataModel.DOCUMENT : DataModel.RELATIONAL;
    }

    get selectedSourceModel(): DataModel {
        if (this.sourceTargets) {
            return this.rows[0]?.sourceModel ?? (this.sources[0] ? this.sourceModel(this.sources[0]) : null);
        }
        if (this.adapterContext) {
            return this.dataModels.includes(this.sourceModelSelection) ? this.sourceModelSelection : this.dataModels[0] ?? null;
        }
        return this.sourceModelSelection ?? (this.documentTarget ? DataModel.DOCUMENT : DataModel.RELATIONAL);
    }

    selectSourceModel(model: DataModel) {
        this.sourceModelSelection = model;
        this.selectedSource = '';
    }

    get createSource(): CreationSource {
        return this.filteredSources.find(source => this.sourceKey(source) === this.selectedSource);
    }

    get filteredSources(): CreationSource[] {
        const model = this.selectedSourceModel;
        return this.sources.filter(source => this.sourceModel(source) === model
            && ('sourceEntityId' in source ? 'PHYSICAL_TO_LOGICAL' : source.kind) === this.selectedKind);
    }

    selectKind(kind: MappingKind) {
        this.selectedKind = kind;
        this.selectedSource = '';
    }

    create() {
        const source = this.createSource;
        if (source && this.canCreate && !this.removing) {
            if ('sourceEntityId' in source) {
                const route = this.adapterContext ? ['/views/adapters', source.adapterId, 'mappings', 'document', 'create']
                    : ['/views/mappings', 'document', 'create'];
                const contextQuery = this.embedded ? {existingTargetEntityId: this.targetEntityId}
                    : this.sourceTargets ? this.mappingQuery()
                    : !this.adapterContext && this.adapterId != null ? {adapterId: this.adapterId} : {};
                this.router.navigate(route, {
                    queryParams: {...contextQuery, sourceEntityId: source.sourceEntityId, sourceAllocationId: source.sourceAllocationId}
                });
                return;
            }
            const route = this.adapterContext
                ? ['/views/adapters', this.adapterId, 'mappings', 'create']
                : ['/views/mappings/create'];
            this.router.navigate(route, {
                queryParams: {targetEntityId: source.targetEntityId,
                    ...(!this.adapterContext ? {adapterId: source.adapterId} : {}),
                    ...(source.sourceAllocationId == null ? {} : {sourceAllocationId: source.sourceAllocationId}),
                    ...(this.embedded ? {existingTargetEntityId: this.targetEntityId, returnTargetEntityId: this.targetEntityId} : {}),
                    ...(this.sourceTargets ? this.mappingQuery() : {})}
            });
        }
    }

    refresh() {
        if (!this.removing) {
            this.reload.next();
        }
    }

    confirmRemoval(mappingId = this.selectedId) {
        if (this.removing || this.loading || this.loadError) {
            return;
        }
        const mapping = this.visibleMappings.find(row => row.mappingId === mappingId);
        if (!mapping) {
            return;
        }
        if (!mapping.removable || !mapping.revision) {
            this.blockedRemovalId = mappingId;
            return;
        }
        this.blockedRemovalId = null;
        this.removal = mapping;
        this.removeError = null;
    }

    closeRemoval() {
        if (!this.removing) {
            this.removal = null;
        }
    }

    remove() {
        if (!this.removal?.removable || this.removing || this.removeError) {
            return;
        }
        this.removing = true;
        this.subscriptions.add(this.mappings.remove(this.removal.mappingId, this.removal.revision).subscribe({
            next: () => {
                const removedTarget = this.removal.removesTarget;
                const namespace = this.removal.namespaceName;
                this.removing = false;
                this.removal = null;
                this.toast.success('Mapping dropped.');
                this.refresh();
                this.subscriptions.add(this.catalog.getSnapshot().subscribe({
                    next: () => { if (this.embedded && removedTarget) { this.router.navigate(['/views/schema-editing', namespace]); } },
                    error: () => this.refreshError = true}));
            },
            error: error => {
                this.removing = false;
                this.removeError = MappingService.error(error);
            }
        }));
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
        if (!this.embedded) {
            this.sidebar.close();
            this.breadcrumbs.hide();
        }
    }
}

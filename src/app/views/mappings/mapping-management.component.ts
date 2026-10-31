import {Component, effect, inject, Input, OnChanges, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, forkJoin, of, Subject, Subscription} from 'rxjs';
import {catchError, startWith, switchMap} from 'rxjs/operators';
import {EntityType} from '../../models/catalog.model';
import {MappingService} from '../../services/mapping.service';
import {CatalogService} from '../../services/catalog.service';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {MappingSidebarService} from './mapping-sidebar.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {MAPPING_KINDS, mappingKindLabel, MappingError, MappingKind, MappingSource, MappingSummary, PhysicalSourceSelection, readPhysicalSource, mappingUsesSource} from './mapping.model';

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
    get canCreate(): boolean {
        if (this.sourceFilter) { return !!this.createSource; }
        return !this.embedded || (this.target?.entityType === EntityType.SOURCE && !this.target.modifiable);
    }
    ngOnChanges() { this.selectedSource = ''; this.refresh(); }

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
    sources: MappingSource[] = [];
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
                if (this.viewKind) {
                    this.selectKind(this.viewKind);
                }
                const value = this.embedded ? null : params.get('adapterId') ?? sourceAdapterId ?? query.get('adapterId');
                this.adapterId = value == null ? undefined : Number(value);
                if (value != null && (!/^\d+$/.test(value) || !Number.isSafeInteger(this.adapterId))) {
                    this.loadError = 'The adapter ID is invalid.';
                    return of(null);
                }
                return forkJoin({
                    mappings: this.embedded ? this.mappings.getMappings(undefined, this.targetEntityId) : this.mappings.getMappings(this.adapterId),
                    sources: (this.embedded ? this.mappings.getSources(undefined, this.targetEntityId) : this.mappings.getSources(this.adapterId)).pipe(catchError(error => {
                        this.sourceError = MappingService.error(error).message;
                        return of({sources: []});
                    }))
                }).pipe(catchError(error => {
                    this.loadError = MappingService.error(error).message;
                    return of(null);
                }));
            })
        ).subscribe(response => {
            this.loading = false;
            this.rows = (response?.mappings.mappings || []).filter(mapping => (!this.embedded || mapping.targetEntityId === this.targetEntityId)
                && (!this.sourceFilter || mappingUsesSource(mapping, this.sourceFilter)));
            this.sources = (response?.sources.sources || []).filter(source => !this.sourceFilter
                || (source.adapterId === this.sourceFilter.adapterId && source.namespaceName === this.sourceFilter.namespaceName
                    && source.logicalTableName === this.sourceFilter.physicalName));
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
                ? [new BreadcrumbItem('Mappings', '/views/mappings'), new BreadcrumbItem('Targets for ' + this.sourceLabel)]
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
        return this.adapterContext ? ['/views/adapters', this.adapterId, 'mappings', mapping.mappingId]
            : ['/views/mappings', mapping.mappingId, ...(mapping.editable ? ['edit'] : [])];
    }

    mappingQuery() {
        return this.embedded ? {returnTargetEntityId: this.targetEntityId} : this.sourceFilter ? {
            returnSourceAdapterId: this.sourceFilter.adapterId,
            returnSourceNamespace: this.sourceFilter.namespaceName,
            returnSourceTable: this.sourceFilter.physicalName
        } : null;
    }
    sourceKey(source: MappingSource): string {
        return [source.adapterId, source.targetEntityId, ...(source.sourceAllocationId == null ? [] : [source.sourceAllocationId])].join(':');
    }

    get createSource(): MappingSource {
        return this.filteredSources.find(source => this.sourceKey(source) === this.selectedSource);
    }

    get filteredSources(): MappingSource[] {
        return this.sources.filter(source => source.kind === this.selectedKind);
    }

    selectKind(kind: MappingKind) {
        this.selectedKind = kind;
        this.selectedSource = '';
    }

    create() {
        const source = this.createSource;
        if (source && this.canCreate && !this.removing) {
            this.router.navigate(['/views/mappings/create'], {
                queryParams: {adapterId: source.adapterId, targetEntityId: source.targetEntityId,
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

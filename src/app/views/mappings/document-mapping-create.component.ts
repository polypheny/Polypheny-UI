import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, ViewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Params, Router, RouterLink} from '@angular/router';
import {AlertModule, ButtonModule, CardModule, FormModule, SpinnerModule} from '@coreui/angular';
import {combineLatest, merge, of, Subject} from 'rxjs';
import {catchError, map, startWith, switchMap, tap} from 'rxjs/operators';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {DataModel} from '../../models/ui-request.model';
import {CatalogService} from '../../services/catalog.service';
import {MappingService} from '../../services/mapping.service';
import {clearDocumentFieldErrors, DocumentMappingField, DocumentMappingValidation} from './document-mapping-validation';
import {MappingDiscardDialogComponent} from './mapping-discard-dialog.component';
import {DocumentMappingDetail, DocumentMappingSource, mappingDetailLink, MappingError, mappingKindLabel, readPhysicalSource} from './mapping.model';
import {MappingSidebarService} from './mapping-sidebar.service';
import {MappingCanDeactivate} from './mapping-unsaved-changes.guard';

@Component({
    selector: 'app-document-mapping-create',
    standalone: true,
    providers: [DocumentMappingValidation],
    imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertModule, ButtonModule, CardModule, FormModule, SpinnerModule, MappingDiscardDialogComponent],
    templateUrl: './document-mapping-create.component.html',
    styleUrls: ['./mapping-editor.component.scss']
})
export class DocumentMappingCreateComponent implements OnInit, MappingCanDeactivate {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly mappings = inject(MappingService);
    private readonly catalog = inject(CatalogService);
    private readonly toast = inject(ToasterService);
    private readonly breadcrumbs = inject(BreadcrumbService);
    private readonly sidebar = inject(MappingSidebarService);
    readonly validation = inject(DocumentMappingValidation);
    private readonly destroyRef = inject(DestroyRef);
    private readonly reloadSources = new Subject<void>();
    private readonly reloadDraft = new Subject<void>();
    private readonly reloadSidebar = new Subject<void>();
    private returnQuery: Params;
    private nameBeforeRename: string;
    private draftDefaults: DocumentMappingDetail;
    @ViewChild(MappingDiscardDialogComponent, {static: true}) private discardDialog: MappingDiscardDialogComponent;

    adapterContextId: number | null = null;
    existingTargetEntityId: number | null = null;
    readonly source = new FormControl<DocumentMappingSource | null>(null);
    readonly target = new FormGroup({
        targetNamespaceId: new FormControl<number | null>(null, control => !this.draft
            || this.namespaces().some(namespace => namespace.id === control.value) ? null : {namespace: true}),
        logicalCollectionName: new FormControl('', control => this.validation.collectionName(
            control.value, this.draft, control.parent?.get('targetNamespaceId')?.value ?? this.draft?.namespaceId)),
        mappingName: new FormControl('', control => this.validation.mappingName(control.value, this.draft))
    });
    readonly namespaces = computed(() => Array.from(this.catalog.namespaces().values())
        .filter(namespace => namespace.dataModel === DataModel.DOCUMENT)
        .sort((a, b) => a.name.localeCompare(b.name)));

    sources: DocumentMappingSource[] = [];
    sourceLocked = false;
    draft: DocumentMappingDetail;
    nameEditing = false;
    backLink: (string | number)[] = ['/views/mappings'];
    backQuery: Params;
    loadingSources = true;
    loadingDraft = false;
    saving = false;
    created: DocumentMappingDetail;
    sourceError: string;
    draftError: string;
    saveError: MappingError;

    ngOnInit() {
        this.destroyRef.onDestroy(() => {
            this.breadcrumbs.hide();
            this.sidebar.close();
        });

        for (const field of ['mappingName', 'logicalCollectionName'] as const) {
            this.target.controls[field].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.saveError = clearDocumentFieldErrors(this.saveError, field);
            });
        }
        this.target.controls.targetNamespaceId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.saveError = clearDocumentFieldErrors(this.saveError, 'targetNamespaceId', 'logicalCollectionName');
            this.target.controls.logicalCollectionName.updateValueAndValidity({emitEvent: false});
        });

        merge(this.source.valueChanges.pipe(tap(() => {
            this.target.reset();
            this.draftDefaults = null;
            this.nameEditing = false;
        })), this.reloadDraft.pipe(map(() => this.source.value))).pipe(
            switchMap(source => {
                this.draft = null;
                this.draftError = null;
                this.saveError = null;
                this.loadingDraft = !!source;
                return source ? this.mappings.getDocumentDraft(source, this.existingTargetEntityId).pipe(catchError(error => {
                    this.draftError = MappingService.error(error).message;
                    return of(null);
                })) : of(null);
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(draft => {
            this.draft = draft;
            this.loadingDraft = false;
            if (draft) {
                this.draftDefaults = draft;
                const {targetNamespaceId, logicalCollectionName, mappingName} = this.target.getRawValue();
                if (this.existingTargetEntityId != null) {
                    this.backLink = this.targetMappingsLink(draft.namespaceName, draft.logicalCollectionName);
                }
                this.target.setValue({
                    targetNamespaceId: this.adapterContextId == null && this.existingTargetEntityId == null
                        ? targetNamespaceId ?? draft.namespaceId : draft.namespaceId,
                    logicalCollectionName: this.existingTargetEntityId == null
                        ? logicalCollectionName ?? draft.logicalCollectionName : draft.logicalCollectionName,
                    mappingName: mappingName ?? draft.mappingName
                });
            }
        });

        combineLatest([this.route.paramMap, this.route.queryParamMap, this.reloadSources.pipe(startWith(undefined))]).pipe(
            switchMap(([params, query]) => {
                this.loadingSources = true;
                this.sourceError = null;
                this.sources = [];
                this.sourceLocked = false;
                this.source.reset();
                const routeAdapterId = params.get('adapterId');
                if (routeAdapterId == null) {
                    this.sidebar.show([]);
                }
                const physicalSource = readPhysicalSource(query.get('returnSourceAdapterId'), query.get('returnSourceNamespace'), query.get('returnSourceTable'));
                const requestedAdapterId = routeAdapterId ?? query.get('adapterId') ?? query.get('returnSourceAdapterId');
                const requestedTargetId = query.get('existingTargetEntityId');
                this.existingTargetEntityId = /^\d+$/.test(requestedTargetId) && Number.isSafeInteger(Number(requestedTargetId))
                    ? Number(requestedTargetId) : null;
                const adapterId = requestedAdapterId == null ? undefined : Number(requestedAdapterId);
                if (requestedAdapterId != null && (!/^\d+$/.test(requestedAdapterId) || !Number.isSafeInteger(adapterId))) {
                    if (this.adapterContextId != null) {
                        this.sidebar.close();
                    }
                    this.adapterContextId = null;
                    this.setBreadcrumbs();
                    this.sourceError = 'The adapter ID is invalid.';
                    return of({sources: [], selectedSource: null});
                }
                this.adapterContextId = routeAdapterId == null ? null : adapterId;
                if (this.adapterContextId == null && this.existingTargetEntityId == null) {
                    this.target.controls.targetNamespaceId.enable({emitEvent: false});
                } else {
                    this.target.controls.targetNamespaceId.disable({emitEvent: false});
                }
                if (this.existingTargetEntityId == null) {
                    this.target.controls.logicalCollectionName.enable({emitEvent: false});
                } else {
                    this.target.controls.logicalCollectionName.disable({emitEvent: false});
                }
                const targetCollection = this.catalog.entities().get(this.existingTargetEntityId);
                const targetNamespace = targetCollection && this.catalog.namespaces().get(targetCollection.namespaceId);
                this.backLink = this.adapterContextId != null ? ['/views/adapters', this.adapterContextId, 'mappings', 'list']
                    : this.existingTargetEntityId != null ? this.targetMappingsLink(targetNamespace?.name, targetCollection?.name)
                        : physicalSource ? ['/views/mappings/source', physicalSource.adapterId] : ['/views/mappings'];
                this.backQuery = this.adapterContextId != null || this.existingTargetEntityId != null ? null
                    : physicalSource ? {sourceNamespace: physicalSource.namespaceName, sourceTable: physicalSource.physicalName}
                    : query.has('adapterId') ? {adapterId} : null;
                this.setBreadcrumbs();
                if (requestedTargetId != null && this.existingTargetEntityId == null) {
                    this.sourceError = 'The target collection ID is invalid.';
                    return of({sources: [], selectedSource: null});
                }
                this.returnQuery = this.existingTargetEntityId != null ? {returnTargetEntityId: this.existingTargetEntityId}
                    : physicalSource ? {returnSourceAdapterId: physicalSource.adapterId,
                    returnSourceNamespace: physicalSource.namespaceName, returnSourceTable: physicalSource.physicalName} : null;
                const sourceEntityId = query.get('sourceEntityId');
                const sourceAllocationId = query.get('sourceAllocationId');
                const sourcesRequest = this.mappings.getDocumentSources(adapterId, this.existingTargetEntityId).pipe(
                    map(({sources}) => {
                        if (physicalSource) {
                            const matches = sources.filter(source => source.adapterId === physicalSource.adapterId
                                && source.namespaceName === physicalSource.namespaceName && source.physicalName === physicalSource.physicalName);
                            return {sources: matches, selectedSource: matches.length === 1 ? matches[0] : null};
                        }
                        const selectedSource = sources.find(source => String(source.sourceEntityId) === sourceEntityId
                            && String(source.sourceAllocationId) === sourceAllocationId);
                        if (this.existingTargetEntityId != null && (sourceEntityId != null || sourceAllocationId != null) && !selectedSource) {
                            this.sourceError = 'The selected source collection is no longer available for this target.';
                            return {sources: [], selectedSource: null};
                        }
                        return {sources, selectedSource};
                    }),
                    catchError(error => {
                        this.sourceError = MappingService.error(error).message;
                        return of({sources: [], selectedSource: null});
                    })
                );
                const sidebarRequest = merge(this.reloadSidebar, this.validation.catalogUpdates).pipe(
                    startWith(undefined),
                    switchMap(() => {
                        this.target.controls.targetNamespaceId.updateValueAndValidity({emitEvent: false});
                        this.target.controls.logicalCollectionName.updateValueAndValidity({emitEvent: false});
                        const globalList = this.adapterContextId == null ? this.sidebar.loadGlobal(physicalSource) : undefined;
                        const summaries = this.validation.loadSummaries(
                            () => this.target.controls.mappingName.updateValueAndValidity({emitEvent: false}), globalList);
                        return this.adapterContextId == null ? summaries : merge(summaries,
                            this.sidebar.loadAdapter(this.adapterContextId, this.adapterName));
                    })
                );
                return merge(sourcesRequest, sidebarRequest);
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(({sources, selectedSource}) => {
            this.sources = sources;
            this.loadingSources = false;
            this.sourceLocked = !!selectedSource;
            if (this.adapterContextId != null) {
                this.setBreadcrumbs();
            }
            const initialSource = selectedSource ?? sources[0];
            if (initialSource) {
                this.source.setValue(initialSource);
            }
        });
    }

    private get adapterName(): string {
        return this.sources[0]?.adapterName ?? this.catalog.adapters().get(this.adapterContextId)?.name ?? `Adapter ${this.adapterContextId}`;
    }

    private targetMappingsLink(namespace: string, collection: string): (string | number)[] {
        return namespace && collection ? ['/views/schema-editing', `${namespace}.${collection}`, 'mappings'] : ['/views/schema-editing'];
    }

    private setBreadcrumbs() {
        if (this.adapterContextId == null) {
            const kind = 'PHYSICAL_TO_LOGICAL';
            this.breadcrumbs.setBreadcrumbs([
                new BreadcrumbItem('Mappings', ['/views/mappings']),
                new BreadcrumbItem(mappingKindLabel(kind), ['/views/mappings/kind', kind]),
                new BreadcrumbItem('Create Mapping')
            ]);
            return;
        }
        this.breadcrumbs.setBreadcrumbs([
            new BreadcrumbItem('Adapters', '/views/adapters'),
            new BreadcrumbItem(`${this.adapterName} Mappings`, this.backLink),
            new BreadcrumbItem('Create Mapping')
        ]);
    }

    startRename() {
        this.nameBeforeRename = this.target.controls.mappingName.value;
        this.nameEditing = true;
    }

    finishRename() {
        if (this.canRename) {
            this.target.controls.mappingName.setValue(this.target.controls.mappingName.value.trim());
            this.nameEditing = false;
        }
    }

    cancelRename() {
        this.target.controls.mappingName.setValue(this.nameBeforeRename);
        this.nameEditing = false;
    }

    cancel() {
        this.router.navigate(this.backLink, {queryParams: this.backQuery});
    }

    canDeactivate(): boolean | Promise<boolean> {
        return this.saving ? false : !this.hasDraftChanges || this.discardDialog.confirm();
    }

    private get hasDraftChanges(): boolean {
        if (!this.draftDefaults || this.created) {
            return false;
        }
        const {targetNamespaceId, logicalCollectionName, mappingName} = this.target.getRawValue();
        return targetNamespaceId !== this.draftDefaults.namespaceId
            || logicalCollectionName?.trim() !== this.draftDefaults.logicalCollectionName
            || mappingName?.trim() !== this.draftDefaults.mappingName;
    }

    get canCreate(): boolean {
        return !!this.draft && !!this.source.value && this.target.valid && !this.saving && !this.created
            && (this.adapterContextId == null || this.target.controls.targetNamespaceId.value === this.draft.namespaceId)
            && !this.validation.loadingSummaries && !this.validation.summaryError && this.saveError?.code !== 'REVISION'
            && !Object.keys(this.saveError?.fieldErrors ?? {}).length;
    }

    get canRename(): boolean {
        return !!this.draft && !this.saving && !this.created && this.saveError?.code !== 'REVISION'
            && !this.validation.loadingSummaries && !this.validation.summaryError
            && this.target.controls.mappingName.valid && !this.saveError?.fieldErrors?.mappingName;
    }

    get showSaveError(): boolean {
        return !!this.saveError && !Object.keys(this.saveError.fieldErrors ?? {}).length;
    }

    fieldError(field: DocumentMappingField): string | null {
        return this.validation.fieldError(this.target.controls[field], field, this.draft, this.saveError);
    }

    retrySources() {
        this.reloadSources.next();
    }

    retryDraft() {
        this.reloadDraft.next();
    }

    retrySidebar() {
        this.reloadSidebar.next();
    }

    create() {
        if (!this.canCreate) {
            return;
        }
        const {adapterId, sourceEntityId, sourceAllocationId} = this.source.value;
        const {targetNamespaceId, logicalCollectionName, mappingName} = this.target.getRawValue();
        this.saving = true;
        this.saveError = null;
        this.mappings.createDocument({adapterId, sourceEntityId, sourceAllocationId, expectedRevision: this.draft.revision,
            targetNamespaceId, logicalCollectionName: logicalCollectionName.trim(), mappingName: mappingName.trim(),
            ...(this.existingTargetEntityId == null ? {} : {existingTargetEntityId: this.existingTargetEntityId})}).pipe(
            switchMap(created => this.catalog.getSnapshot().pipe(
                map(() => created),
                catchError(() => {
                    this.toast.warn('Mapping created. The catalog could not be refreshed.');
                    return of(created);
                })
            )),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: created => {
                this.created = created;
                this.saving = false;
                this.toast.success('Document mapping created.');
                if (this.existingTargetEntityId != null) {
                    this.router.navigate(this.targetMappingsLink(created.namespaceName, created.logicalCollectionName), {replaceUrl: true});
                } else {
                    this.router.navigate(this.createdLink, {queryParams: this.returnQuery, replaceUrl: true});
                }
            },
            error: error => {
                this.saving = false;
                this.saveError = MappingService.error(error);
                if (this.saveError.fieldErrors?.mappingName) {
                    this.nameBeforeRename = this.draft.mappingName;
                    this.nameEditing = true;
                }
            }
        });
    }

    get createdLink(): (string | number)[] {
        return mappingDetailLink(this.created, this.adapterContextId);
    }
}

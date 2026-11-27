import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, ViewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Params, Router, RouterLink} from '@angular/router';
import {AlertModule, ButtonModule, CardModule, FormModule, SpinnerModule} from '@coreui/angular';
import {combineLatest, merge, of, Subject} from 'rxjs';
import {catchError, startWith, switchMap} from 'rxjs/operators';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {DataModel} from '../../models/ui-request.model';
import {CatalogService} from '../../services/catalog.service';
import {MappingService} from '../../services/mapping.service';
import {MappingDiscardDialogComponent} from './mapping-discard-dialog.component';
import {DocumentMappingDetail, isDocumentMappingDetail, MappingError, mappingKindLabel, readPhysicalSource} from './mapping.model';
import {clearDocumentFieldErrors, DocumentMappingField, DocumentMappingValidation} from './document-mapping-validation';
import {MappingSidebarService} from './mapping-sidebar.service';
import {MappingCanDeactivate} from './mapping-unsaved-changes.guard';

@Component({
    selector: 'app-document-mapping-detail',
    standalone: true,
    providers: [DocumentMappingValidation],
    imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertModule, ButtonModule, CardModule, FormModule, SpinnerModule, MappingDiscardDialogComponent],
    templateUrl: './document-mapping-detail.component.html',
    styleUrls: ['./mapping-editor.component.scss']
})
export class DocumentMappingDetailComponent implements OnInit, MappingCanDeactivate {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly mappings = inject(MappingService);
    private readonly catalog = inject(CatalogService);
    private readonly toast = inject(ToasterService);
    private readonly breadcrumbs = inject(BreadcrumbService);
    private readonly sidebar = inject(MappingSidebarService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly reload = new Subject<void>();
    private readonly reloadSidebar = new Subject<void>();
    readonly validation = inject(DocumentMappingValidation);
    private adapterContextId: number | null = null;
    private returnTargetEntityId: number | null = null;
    private mappingListLink: (string | number)[] = ['/views/mappings'];
    private nameBeforeRename: string;
    @ViewChild(MappingDiscardDialogComponent, {static: true}) private discardDialog: MappingDiscardDialogComponent;

    readonly names = new FormGroup({
        mappingName: new FormControl('', {nonNullable: true, validators: control => this.validation.mappingName(control.value, this.detail)}),
        targetNamespaceId: new FormControl<number | null>(null, control => !this.detail || control.value === this.detail.namespaceId
            || this.namespaces().some(namespace => namespace.id === control.value) ? null : {namespace: true}),
        logicalCollectionName: new FormControl('', {nonNullable: true, validators: control => this.validation.collectionName(
            control.value, this.detail, control.parent?.get('targetNamespaceId')?.value ?? this.detail?.namespaceId)})
    });
    readonly namespaces = computed(() => Array.from(this.catalog.namespaces().values())
        .filter(namespace => namespace.dataModel === DataModel.DOCUMENT)
        .sort((a, b) => a.name.localeCompare(b.name)));
    detail: DocumentMappingDetail;
    nameEditing = false;
    saving = false;
    saveError: MappingError;
    loading = true;
    loadError: string;
    backQuery: Params;

    ngOnInit() {
        this.destroyRef.onDestroy(() => {
            this.breadcrumbs.hide();
            this.sidebar.close();
        });
        for (const field of ['mappingName', 'logicalCollectionName'] as const) {
            this.names.controls[field].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.saveError = clearDocumentFieldErrors(this.saveError, field);
            });
        }
        this.names.controls.targetNamespaceId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.saveError = clearDocumentFieldErrors(this.saveError, 'targetNamespaceId', 'logicalCollectionName');
            this.names.controls.logicalCollectionName.updateValueAndValidity({emitEvent: false});
        });
        combineLatest([this.route.paramMap, this.route.queryParamMap, this.reload.pipe(startWith(undefined))]).pipe(
            switchMap(([params, query]) => {
                this.detail = null;
                this.nameEditing = false;
                this.saving = false;
                this.saveError = null;
                this.loading = true;
                this.loadError = null;
                const mappingId = this.parseId(params.get('mappingId'));
                const adapterId = this.parseId(params.get('adapterId'));
                this.adapterContextId = adapterId;
                this.returnTargetEntityId = adapterId == null ? this.parseId(query.get('returnTargetEntityId')) : null;
                if (adapterId == null) {
                    this.sidebar.show([]);
                }
                const source = readPhysicalSource(query.get('returnSourceAdapterId'), query.get('returnSourceNamespace'), query.get('returnSourceTable'));
                this.mappingListLink = adapterId != null ? ['/views/adapters', adapterId, 'mappings', 'list']
                    : source ? ['/views/mappings/source', source.adapterId] : ['/views/mappings'];
                this.backQuery = adapterId == null && this.returnTargetEntityId == null && source
                    ? {sourceNamespace: source.namespaceName, sourceTable: source.physicalName} : null;
                this.setBreadcrumbs();
                if (mappingId == null || (params.has('adapterId') && adapterId == null)) {
                    this.loadError = 'The adapter or mapping ID is invalid.';
                    return of(null);
                }
                const request = (adapterId == null ? this.mappings.getMapping(mappingId) : this.mappings.getDetail(adapterId, mappingId)).pipe(catchError(error => {
                    this.loadError = MappingService.error(error).message;
                    return of(null);
                }));
                return merge(request, merge(this.reloadSidebar, this.validation.catalogUpdates).pipe(
                    startWith(undefined),
                    switchMap(() => {
                        this.names.controls.targetNamespaceId.updateValueAndValidity({emitEvent: false});
                        this.names.controls.logicalCollectionName.updateValueAndValidity({emitEvent: false});
                        const summaries = this.validation.loadSummaries(
                            () => this.names.controls.mappingName.updateValueAndValidity({emitEvent: false}),
                            adapterId == null ? this.sidebar.loadGlobal(source, mappingId) : undefined
                        );
                        return adapterId == null ? summaries : merge(summaries, this.sidebar.loadAdapter(adapterId, this.adapterName, mappingId));
                    })
                ));
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(detail => {
            this.loading = false;
            if (detail && isDocumentMappingDetail(detail)) {
                this.detail = detail;
                this.resetNames();
                if (detail.editable) {
                    this.names.enable();
                    if (detail.fixedTargetEntityId != null) {
                        this.names.controls.targetNamespaceId.disable({emitEvent: false});
                        this.names.controls.logicalCollectionName.disable({emitEvent: false});
                    }
                } else {
                    this.names.disable();
                }
            } else if (detail) {
                this.loadError = 'This mapping has a different target model.';
            }
            this.setBreadcrumbs();
        });
    }

    startRename() {
        this.nameBeforeRename = this.names.controls.mappingName.value;
        this.nameEditing = true;
    }

    finishRename() {
        if (this.canRename) {
            this.names.controls.mappingName.setValue(this.names.controls.mappingName.value.trim());
            this.nameEditing = false;
        }
    }

    cancelRename() {
        this.names.controls.mappingName.setValue(this.nameBeforeRename);
        this.nameEditing = false;
    }

    get backLink(): (string | number)[] {
        if (this.returnTargetEntityId == null) {
            return this.mappingListLink;
        }
        if (this.detail?.targetEntityId === this.returnTargetEntityId) {
            return this.targetMappingsLink;
        }
        const entity = this.catalog.entities().get(this.returnTargetEntityId);
        const namespace = entity && this.catalog.namespaces().get(entity.namespaceId);
        return namespace ? ['/views/schema-editing', `${namespace.name}.${entity.name}`, 'mappings'] : ['/views/schema-editing'];
    }

    get targetMappingsLink(): string[] {
        return ['/views/schema-editing', `${this.detail.namespaceName}.${this.detail.logicalCollectionName}`, 'mappings'];
    }

    cancel() {
        this.router.navigate(this.backLink, {queryParams: this.backQuery});
    }

    canDeactivate(): boolean | Promise<boolean> {
        return this.saving ? false : !this.hasChanges || this.discardDialog.confirm();
    }

    get canSaveNames(): boolean {
        return !!this.detail?.editable && !this.saving && this.saveError?.code !== 'REVISION'
            && this.names.valid && this.hasChanges && !this.validation.loadingSummaries && !this.validation.summaryError
            && !Object.keys(this.saveError?.fieldErrors ?? {}).length;
    }

    get canRename(): boolean {
        return !!this.detail?.editable && !this.saving && this.saveError?.code !== 'REVISION'
            && !this.validation.loadingSummaries && !this.validation.summaryError
            && this.names.controls.mappingName.valid && !this.saveError?.fieldErrors?.mappingName;
    }

    get showSaveError(): boolean {
        return !!this.saveError && !Object.keys(this.saveError.fieldErrors ?? {}).length;
    }

    fieldError(field: DocumentMappingField): string | null {
        return this.validation.fieldError(this.names.controls[field], field, this.detail, this.saveError);
    }

    saveNames() {
        if (!this.canSaveNames) {
            return;
        }
        const current = this.detail;
        this.saving = true;
        this.saveError = null;
        this.mappings.updateDocument({adapterId: current.adapterId, mappingId: current.mappingId,
            expectedRevision: current.revision, targetNamespaceId: this.names.controls.targetNamespaceId.value,
            ...this.trimmedNames()}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: saved => {
                if (this.detail !== current) {
                    return;
                }
                this.detail = saved;
                this.resetNames();
                this.saving = false;
                this.nameEditing = false;
                this.setBreadcrumbs();
                this.reloadSidebar.next();
                this.toast.success('Document mapping updated.');
                this.catalog.getSnapshot().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                    next: () => {
                        if (this.detail === saved && this.returnTargetEntityId === saved.targetEntityId) {
                            this.cancel();
                        }
                    },
                    error: () => this.toast.warn('Mapping saved. The catalog could not be refreshed.')
                });
            },
            error: error => {
                if (this.detail === current) {
                    this.saving = false;
                    this.saveError = MappingService.error(error);
                    if (this.saveError.fieldErrors?.mappingName) {
                        this.nameBeforeRename = current.mappingName;
                        this.nameEditing = true;
                    }
                }
            }
        });
    }

    async retry() {
        if (await this.canDeactivate()) {
            this.reload.next();
        }
    }

    retrySidebar() {
        this.reloadSidebar.next();
    }

    private trimmedNames() {
        const {mappingName, logicalCollectionName} = this.names.getRawValue();
        return {mappingName: mappingName.trim(), logicalCollectionName: logicalCollectionName.trim()};
    }

    private resetNames() {
        this.names.reset({mappingName: this.detail.mappingName, logicalCollectionName: this.detail.logicalCollectionName,
            targetNamespaceId: this.detail.namespaceId});
    }

    private get hasChanges(): boolean {
        const {mappingName, logicalCollectionName} = this.trimmedNames();
        return !!this.detail && (mappingName !== this.detail.mappingName || logicalCollectionName !== this.detail.logicalCollectionName
            || this.names.controls.targetNamespaceId.value !== this.detail.namespaceId);
    }

    get showCurrentNamespaceOption(): boolean {
        return this.names.controls.targetNamespaceId.disabled || !this.namespaces().some(namespace => namespace.id === this.detail.namespaceId);
    }

    private get adapterName(): string {
        return this.detail?.adapterName ?? this.catalog.adapters().get(this.adapterContextId)?.name ?? `Adapter ${this.adapterContextId}`;
    }

    get pageTitle(): string {
        return this.detail && !this.detail.editable ? 'Mapping Details' : 'Edit Mapping';
    }

    private setBreadcrumbs() {
        this.breadcrumbs.setBreadcrumbs(this.adapterContextId != null ? [
            new BreadcrumbItem('Adapters', '/views/adapters'),
            new BreadcrumbItem(`${this.adapterName} Mappings`, this.backLink),
            new BreadcrumbItem(this.pageTitle)
        ] : [
            new BreadcrumbItem('Mappings', ['/views/mappings']),
            ...(this.detail?.kind ? [new BreadcrumbItem(mappingKindLabel(this.detail.kind), ['/views/mappings/kind', this.detail.kind])] : []),
            new BreadcrumbItem(this.pageTitle)
        ]);
    }

    private parseId(value: string): number | null {
        const id = /^\d+$/.test(value) ? Number(value) : NaN;
        return Number.isSafeInteger(id) ? id : null;
    }
}

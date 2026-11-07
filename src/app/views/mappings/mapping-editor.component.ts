import {Component, effect, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors} from '@angular/forms';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {combineLatest, of, Subject, Subscription} from 'rxjs';
import {catchError, map, startWith, switchMap} from 'rxjs/operators';
import {MappingService} from '../../services/mapping.service';
import {CatalogService} from '../../services/catalog.service';
import {NamespaceModel} from '../../models/catalog.model';
import {DataModel} from '../../models/ui-request.model';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {MappingSidebarService} from './mapping-sidebar.service';
import {MappingDetail, MappingDraft, MappingError, MappingSummary, MappingUpdate, mappingKindLabel, PhysicalSourceSelection, readPhysicalSource, mappingUsesSource} from './mapping.model';

@Component({
    selector: 'app-mapping-editor',
    templateUrl: './mapping-editor.component.html',
    styleUrls: ['./mapping-editor.component.scss']
})
export class MappingEditorComponent implements OnInit, OnDestroy {
    private readonly mappings = inject(MappingService);
    private readonly catalog = inject(CatalogService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly toast = inject(ToasterService);
    private readonly breadcrumbs = inject(BreadcrumbService);
    private readonly sidebar = inject(MappingSidebarService);
    private readonly subscriptions = new Subscription();
    private readonly reload = new Subject<void>();
    private summaryRequest: Subscription;
    private confirmation: Promise<boolean>;
    private resolveConfirmation: (discard: boolean) => void;
    private baseline: string;
    private fieldSubscriptions = new Subscription();
    private validationMappings: MappingSummary[] = [];
    private summariesLoading = false;
    private nameBeforeRename = '';

    returnTargetEntityId: number;
    private returnSource: PhysicalSourceSelection;
    private draftSourceEntityId: number;
    private draftSourceAllocationId: number;
    private existingTargetEntityId: number;
    adapterId: number;
    adapterName = '';
    summaries: MappingSummary[] = [];
    detail: MappingDetail;
    form: FormGroup;
    loading = true;
    saving = false;
    conflict = false;
    loadError: string;
    saveError: MappingError;
    refreshError = false;
    summaryError = false;
    confirmVisible = false;
    adapterContext = false;
    isCreate = false;
    readOnly = false;
    nameEditing = false;

    @ViewChild('mappingNameEditor', {read: ElementRef}) private mappingNameEditor: ElementRef<HTMLElement>;

    @ViewChild('mappingNameInput') set mappingNameInput(input: ElementRef<HTMLInputElement>) {
        if (input) {
            queueMicrotask(() => {
                if (this.nameEditing && input.nativeElement.isConnected) {
                    input.nativeElement.focus();
                    input.nativeElement.select();
                }
            });
        }
    }

    constructor() {
        effect(() => {
            if (this.catalog.listener() && !this.loading && !this.saving) {
                this.refreshSummaries();
                this.form?.get('targetNamespaceId').updateValueAndValidity({emitEvent: false});
                this.form?.get('logicalTableName').updateValueAndValidity({emitEvent: false});
                if (this.form) {
                    this.validateColumns();
                }
            }
        });
    }

    ngOnInit() {
        this.sidebar.show([]);
        this.subscriptions.add(combineLatest([
            this.route.paramMap, this.route.queryParamMap || of(convertToParamMap({})), this.reload.pipe(startWith(undefined))
        ]).pipe(
            switchMap(([params, query]) => {
                this.summaryRequest?.unsubscribe();
                this.loading = true;
                this.loadError = null;
                this.summaryError = false;
                this.refreshError = false;
                this.detail = null;
                this.form = null;
                this.summaries = [];
                this.validationMappings = [];
                this.adapterName = '';
                this.adapterContext = params.has('adapterId');
                this.isCreate = !!this.route.snapshot?.data?.create;
                this.readOnly = !!this.route.snapshot?.data?.readOnly;
                this.returnTargetEntityId = query.has('returnTargetEntityId') ? this.parseId(query.get('returnTargetEntityId')) : null;
                const sourceReturnKeys = ['returnSourceAdapterId', 'returnSourceNamespace', 'returnSourceTable'];
                this.returnSource = sourceReturnKeys.some(key => query.has(key))
                    ? readPhysicalSource(query.get('returnSourceAdapterId'), query.get('returnSourceNamespace'), query.get('returnSourceTable')) : null;
                if (sourceReturnKeys.some(key => query.has(key)) && !this.returnSource) {
                    this.loadError = 'The physical source is invalid.';
                    return of(null);
                }
                this.existingTargetEntityId = query.has('existingTargetEntityId') ? this.parseId(query.get('existingTargetEntityId')) : null;
                this.draftSourceAllocationId = query.has('sourceAllocationId') ? this.parseId(query.get('sourceAllocationId')) : null;
                if (['returnTargetEntityId', 'existingTargetEntityId', 'sourceAllocationId'].some(key => query.has(key) && this.parseId(query.get(key)) == null)) {
                    this.loadError = 'The source or target ID is invalid.';
                    return of(null);
                }
                this.adapterId = this.parseId(params.get('adapterId') || query.get('adapterId'));
                const mappingId = params.has('mappingId') ? this.parseId(params.get('mappingId')) : null;
                this.setBreadcrumbs();
                if ((this.adapterContext && this.adapterId == null) || (query.has('adapterId') && this.adapterId == null)
                    || (params.has('mappingId') && mappingId == null)) {
                    this.loadError = 'The adapter or mapping ID is invalid.';
                    return of(null);
                }
                this.refreshSummaries();
                if (this.isCreate) {
                    const targetEntityId = query.has('targetEntityId') ? this.parseId(query.get('targetEntityId')) : null;
                    if (query.has('targetEntityId') && (targetEntityId == null || this.adapterId == null)) {
                        this.loadError = 'The source ID is invalid.';
                        return of(null);
                    }
                    if (targetEntityId == null || this.adapterId == null) {
                        this.loadError = 'Choose a source entity on the Mappings page before creating a mapping.';
                        return of(null);
                    }
                    this.draftSourceEntityId = targetEntityId;
                    const draft = this.existingTargetEntityId == null && this.draftSourceAllocationId == null
                        ? this.mappings.getDraft(this.adapterId, targetEntityId)
                        : this.mappings.getDraft(this.adapterId, targetEntityId, this.existingTargetEntityId ?? undefined, this.draftSourceAllocationId ?? undefined);
                    return draft.pipe(
                        catchError(error => {
                            this.loadError = MappingService.error(error).message;
                            return of(null);
                        })
                    );
                }
                if (mappingId == null) {
                    this.loadError = 'Choose a mapping from the mapping list.';
                    return of(null);
                }
                if (!this.adapterContext) {
                    return this.mappings.getMapping(mappingId).pipe(catchError(error => {
                        this.loadError = MappingService.error(error).message;
                        return of(null);
                    }));
                }
                return this.loadAdapterMappings(this.adapterId).pipe(
                    switchMap(adapter => {
                        if (!adapter) {
                            this.loadError = 'This source adapter is no longer available.';
                            return of(null);
                        }
                        this.adapterName = adapter.adapterName;
                        this.setSummaries(adapter.mappings);
                        this.setBreadcrumbs();
                        return this.mappings.getDetail(this.adapterId, mappingId);
                    }),
                    catchError(error => {
                        this.loadError = MappingService.error(error).message;
                        return of(null);
                    })
                );
            })
        ).subscribe(detail => {
            this.loading = false;
            if (detail) {
                this.acceptDetail(detail);
            }
        }));
    }

    private parseId(value: string): number {
        if (!value || !/^\d+$/.test(value)) {
            return null;
        }
        const id = Number(value);
        return Number.isSafeInteger(id) && id >= 0 ? id : null;
    }

    private setBreadcrumbs() {
        this.breadcrumbs.setBreadcrumbs([
            this.adapterContext ? new BreadcrumbItem('Adapters', '/views/adapters') : new BreadcrumbItem('Mappings', '/views/mappings'),
            ...(this.adapterContext && this.adapterName ? [new BreadcrumbItem(`${this.adapterName} Mappings`, this.adapterMappingsLink)] : []),
            ...(!this.adapterContext && this.detail ? [new BreadcrumbItem(mappingKindLabel(this.detail.kind),
                ['/views/mappings/kind', this.detail.kind])] : []),
            new BreadcrumbItem(this.pageTitle)
        ]);
    }

    get pageTitle(): string {
        return this.isCreate ? 'Create Mapping' : this.readOnly ? 'Mapping Details' : 'Edit Mapping';
    }

    get adapterMappingsLink(): (string | number)[] | null {
        return this.adapterContext && this.adapterId != null ? ['/views/adapters', this.adapterId, 'mappings', 'list'] : null;
    }

    get canEdit(): boolean {
        return !!this.detail?.editable && !this.readOnly;
    }

    get fixedTarget(): boolean { return this.detail?.fixedTargetEntityId != null; }

    get schemaLocked(): boolean { return this.fixedTarget && !this.isCreate; }

    get returnQuery() {
        return this.returnTargetEntityId != null ? {returnTargetEntityId: this.returnTargetEntityId} : this.returnSource ? {
            returnSourceAdapterId: this.returnSource.adapterId,
            returnSourceNamespace: this.returnSource.namespaceName,
            returnSourceTable: this.returnSource.physicalName
        } : null;
    }

    get targetNamespaces(): NamespaceModel[] {
        return Array.from(this.catalog.namespaces().values())
            .filter(namespace => namespace.dataModel === DataModel.RELATIONAL)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    get targetNamespace(): NamespaceModel {
        return this.catalog.namespaces().get(this.form?.get('targetNamespaceId')?.value);
    }

    get targetModel(): DataModel {
        return this.targetNamespace?.dataModel || this.detail?.targetModel;
    }

    private setSummaries(summaries: MappingSummary[]) {
        this.summaries = summaries.filter(mapping => !this.returnSource || mappingUsesSource(mapping, this.returnSource)).sort((a, b) => a.mappingName.localeCompare(b.mappingName) || a.mappingId - b.mappingId);
        this.sidebar.show(this.summaries, this.isCreate ? undefined : this.detail?.mappingId,
            this.adapterContext ? this.adapterId : undefined, undefined, this.returnQuery);
    }

    private loadAdapterMappings(adapterId: number) {
        return this.mappings.getSummaries([adapterId]).pipe(
            map(response => response.adapters.find(adapter => adapter.adapterId === adapterId))
        );
    }

    refreshSummaries() {
        this.summaryRequest?.unsubscribe();
        this.summariesLoading = true;
        this.summaryRequest = this.mappings.getMappings().subscribe({
            next: response => {
                this.validationMappings = response.mappings;
                this.setSummaries(this.adapterContext ? response.mappings.filter(mapping => mapping.adapterId === this.adapterId) : response.mappings);
                this.form?.get('mappingName').updateValueAndValidity({emitEvent: false});
                this.summariesLoading = false;
                this.summaryError = false;
            },
            error: () => {
                this.summariesLoading = false;
                this.summaryError = true;
            }
        });
    }

    get columns(): FormArray {
        return this.form?.get('columns') as FormArray;
    }

    get dirty(): boolean {
        return !!this.form && JSON.stringify(this.draft()) !== this.baseline;
    }

    get canSave(): boolean {
        return this.canEdit && (this.dirty || this.isCreate) && this.form.valid && !this.saving && !this.conflict
            && !this.summariesLoading && !this.summaryError && !Object.keys(this.saveError?.fieldErrors || {}).length;
    }

    get mappingTitle(): string {
        return (this.form?.get('mappingName').value || '').trim() || this.detail?.mappingName;
    }

    get canRename(): boolean {
        return this.canEdit && this.form.get('mappingName').valid && !this.saving && !this.conflict
            && !this.summariesLoading && !this.summaryError && !this.saveError?.fieldErrors?.mappingName;
    }

    startRename() {
        if (!this.canEdit || this.saving) {
            return;
        }
        this.nameBeforeRename = this.form.get('mappingName').value;
        this.nameEditing = true;
    }

    cancelRename() {
        if (!this.nameEditing || this.saving) {
            return;
        }
        this.form.get('mappingName').setValue(this.nameBeforeRename);
        this.nameEditing = false;
    }

    onRenameFocusOut(event: FocusEvent) {
        if (!(event.relatedTarget instanceof Node) || !this.mappingNameEditor?.nativeElement.contains(event.relatedTarget)) {
            this.finishRename();
        }
    }

    @HostListener('document:click', ['$event.target'])
    onRenameOutsideClick(target: EventTarget) {
        if (this.nameEditing && this.mappingNameEditor && target instanceof Node
            && !this.mappingNameEditor.nativeElement.contains(target)
            && !(target instanceof Element && target.closest('.rename-mapping'))) {
            this.finishRename();
        }
    }

    renameMapping() {
        if (!this.canRename) {
            return;
        }
        this.finishRename();
    }

    private finishRename() {
        if (!this.nameEditing || this.saving) {
            return;
        }
        const name = this.form.get('mappingName');
        if (name.valid && !this.saveError?.fieldErrors?.mappingName) {
            name.setValue(name.value.trim());
            this.nameEditing = false;
        } else {
            this.cancelRename();
        }
    }

    get showSaveError(): boolean {
        return !!this.saveError && (this.saveError.code !== 'VALIDATION_FAILED' || !Object.keys(this.saveError.fieldErrors || {}).length);
    }

    get includedCount(): number {
        return this.columns?.getRawValue().filter(column => column.included).length || 0;
    }

    setAllIncluded(included: boolean) {
        if (this.canEdit && !this.schemaLocked && !this.saving) {
            this.columns.controls.forEach(column => column.get('included').setValue(included));
        }
    }

    private isIncluded(detail: MappingDetail, columnId: number): boolean {
        return detail.columns.find(column => column.logicalColumnId === columnId).included;
    }

    ruleForColumn(columnId: number) {
        return this.detail.rules?.find(rule => rule.targetLogicalColumnId === columnId);
    }

    sourceTypeDisplay(typeDisplay: string): string {
        return typeDisplay?.replace(/\s+NOT NULL$/i, '') || '—';
    }

    ruleLabel(columnId: number): string {
        const rule = this.ruleForColumn(columnId);
        if (!rule) {
            return this.detail.rules ? 'No rule' : 'Rule unavailable';
        }
        return this.detail.availableRules?.find(option => option.type === rule.type)?.label || `Unsupported rule (${rule.type})`;
    }

    private mappingNameValidator(detail: MappingDetail) {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = (control.value || '').trim();
            if (!value || value.length > detail.validation.mappingNameMaxLength) {
                return {mappingName: true};
            }
            return this.validationMappings.some(mapping => mapping.mappingId !== detail.mappingId
                && mapping.mappingName.trim().toLowerCase() === value.toLowerCase()) ? {duplicateMappingName: true} : null;
        };
    }

    private identifierValidator(original: string, detail: MappingDetail) {
        const validation = detail.validation;
        const pattern = new RegExp(`^(?:${validation.identifierPattern})$`);
        return (control: AbstractControl): ValidationErrors | null => {
            const value = (control.value || '').trim();
            return value === original || (value && pattern.test(value) && value.length <= validation.identifierMaxLength)
                ? null : {identifier: true};
        };
    }

    private tableNameValidator(detail: MappingDetail) {
        return (control: AbstractControl): ValidationErrors | null => {
            const name = this.normalizeName(control.value || '', detail);
            const namespaceId = this.form?.get('targetNamespaceId')?.value ?? detail.namespaceId;
            return Array.from(this.catalog.entities().values()).some(entity => entity.namespaceId === namespaceId
                && ((this.isCreate && detail.fixedTargetEntityId == null) || entity.id !== detail.targetEntityId) && this.normalizeName(entity.name, detail) === name)
                ? {duplicateEntityName: true} : null;
        };
    }

    private columnNameValidator(detail: MappingDetail, columnId: number) {
        return (control: AbstractControl): ValidationErrors | null => {
            const name = this.normalizeName(control.value || '', detail);
            const rows = this.columns?.getRawValue() as MappingDraft['columns'];
            if (!rows || !control.parent || !this.columns.controls.includes(control.parent)) {
                return null;
            }
            if (control.parent.get('included').value && rows.some((row, i) => row.logicalColumnId !== columnId
                && (!this.fixedTarget || row.included) && this.normalizeName(row.included ? row.logicalName || '' : detail.columns[i].logicalName, detail) === name)) {
                return {duplicateColumnName: true};
            }
            return !this.isCreate && !this.fixedTarget && detail.columns.some(column => column.logicalColumnId !== columnId
                && this.normalizeName(column.logicalName, detail) === name) ? {existingColumnName: true} : null;
        };
    }

    private validateColumns() {
        this.columns.controls.forEach(column => {
            column.get('logicalName').updateValueAndValidity({onlySelf: true, emitEvent: false});
            column.updateValueAndValidity({onlySelf: true, emitEvent: false});
        });
        this.columns.updateValueAndValidity({emitEvent: false});

    }

    private targetCompatibilityErrors(control: FormArray): ValidationErrors | null {
        if (!this.fixedTarget || !this.isCreate) { return null; }
        const included = control.getRawValue().filter(column => column.included);
        const targets = this.detail.targetColumns || [];
        const matches = included.length === targets.length && targets.every(target => included.some(row => {
            const source = this.detail.columns.find(column => column.logicalColumnId === row.logicalColumnId);
            return this.normalizeName(row.logicalName, this.detail) === this.normalizeName(target.logicalName, this.detail)
                && source.typeDisplay === target.typeDisplay && source.nullable === target.nullable;
        }));
        return matches ? null : {incompatibleTarget: true};
    }

    targetColumn(i: number) {
        const name = this.columns.at(i).get('logicalName').value;
        return this.fixedTarget ? this.detail.targetColumns?.find(column => this.normalizeName(column.logicalName, this.detail) === this.normalizeName(name, this.detail)) : this.detail.columns[i];
    }

    private clearFieldError(field: string) {
        if (this.saveError?.fieldErrors?.[field]) {
            const fieldErrors = {...this.saveError.fieldErrors};
            delete fieldErrors[field];
            this.saveError = Object.keys(fieldErrors).length ? {...this.saveError, fieldErrors} : null;
        }
    }

    fieldError(control: AbstractControl, field: string): string | null {
        const serverError = this.saveError?.fieldErrors?.[field];
        if (serverError || !control.invalid) {
            return serverError || null;
        }
        if (control.hasError('duplicateMappingName')) {
            return 'A mapping with this name already exists.';
        }
        if (control.hasError('duplicateEntityName')) {
            return 'An entity with this name already exists in the namespace.';
        }
        if (field === 'targetNamespaceId') {
            return 'Choose an available relational namespace.';
        }
        if (control.hasError('duplicateColumnName')) {
            return 'Logical column names must be unique.';
        }
        if (control.hasError('existingColumnName')) {
            return 'This name belongs to another column. Simultaneous name swaps are not supported.';
        }
        return field === 'mappingName'
            ? this.detail.validation.mappingNameMessage
            : this.detail.validation.identifierMessage;
    }

    private acceptDetail(detail: MappingDetail) {
        this.fieldSubscriptions.unsubscribe();
        this.fieldSubscriptions = new Subscription();
        this.detail = detail;
        this.adapterId = detail.adapterId;
        this.adapterName = detail.adapterName;
        this.conflict = false;
        this.saveError = null;
        this.nameEditing = false;
        this.form = null;
        this.form = new FormGroup({
            mappingName: new FormControl(detail.mappingName, this.mappingNameValidator(detail)),
            targetNamespaceId: new FormControl(detail.namespaceId, control =>
                this.catalog.namespaces().get(control.value)?.dataModel === DataModel.RELATIONAL ? null : {namespace: true}),
            logicalTableName: new FormControl(detail.logicalTableName, [this.identifierValidator(detail.logicalTableName, detail), this.tableNameValidator(detail)]),
            columns: new FormArray(detail.columns.map(column => {
                const included = this.isIncluded(detail, column.logicalColumnId);
                return new FormGroup({
                    logicalColumnId: new FormControl(column.logicalColumnId),
                    included: new FormControl(included),
                    logicalName: new FormControl({value: column.logicalName, disabled: !included},
                        [this.identifierValidator(column.logicalName, detail), this.columnNameValidator(detail, column.logicalColumnId)])
                });
            }), control => {
                const rows = (control as FormArray).getRawValue() as MappingDraft['columns'];
                const errors = {...(rows.some(c => c.included) ? {} : {noIncludedFields: true}), ...this.targetCompatibilityErrors(control as FormArray)};
                return Object.keys(errors).length ? errors : null;
            })
        });
        for (const field of ['mappingName', 'logicalTableName']) {
            this.fieldSubscriptions.add(this.form.get(field).valueChanges.subscribe(() => this.clearFieldError(field)));
        }
        this.fieldSubscriptions.add(this.form.get('targetNamespaceId').valueChanges.subscribe(() => {
            this.clearFieldError('targetNamespaceId');
            this.clearFieldError('logicalTableName');
            this.form.get('logicalTableName').updateValueAndValidity({emitEvent: false});
            this.validateColumns();
        }));
        this.columns.controls.forEach(column => {
            const field = 'columns.' + column.get('logicalColumnId').value;
            this.fieldSubscriptions.add(column.get('logicalName').valueChanges.subscribe(() => {
                this.clearFieldError(field);
                this.clearFieldError('columns');
                this.validateColumns();
            }));
            this.fieldSubscriptions.add(column.get('included').valueChanges.subscribe(included => {
                if (included && this.canEdit && !this.schemaLocked) {
                    column.get('logicalName').enable({emitEvent: false});
                } else {
                    column.get('logicalName').disable({emitEvent: false});
                }
                this.clearFieldError(field);
                this.clearFieldError('columns');
                this.validateColumns();
            }));
        });
        this.validateColumns();
        if (this.fixedTarget) {
            this.form.get('targetNamespaceId').disable({emitEvent: false});
            this.form.get('logicalTableName').disable({emitEvent: false});
        }
        if (this.schemaLocked) { this.columns.disable({emitEvent: false}); }
        if (!this.canEdit) { this.form.disable(); }
        this.baseline = JSON.stringify(this.draft());
        this.setBreadcrumbs();
        this.setSummaries(this.summaries.map(m => m.mappingId === detail.mappingId ? detail : m));
    }

    private draft(): MappingDraft {
        const value = this.form.getRawValue();
        return {
            mappingName: value.mappingName.trim(),
            targetNamespaceId: value.targetNamespaceId,
            logicalTableName: value.logicalTableName.trim(),
            columns: value.columns.map((c, i) => ({logicalColumnId: c.logicalColumnId, included: c.included,
                logicalName: c.included ? c.logicalName.trim() : this.detail.columns[i].logicalName}))
        };
    }

    private normalizeName(name: string, detail: MappingDetail): string {
        const caseSensitive = detail === this.detail ? this.targetNamespace?.caseSensitive ?? detail.namespaceCaseSensitive : detail.namespaceCaseSensitive;
        return caseSensitive ? name.trim() : name.trim().toLowerCase();
    }

    save() {
        if (!this.canSave) {
            return;
        }
        const request: MappingUpdate = {
            ...this.draft(), adapterId: this.adapterId, mappingId: this.detail.mappingId, expectedRevision: this.detail.revision
        };
        this.persist(request);
    }

    private persist(request: MappingUpdate, onSaved: (detail: MappingDetail) => void = detail => this.saved(detail)) {
        this.saving = true;
        this.saveError = null;
        const {mappingId, ...draft} = request;
        const save = this.isCreate ? this.mappings.create({...draft, targetEntityId: this.draftSourceEntityId ?? this.detail.targetEntityId,
            ...(this.existingTargetEntityId == null ? {} : {existingTargetEntityId: this.existingTargetEntityId}),
            ...(this.draftSourceAllocationId == null ? {} : {sourceAllocationId: this.draftSourceAllocationId})}) : this.mappings.update(request);
        this.subscriptions.add(save.subscribe({
            next: onSaved,
            error: error => {
                if (error.status === 0 || error.status >= 500) {
                    this.reconcile(request, onSaved);
                } else {
                    this.saving = false;
                    this.saveError = MappingService.error(error);
                    this.conflict = error.status === 409;
                    if (this.saveError.fieldErrors?.mappingName) {
                        this.nameBeforeRename = this.detail.mappingName;
                        this.nameEditing = true;
                    }
                }
            }
        }));
    }

    private saved(detail: MappingDetail) {
        const created = this.isCreate;
        this.saving = false;
        this.acceptDetail(detail);
        this.toast.success(created ? 'Mapping created.' : 'Mapping saved.');
        if (this.returnTargetEntityId != null) {
            this.subscriptions.add(this.catalog.getSnapshot().subscribe({
                next: () => this.returnToTable(), error: () => this.refreshError = true
            }));
            return;
        }
        if (this.returnSource) {
            this.subscriptions.add(this.catalog.getSnapshot().subscribe({
                next: () => this.returnToSource(), error: () => this.refreshError = true
            }));
            return;
        }
        this.refreshCatalog();
        if (created) {
            const route = this.adapterContext
                ? ['/views/adapters', this.adapterId, 'mappings', detail.mappingId]
                : ['/views/mappings', detail.mappingId, 'edit'];
            this.router.navigate(route, {replaceUrl: true});
        }
    }

    private reconcile(request: MappingUpdate, onSaved: (detail: MappingDetail) => void) {
        const saved = this.isCreate
            ? this.mappings.getMappings().pipe(
                map(response => response.mappings.find(mapping => mapping.mappingName === request.mappingName && mapping.adapterId === request.adapterId)),
                switchMap(mapping => mapping ? this.mappings.getMapping(mapping.mappingId) : of(null)))
            : this.mappings.getMapping(request.mappingId);
        this.subscriptions.add(saved.subscribe({
            next: detail => {
                const matches = detail && detail.mappingName === request.mappingName
                    && detail.namespaceId === request.targetNamespaceId
                    && this.normalizeName(detail.logicalTableName, detail) === this.normalizeName(request.logicalTableName, detail)
                    && (this.isCreate ? this.createdColumnsMatch(detail, request) : detail.columns.length === request.columns.length
                    && detail.columns.every(c => {
                        const requested = request.columns.find(r => r.logicalColumnId === c.logicalColumnId);
                        return requested && this.isIncluded(detail, c.logicalColumnId) === requested.included
                            && this.normalizeName(c.logicalName, detail) === this.normalizeName(requested.logicalName, detail);
                    }));
                if (matches) {
                    onSaved(detail);
                } else {
                    this.saving = false;
                    this.conflict = !detail || detail.revision !== request.expectedRevision;
                    this.saveError = {code: 'SAVE_UNCONFIRMED', message: 'The save was not confirmed. Your draft is preserved. Review the saved version before trying again.'};
                }
            },
            error: () => {
                this.saving = false;
                this.conflict = true;
                this.saveError = {code: 'SAVE_UNCONFIRMED', message: 'Cannot confirm whether the save completed. Reload the saved version when the connection is available.'};
            }
        }));
    }

    private createdColumnsMatch(detail: MappingDetail, request: MappingUpdate): boolean {
        const included = request.columns.filter(column => column.included);
        const actual = detail.columns.filter(column => this.isIncluded(detail, column.logicalColumnId));
        return (this.existingTargetEntityId == null || detail.targetEntityId === this.existingTargetEntityId)
            && actual.length === included.length && actual.every(column => included.some(row => {
                const source = this.detail.columns.find(field => field.logicalColumnId === row.logicalColumnId);
                return this.normalizeName(column.logicalName, detail) === this.normalizeName(row.logicalName, detail)
                    && column.typeDisplay === source.typeDisplay && column.nullable === source.nullable
                    && source.physicalReferences.every(reference => column.physicalReferences.some(saved => saved.physicalName === reference.physicalName));
            }));
    }

    returnToTable() {
        const entity = this.catalog.entities().get(this.returnTargetEntityId);
        const namespace = entity && this.catalog.namespaces().get(entity.namespaceId);
        if (entity && namespace) {
            this.router.navigate(['/views/schema-editing', namespace.name + '.' + entity.name, 'mappings']);
        } else {
            this.router.navigate(['/views/schema-editing']);
        }
    }

    private returnToSource() {
        this.router.navigate(['/views/mappings/source', this.returnSource.adapterId], {
            queryParams: {sourceNamespace: this.returnSource.namespaceName, sourceTable: this.returnSource.physicalName}
        });
    }

    refreshCatalog() {
        this.refreshError = false;
        this.subscriptions.add(this.catalog.getSnapshot().subscribe({error: () => this.refreshError = true}));
    }

    cancel() {
        if (this.saving) {
            return;
        }
        if (this.returnTargetEntityId != null) {
            this.returnToTable();
        } else if (this.returnSource) {
            this.returnToSource();
        } else {
            this.router.navigate(this.adapterMappingsLink ?? ['/views/mappings']);
        }
    }

    async reloadSaved() {
        if (await this.canDeactivate()) {
            this.reload.next();
        }
    }

    canDeactivate(): boolean | Promise<boolean> {
        return this.saving ? false : !this.dirty || this.confirmDiscard();
    }

    private confirmDiscard(): Promise<boolean> {
        if (!this.confirmation) {
            this.confirmVisible = true;
            this.confirmation = new Promise(resolve => this.resolveConfirmation = resolve);
        }
        return this.confirmation;
    }

    answerConfirmation(discard: boolean) {
        this.confirmVisible = false;
        this.resolveConfirmation?.(discard);
        this.resolveConfirmation = null;
        this.confirmation = null;
    }

    @HostListener('window:beforeunload', ['$event'])
    beforeUnload(event: BeforeUnloadEvent) {
        if (this.dirty || this.saving) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    ngOnDestroy() {
        this.answerConfirmation(false);
        this.subscriptions.unsubscribe();
        this.fieldSubscriptions.unsubscribe();
        this.summaryRequest?.unsubscribe();
        this.sidebar.close();
        this.breadcrumbs.hide();
    }
}

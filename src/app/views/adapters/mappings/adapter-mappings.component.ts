import {Component, effect, HostListener, inject, OnDestroy, OnInit} from '@angular/core';
import {AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, of, Subject, Subscription} from 'rxjs';
import {catchError, startWith, switchMap} from 'rxjs/operators';
import {MappingService} from '../../../services/mapping.service';
import {CatalogService} from '../../../services/catalog.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {MappingDetail, MappingDraft, MappingError, MappingSummary, MappingUpdate, MappingKind} from './mapping.model';

@Component({
    selector: 'app-adapter-mappings',
    templateUrl: './adapter-mappings.component.html',
    styleUrls: ['./adapter-mappings.component.scss']
})
export class AdapterMappingsComponent implements OnInit, OnDestroy {
    private readonly mappings = inject(MappingService);
    private readonly catalog = inject(CatalogService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly toast = inject(ToasterService);
    private readonly breadcrumbs = inject(BreadcrumbService);
    private readonly sidebar = inject(LeftSidebarService);
    private readonly subscriptions = new Subscription();
    private readonly reload = new Subject<void>();
    private summaryRequest: Subscription;
    private confirmation: Promise<boolean>;
    private resolveConfirmation: (discard: boolean) => void;
    private baseline: string;
    private fieldSubscriptions = new Subscription();

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

    constructor() {
        effect(() => {
            if (this.catalog.listener() && this.adapterId != null && !this.loading && !this.saving) {
                this.refreshSummaries();
            }
        });
    }

    ngOnInit() {
        this.sidebar.setTopButtons([]);
        this.sidebar.setNodes([]);
        this.sidebar.open();
        this.subscriptions.add(combineLatest([this.route.paramMap, this.reload.pipe(startWith(undefined))]).pipe(
            switchMap(([params]) => {
                this.summaryRequest?.unsubscribe();
                this.loading = true;
                this.loadError = null;
                this.summaryError = false;
                this.refreshError = false;
                this.detail = null;
                this.form = null;
                this.summaries = [];
                this.adapterId = this.parseId(params.get('adapterId'));
                const mappingId = params.has('mappingId') ? this.parseId(params.get('mappingId')) : null;
                if (this.adapterId == null || (params.has('mappingId') && mappingId == null)) {
                    this.loadError = 'The adapter or mapping ID is invalid.';
                    return of(null);
                }
                return this.mappings.getSummaries([this.adapterId]).pipe(
                    switchMap(response => {
                        const adapter = response.adapters.find(a => a.adapterId === this.adapterId);
                        if (!adapter) {
                            this.loadError = 'This source adapter is no longer available.';
                            return of(null);
                        }
                        this.adapterName = adapter.adapterName;
                        this.setSummaries(adapter.mappings);
                        this.setBreadcrumbs();
                        if (mappingId == null) {
                            if (this.summaries.length) {
                                this.router.navigate(['/views/adapters', this.adapterId, 'mappings', this.summaries[0].mappingId], {replaceUrl: true});
                            }
                            return of(null);
                        }
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
            new BreadcrumbItem('Adapters', '/views/adapters'),
            new BreadcrumbItem('Edit Mappings')
        ]);
    }

    private setSummaries(summaries: MappingSummary[]) {
        this.summaries = [...summaries].sort((a, b) => a.mappingName.localeCompare(b.mappingName) || a.mappingId - b.mappingId);
        const group = new SidebarNode('adapter-mappings', this.adapterName, 'fa fa-database').disableRouting();
        group.setChildren(this.summaries.map(mapping => {
            const duplicateName = this.summaries.some(other => other.mappingId !== mapping.mappingId && other.mappingName === mapping.mappingName);
            const label = duplicateName ? mapping.mappingName + ' (' + mapping.logicalTableName + ')' : mapping.mappingName;
            const node = new SidebarNode('adapter-mapping-' + mapping.mappingId, label, 'fa fa-exchange',
                '/views/adapters/' + this.adapterId + '/mappings/' + mapping.mappingId).setAutoExpand(false);
            node.cssClass = mapping.mappingId === this.detail?.mappingId ? 'mapping-selected' : '';
            return node;
        }));
        this.sidebar.setNodes([group]);
        this.sidebar.selectedNodeId = this.detail ? 'adapter-mapping-' + this.detail.mappingId : null;
    }

    refreshSummaries() {
        this.summaryRequest?.unsubscribe();
        const adapterId = this.adapterId;
        this.summaryRequest = this.mappings.getSummaries([adapterId]).subscribe({
            next: response => {
                if (this.adapterId === adapterId) {
                    this.setSummaries(response.adapters.find(a => a.adapterId === adapterId)?.mappings || []);
                    this.summaryError = false;
                }
            },
            error: () => this.summaryError = true
        });
    }

    get columns(): FormArray {
        return this.form?.get('columns') as FormArray;
    }

    get dirty(): boolean {
        return !!this.form && JSON.stringify(this.draft()) !== this.baseline;
    }

    get canSave(): boolean {
        return !!this.detail?.editable && this.dirty && this.form.valid && !this.saving && !this.conflict;
    }

    get includedCount(): number {
        return this.columns?.getRawValue().filter(column => column.included).length || 0;
    }

    setAllIncluded(included: boolean) {
        if (this.detail.editable && !this.saving) {
            this.columns.controls.forEach(column => column.get('included').setValue(included));
        }
    }

    private isIncluded(detail: MappingDetail, columnId: number): boolean {
        return detail.columns.find(column => column.logicalColumnId === columnId)?.included
            ?? !!detail.rules?.some(rule => rule.targetLogicalColumnId === columnId);
    }

    relationshipLabel(kind: MappingKind): string {
        switch (kind) {
            case 'PHYSICAL_TO_LOGICAL': return 'Source → Logical';
            case 'LOGICAL_TO_LOGICAL': return 'Logical → Logical';
            case 'LOGICAL_TO_EXPOSED': return 'Logical → Exposed';
            default: return kind || 'Unavailable';
        }
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
            return value && (!detail.validation || value.length <= detail.validation.mappingNameMaxLength) ? null : {mappingName: true};
        };
    }

    private identifierValidator(original: string, detail: MappingDetail) {
        const validation = detail.validation;
        const pattern = validation && new RegExp(`^(?:${validation.identifierPattern})$`);
        return (control: AbstractControl): ValidationErrors | null => {
            const value = (control.value || '').trim();
            return value === original || (value && (!validation || (pattern.test(value) && value.length <= validation.identifierMaxLength)))
                ? null : {identifier: true};
        };
    }

    private acceptDetail(detail: MappingDetail) {
        this.fieldSubscriptions.unsubscribe();
        this.fieldSubscriptions = new Subscription();
        this.detail = detail;
        this.adapterName = detail.adapterName;
        this.conflict = false;
        this.saveError = null;
        this.form = new FormGroup({
            mappingName: new FormControl(detail.mappingName, this.mappingNameValidator(detail)),
            logicalTableName: new FormControl(detail.logicalTableName, this.identifierValidator(detail.logicalTableName, detail)),
            columns: new FormArray(detail.columns.map(column => new FormGroup({
                logicalColumnId: new FormControl(column.logicalColumnId),
                included: new FormControl(this.isIncluded(detail, column.logicalColumnId)),
                logicalName: new FormControl({value: column.logicalName, disabled: !this.isIncluded(detail, column.logicalColumnId)}, this.identifierValidator(column.logicalName, detail))
            })), control => {
                const rows = (control as FormArray).getRawValue() as MappingDraft['columns'];
                const names = rows.map((c, i) => this.normalizeName(c.included ? c.logicalName : detail.columns[i].logicalName, detail));
                const errors = {...(new Set(names).size === names.length ? {} : {duplicateNames: true}),
                    ...(rows.some(c => c.included) ? {} : {noIncludedFields: true})};
                return Object.keys(errors).length ? errors : null;
            })
        });
        this.columns.controls.forEach(column => this.fieldSubscriptions.add(column.get('included').valueChanges.subscribe(included => {
            if (included && detail.editable) {
                column.get('logicalName').enable({emitEvent: false});
            } else {
                column.get('logicalName').disable({emitEvent: false});
            }
        })));
        if (!detail.editable) {
            this.form.disable();
        }
        this.baseline = JSON.stringify(this.draft());
        this.setBreadcrumbs();
        this.setSummaries(this.summaries.map(m => m.mappingId === detail.mappingId ? detail : m));
    }

    private draft(): MappingDraft {
        const value = this.form.getRawValue();
        return {
            mappingName: value.mappingName.trim(),
            logicalTableName: value.logicalTableName.trim(),
            columns: value.columns.map((c, i) => ({logicalColumnId: c.logicalColumnId, included: c.included,
                logicalName: c.included ? c.logicalName.trim() : this.detail.columns[i].logicalName}))
        };
    }

    private normalizeName(name: string, detail: MappingDetail): string {
        return detail.namespaceCaseSensitive ? name.trim() : name.trim().toLowerCase();
    }

    save() {
        if (!this.canSave) {
            return;
        }
        const request: MappingUpdate = {
            ...this.draft(), adapterId: this.adapterId, mappingId: this.detail.mappingId, expectedRevision: this.detail.revision
        };
        this.saving = true;
        this.saveError = null;
        this.subscriptions.add(this.mappings.update(request).subscribe({
            next: detail => this.saved(detail),
            error: error => {
                if (error.status === 0 || error.status >= 500) {
                    this.reconcile(request);
                } else {
                    this.saving = false;
                    this.saveError = MappingService.error(error);
                    this.conflict = error.status === 409;
                }
            }
        }));
    }

    private saved(detail: MappingDetail) {
        this.saving = false;
        this.acceptDetail(detail);
        this.toast.success('Mapping saved.');
        this.refreshCatalog();
    }

    private reconcile(request: MappingUpdate) {
        this.subscriptions.add(this.mappings.getDetail(request.adapterId, request.mappingId).subscribe({
            next: detail => {
                const matches = detail.mappingName === request.mappingName
                    && this.normalizeName(detail.logicalTableName, detail) === this.normalizeName(request.logicalTableName, detail)
                    && detail.columns.length === request.columns.length
                    && detail.columns.every(c => {
                        const requested = request.columns.find(r => r.logicalColumnId === c.logicalColumnId);
                        return requested && this.isIncluded(detail, c.logicalColumnId) === requested.included
                            && this.normalizeName(c.logicalName, detail) === this.normalizeName(requested.logicalName, detail);
                    });
                if (matches) {
                    this.saved(detail);
                } else {
                    this.saving = false;
                    this.conflict = detail.revision !== request.expectedRevision;
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

    refreshCatalog() {
        this.refreshError = false;
        this.subscriptions.add(this.catalog.getSnapshot().subscribe({error: () => this.refreshError = true}));
    }

    async discard() {
        if (!this.saving && (!this.dirty || await this.confirmDiscard())) {
            this.acceptDetail(this.detail);
        }
    }

    async reloadSaved() {
        if (!this.saving && (!this.dirty || await this.confirmDiscard())) {
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
        this.breadcrumbs.hide();
        this.sidebar.close();
    }
}

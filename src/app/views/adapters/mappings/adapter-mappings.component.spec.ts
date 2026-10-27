import {NO_ERRORS_SCHEMA, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {FormModule, TableModule} from '@coreui/angular';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {of, throwError} from 'rxjs';
import {AdapterMappingsComponent} from './adapter-mappings.component';
import {MappingDetail} from './mapping.model';
import {MappingService} from '../../../services/mapping.service';
import {CatalogService} from '../../../services/catalog.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DataModel} from '../../../models/ui-request.model';

describe('AdapterMappingsComponent', () => {
    let fixture: ComponentFixture<AdapterMappingsComponent>;
    let component: AdapterMappingsComponent;
    let mappings: jasmine.SpyObj<MappingService>;
    let catalog: any;
    let toast: jasmine.SpyObj<ToasterService>;
    let detail: MappingDetail;

    beforeEach(async () => {
        detail = {
            adapterId: 7, adapterName: 'csv_source', mappingId: 31, mappingName: 'Import', targetEntityId: 50,
            kind: 'PHYSICAL_TO_LOGICAL', sourceModel: DataModel.RELATIONAL, targetModel: DataModel.RELATIONAL,
            availableRules: [{type: 'DIRECT_COLUMN', label: 'Copy source value'}],
            rules: [{type: 'DIRECT_COLUMN', targetLogicalColumnId: 101}, {type: 'DIRECT_COLUMN', targetLogicalColumnId: 102}],
            validation: {
                mappingNameMaxLength: 255, identifierMaxLength: 100, identifierPattern: '[a-zA-Z_][a-zA-Z0-9_]*',
                mappingNameMessage: 'Enter a mapping name of 1–255 characters.', identifierMessage: 'Enter a valid identifier of up to 100 characters.'
            },
            namespaceId: 1, namespaceName: 'public', namespaceCaseSensitive: false, logicalTableName: 'customers',
            revision: 'original', editable: true,
            physicalSources: [{allocationId: 60, physicalEntityId: 70, namespaceName: 'files', physicalName: 'customers.csv'}], columns: [
                {logicalColumnId: 101, logicalName: 'id', logicalPosition: 1, typeDisplay: 'BIGINT', nullable: false, physicalReferences: []},
                {logicalColumnId: 102, logicalName: 'name', logicalPosition: 2, typeDisplay: 'VARCHAR', nullable: true, physicalReferences: []}
            ]
        };
        mappings = jasmine.createSpyObj('MappingService', ['getSummaries', 'getDetail', 'update']);
        mappings.getSummaries.and.returnValue(of({adapters: [{adapterId: 7, adapterName: 'csv_source', mappings: [detail]}]}));
        mappings.getDetail.and.returnValue(of(detail));
        catalog = {listener: signal(null), getSnapshot: jasmine.createSpy('getSnapshot').and.returnValue(of(null))};
        toast = jasmine.createSpyObj('ToasterService', ['success']);
        await TestBed.configureTestingModule({
            declarations: [AdapterMappingsComponent],
            imports: [CommonModule, FormsModule, ReactiveFormsModule, FormModule, TableModule, RouterTestingModule],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                {provide: MappingService, useValue: mappings}, {provide: CatalogService, useValue: catalog},
                {provide: ToasterService, useValue: toast},
                {provide: ActivatedRoute, useValue: {paramMap: of(convertToParamMap({adapterId: '7', mappingId: '31'}))}},
                {provide: BreadcrumbService, useValue: {setBreadcrumbs: () => {}, hide: () => {}}},
                {provide: LeftSidebarService, useValue: {close: () => {}, open: () => {}, setNodes: jasmine.createSpy('setNodes'), setTopButtons: () => {}}}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AdapterMappingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('loads the saved definition and compares values rather than form touch state', () => {
        expect(mappings.getDetail).toHaveBeenCalledWith(7, 31);
        expect(component.dirty).toBeFalse();
        component.form.get('mappingName').setValue('Changed');
        expect(component.canSave).toBeTrue();
        component.form.get('mappingName').setValue('Import');
        expect(component.dirty).toBeFalse();
    });

    it('renders relationship and data models from both summary and detail responses', async () => {
        detail.kind = 'LOGICAL_TO_LOGICAL';
        detail.sourceModel = DataModel.DOCUMENT;
        detail.targetModel = DataModel.GRAPH;
        await component.reloadSaved();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('#source-model').textContent).toBe('Document');
        expect(root.querySelector('#target-model').textContent).toBe('Graph');
        const sidebar = TestBed.inject(LeftSidebarService);
        expect(sidebar.setNodes).toHaveBeenCalled();
        expect(component.relationshipLabel(detail.kind)).toBe('Logical → Logical');
    });

    it('uses saved rule identities for inclusion and rule labels', async () => {
        detail.rules = [{type: 'TRANSFORM', targetLogicalColumnId: 102}];
        detail.editable = false;
        await component.reloadSaved();
        fixture.detectChanges();
        const rows = fixture.nativeElement.querySelectorAll('.rules-table tbody tr');
        expect(rows[0].querySelector('input[type="checkbox"]').checked).toBeFalse();
        expect(rows[0].querySelector('.rule-label').textContent).toBe('No rule');
        expect(rows[1].querySelector('input[type="checkbox"]').checked).toBeTrue();
        expect(rows[1].querySelector('.rule-label').textContent).toBe('Unsupported rule (TRANSFORM)');
    });

    it('renders physical source metadata, collection types and separate nullable checkboxes', () => {
        detail.physicalSources = [{allocationId: 60, physicalEntityId: 70, namespaceName: 'files', physicalName: 'customers.csv'}];
        detail.columns[0].typeDisplay = 'INTEGER ARRAY(8,2)';
        detail.columns[0].physicalReferences = [{allocationId: 60, physicalEntityId: 70, physicalColumnId: 101,
            physicalName: 'source_scores', physicalPosition: 4, typeDisplay: 'SMALLINT ARRAY(8,2) NOT NULL', nullable: false}];
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('#source-namespace-0').textContent).toContain('files');
        expect(root.querySelector('#source-table-0').textContent).toContain('customers.csv');
        const source = root.querySelector('.rules-table tbody');
        expect(source.querySelector('.source-name').textContent).toContain('source_scores');
        expect(source.querySelector('.source-cell.type-cell').textContent.trim()).toBe('SMALLINT ARRAY(8,2)');
        expect(source.querySelector<HTMLInputElement>('.source-cell input').checked).toBeFalse();
        expect(source.querySelector<HTMLInputElement>('.source-cell input').disabled).toBeTrue();
        expect(source.querySelector('.target-type').textContent).toContain('INTEGER ARRAY(8,2)');
        expect(source.querySelector<HTMLInputElement>('[aria-label="Nullable id"]').checked).toBeFalse();
    });

    it('uses backend validation limits, pattern and guidance, preserving existing imported identifiers', async () => {
        detail.validation = {
            mappingNameMaxLength: 8, identifierMaxLength: 6, identifierPattern: '[a-z][a-z0-9-]*',
            mappingNameMessage: 'Server name guidance', identifierMessage: 'Server identifier guidance'
        };
        await component.reloadSaved();
        expect(component.form.get('logicalTableName').valid).toBeTrue();
        component.form.get('mappingName').setValue(' 12345678 ');
        expect(component.form.get('mappingName').valid).toBeTrue();
        component.form.get('mappingName').setValue('123456789');
        expect(component.canSave).toBeFalse();
        component.form.get('logicalTableName').setValue('a-b');
        expect(component.form.get('logicalTableName').valid).toBeTrue();
        component.form.get('logicalTableName').setValue('a_b');
        expect(component.form.get('logicalTableName').invalid).toBeTrue();
        component.columns.at(0).get('logicalName').setValue('abcdefg');
        expect(component.columns.at(0).invalid).toBeTrue();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#mapping-name-error').textContent).toContain('Server name guidance');
        expect(fixture.nativeElement.querySelector('#table-name-error').textContent).toContain('Server identifier guidance');
        expect(fixture.nativeElement.querySelector('#column-error-101').textContent).toContain('Server identifier guidance');
    });

    it('rejects duplicate column names using namespace case rules', () => {
        component.columns.at(1).get('logicalName').setValue('ID');
        expect(component.columns.hasError('duplicateNames')).toBeTrue();
        expect(component.canSave).toBeFalse();
    });

    it('saves all column IDs together, adopts canonical names and refreshes the catalog', () => {
        component.form.get('mappingName').setValue('Customers');
        const saved = {...detail, mappingName: 'Customers', revision: 'saved'};
        mappings.update.and.returnValue(of(saved));
        component.save();
        expect(mappings.update.calls.mostRecent().args[0]).toEqual({
            adapterId: 7, mappingId: 31, expectedRevision: 'original', mappingName: 'Customers', logicalTableName: 'customers',
            columns: [{logicalColumnId: 101, logicalName: 'id', included: true}, {logicalColumnId: 102, logicalName: 'name', included: true}]
        });
        expect(component.dirty).toBeFalse();
        expect(component.detail.revision).toBe('saved');
        expect(catalog.getSnapshot).toHaveBeenCalled();
    });

    it('preserves draft values when another editor changed the mapping', () => {
        component.form.get('mappingName').setValue('My draft');
        mappings.update.and.returnValue(throwError(() => ({status: 409, error: {code: 'REVISION_CONFLICT', message: 'Reload'}})));
        component.save();
        expect(component.form.get('mappingName').value).toBe('My draft');
        expect(component.dirty).toBeTrue();
        expect(component.canSave).toBeFalse();
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('keeps confirmed saves separate from a catalog refresh failure', () => {
        component.form.get('mappingName').setValue('Saved');
        mappings.update.and.returnValue(of({...detail, mappingName: 'Saved'}));
        catalog.getSnapshot.and.returnValue(throwError(() => new Error('offline')));
        component.save();
        expect(component.refreshError).toBeTrue();
        expect(component.dirty).toBeFalse();
        expect(component.saveError).toBeNull();
    });

    it('reconciles a lost save response without automatically retrying the mutation', () => {
        component.form.get('mappingName').setValue('Saved');
        mappings.update.and.returnValue(throwError(() => ({status: 0})));
        mappings.getDetail.and.returnValue(of({...detail, mappingName: 'Saved', revision: 'saved'}));
        component.save();
        expect(mappings.update).toHaveBeenCalledTimes(1);
        expect(component.detail.revision).toBe('saved');
        expect(component.dirty).toBeFalse();
    });

    it('asks before navigation and preserves changes when the user keeps editing', async () => {
        component.form.get('mappingName').setValue('Draft');
        const leaving = component.canDeactivate();
        expect(component.confirmVisible).toBeTrue();
        component.answerConfirmation(false);
        expect(await leaving).toBeFalse();
        expect(component.dirty).toBeTrue();
        const discarding = component.canDeactivate();
        component.answerConfirmation(true);
        expect(await discarding).toBeTrue();
    });

    it('never sends updates for a read-only mapping', () => {
        component.detail.editable = false;
        component.form.get('mappingName').setValue('Changed');
        component.save();
        expect(mappings.update).not.toHaveBeenCalled();
    });

    it('saves selection while retaining excluded rows and disables their target editors', async () => {
        const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.rules-table tbody input[type="checkbox"]');
        checkbox.click();
        fixture.detectChanges();
        expect(component.includedCount).toBe(1);
        expect(component.canSave).toBeTrue();
        expect(component.columns.at(0).get('logicalName').disabled).toBeTrue();
        expect(fixture.nativeElement.querySelectorAll('.rules-table tbody tr').length).toBe(2);
        expect(fixture.nativeElement.querySelector('[aria-label="Include all fields"]').indeterminate).toBeTrue();
        const saved = {...detail, revision: 'selected', rules: [detail.rules[1]],
            columns: detail.columns.map((column, index) => ({...column, included: index === 1}))};
        mappings.update.and.returnValue(of(saved));
        component.save();
        expect(mappings.update.calls.mostRecent().args[0].columns).toEqual([
            {logicalColumnId: 101, logicalName: 'id', included: false},
            {logicalColumnId: 102, logicalName: 'name', included: true}
        ]);
        expect(component.dirty).toBeFalse();
        mappings.getDetail.and.returnValue(of(saved));
        await component.reloadSaved();
        expect(component.columns.at(0).get('included').value).toBeFalse();
        component.columns.at(0).get('included').setValue(true);
        expect(component.columns.at(0).get('logicalName').enabled).toBeTrue();
        expect(component.columns.at(0).get('logicalName').value).toBe('id');
        expect(component.canSave).toBeTrue();
    });

    it('requires at least one field and restores selection on discard', async () => {
        component.setAllIncluded(false);
        fixture.detectChanges();
        expect(component.includedCount).toBe(0);
        expect(component.columns.hasError('noIncludedFields')).toBeTrue();
        expect(component.canSave).toBeFalse();
        expect(fixture.nativeElement.textContent).toContain('Include at least one field');
        const discarding = component.discard();
        component.answerConfirmation(true);
        await discarding;
        expect(component.includedCount).toBe(2);
        expect(component.dirty).toBeFalse();
        expect(component.columns.at(0).get('logicalName').enabled).toBeTrue();
    });

    it('does not validate or save draft names for excluded fields', () => {
        component.columns.at(0).get('logicalName').setValue('invalid name');
        expect(component.form.invalid).toBeTrue();
        component.columns.at(0).get('included').setValue(false);
        expect(component.form.valid).toBeTrue();
        mappings.update.and.returnValue(of({...detail, rules: [detail.rules[1]]}));
        component.save();
        expect(mappings.update.calls.mostRecent().args[0].columns[0]).toEqual({
            logicalColumnId: 101, logicalName: 'id', included: false
        });
    });

    it('does not confirm a lost response when names match but inclusion does not', () => {
        component.columns.at(0).get('included').setValue(false);
        mappings.update.and.returnValue(throwError(() => ({status: 0})));
        mappings.getDetail.and.returnValue(of(detail));
        component.save();
        expect(component.saveError.code).toBe('SAVE_UNCONFIRMED');
        expect(component.dirty).toBeTrue();
        expect(component.columns.at(0).get('included').value).toBeFalse();
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('uses backend rule options and keeps type and nullability separate without redundant tabs', async () => {
        detail.availableRules[0].label = 'Server copy label';
        fixture.detectChanges();
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        const rule = root.querySelector<HTMLSelectElement>('[aria-label="Rule for id"]');
        expect(rule.disabled).toBeFalse();
        expect(rule.value).toBe('DIRECT_COLUMN');
        expect(rule.textContent).toContain('Server copy label');
        expect(root.querySelector('[role="tablist"]')).toBeNull();
        expect(root.querySelectorAll('.rules-table').length).toBe(1);
        expect(Array.from(root.querySelectorAll('.rules-group-headings th'), header => header.textContent.trim())).toEqual(['Source Fields', 'Target Fields']);
        expect(root.querySelector<HTMLTableCellElement>('th.include-column').rowSpan).toBe(1);
        expect(Array.from(root.querySelectorAll('[scope="colgroup"]'), header => (header as HTMLTableCellElement).colSpan)).toEqual([5, 3]);
        expect(Array.from(root.querySelectorAll('.rules-table thead tr:nth-child(2) th'), header => header.textContent.trim())).toEqual([
            'Inc.', 'Name', 'Type', 'Nullable', 'Rule', 'Name', 'Type', 'Nullable'
        ]);
        expect(root.textContent).not.toContain('Choose the fields to include and edit their target names.');
        expect(root.textContent).not.toContain('Type conversion and nullable editing are not available yet.');
        expect(root.textContent).not.toContain('Saving updates the fields and names available in queries.');
        expect(root.querySelector<HTMLInputElement>('[aria-label="Nullable id"]').checked).toBeFalse();
        expect(root.querySelector<HTMLInputElement>('[aria-label="Nullable name"]').checked).toBeTrue();
        expect(root.querySelector<HTMLInputElement>('[aria-label="Nullable name"]').disabled).toBeTrue();
    });

    it('spans each target over its physical sources when validation wraps', () => {
        detail.columns[0].physicalReferences = [60, 61].map(allocationId => ({
            allocationId, physicalEntityId: 70, physicalColumnId: 101, physicalName: 'source_scores_' + allocationId,
            physicalPosition: 4, typeDisplay: 'SMALLINT ARRAY(8,2) NOT NULL', nullable: false
        }));
        component.columns.at(0).get('logicalName').setValue('invalid name');
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;
        const groups = root.querySelectorAll('.rules-table tbody');
        expect(groups[0].querySelectorAll('tr').length).toBe(2);
        expect(groups[0].querySelectorAll('.target-name').length).toBe(1);
        expect(groups[0].querySelector<HTMLTableCellElement>('.target-name').rowSpan).toBe(2);
        expect(groups[0].querySelector('.text-danger')).not.toBeNull();
        const assertAlignment = () => {
            groups.forEach(group => {
                const sourceBounds = group.getBoundingClientRect();
                const targetBounds = group.querySelector('.target-name').getBoundingClientRect();
                expect(sourceBounds.height).toBeGreaterThan(0);
                expect(Math.abs(sourceBounds.top - targetBounds.top)).toBeLessThan(1);
                expect(Math.abs(sourceBounds.bottom - targetBounds.bottom)).toBeLessThan(1);
            });
        };
        root.style.width = '1200px';
        assertAlignment();
        root.style.width = '600px';
        assertAlignment();
        expect(root.querySelector('.table-responsive').scrollWidth).toBeGreaterThan(root.querySelector('.table-responsive').clientWidth);
        const sourceInputs = root.querySelectorAll<HTMLInputElement>('.source-cell input');
        expect(Array.from(sourceInputs).every(input => input.disabled)).toBeTrue();
    });
});

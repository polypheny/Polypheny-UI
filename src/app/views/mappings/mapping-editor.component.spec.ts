import {NO_ERRORS_SCHEMA, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {FormModule, TableModule} from '@coreui/angular';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject, of, Subject, throwError} from 'rxjs';
import {MappingEditorComponent} from './mapping-editor.component';
import {MappingDetail} from './mapping.model';
import {MappingService} from '../../services/mapping.service';
import {CatalogService} from '../../services/catalog.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {DataModel} from '../../models/ui-request.model';

describe('MappingEditorComponent', () => {
    let sidebar: jasmine.SpyObj<LeftSidebarService>;
    let fixture: ComponentFixture<MappingEditorComponent>;
    let component: MappingEditorComponent;
    let mappings: jasmine.SpyObj<MappingService>;
    let catalog: any;
    let toast: jasmine.SpyObj<ToasterService>;
    let detail: MappingDetail;
    let route: any;

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
            revision: 'original', editable: true, removable: false, removesTarget: true,
            physicalSources: [{allocationId: 60, physicalEntityId: 70, namespaceName: 'files', physicalName: 'customers.csv'}], columns: [
                {logicalColumnId: 101, logicalName: 'id', logicalPosition: 1, typeDisplay: 'BIGINT', nullable: false, physicalReferences: [], included: true},
                {logicalColumnId: 102, logicalName: 'name', logicalPosition: 2, typeDisplay: 'VARCHAR', nullable: true, physicalReferences: [], included: true}
            ]
        };
        mappings = jasmine.createSpyObj('MappingService', ['getSummaries', 'getDetail', 'getMapping', 'getSources', 'getDraft', 'getMappings', 'create', 'update']);
        mappings.getSummaries.and.returnValue(of({adapters: [{adapterId: 7, adapterName: 'csv_source', mappings: [detail]}]}));
        mappings.getDetail.and.returnValue(of(detail));
        mappings.getMapping.and.callFake(() => mappings.getDetail(7, 31));
        mappings.getMappings.and.returnValue(of({mappings: [detail]}));
        sidebar = jasmine.createSpyObj('LeftSidebarService', ['close', 'open', 'setNodes', 'setTopButtons', 'reset']);
        catalog = {listener: signal(null), entities: signal(new Map()),
            namespaces: signal(new Map([[1, {id: 1, name: 'public', dataModel: DataModel.RELATIONAL, caseSensitive: false}]])),
            getSnapshot: jasmine.createSpy('getSnapshot').and.returnValue(of(null))};
        toast = jasmine.createSpyObj('ToasterService', ['success']);
        route = {
            paramMap: new BehaviorSubject(convertToParamMap({adapterId: '7', mappingId: '31'})),
            queryParamMap: new BehaviorSubject(convertToParamMap({})), snapshot: {data: {}}
        };
        await TestBed.configureTestingModule({
            declarations: [MappingEditorComponent],
            imports: [CommonModule, FormsModule, ReactiveFormsModule, FormModule, TableModule, RouterTestingModule],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                {provide: MappingService, useValue: mappings}, {provide: CatalogService, useValue: catalog},
                {provide: ToasterService, useValue: toast},
                {provide: ActivatedRoute, useValue: route},
                {provide: BreadcrumbService, useValue: {setBreadcrumbs: () => {}, hide: () => {}}},
                {provide: LeftSidebarService, useValue: sidebar}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(MappingEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('opens a global mapping by ID without requiring an adapter route', () => {
        const breadcrumbs = spyOn(TestBed.inject(BreadcrumbService), 'setBreadcrumbs');
        route.paramMap.next(convertToParamMap({mappingId: '31'}));
        fixture.detectChanges();
        expect(mappings.getMapping).toHaveBeenCalledWith(31);
        expect(component.adapterContext).toBeFalse();
        const path = breadcrumbs.calls.mostRecent().args[0];
        expect(path.map(item => item.name)).toEqual(['Mappings', 'Physical to Logical', 'Edit Mapping']);
        expect(path[1].routerLink).toEqual(['/views/mappings/kind', 'PHYSICAL_TO_LOGICAL']);
        expect(fixture.nativeElement.querySelector('.mapping-list')).toBeNull();
        const node = sidebar.setNodes.calls.mostRecent().args[0][0].children[0];
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].name).toBe('Physical to Logical');
        expect(node.name).toBe('Import');
        expect(fixture.nativeElement.querySelector('.mapping-tag')).toBeNull();
        expect(node.cssClass).toBe('node-content-wrapper-active');
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        node.action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/mappings', 31, 'edit']);
        navigate.calls.reset();
        fixture.nativeElement.querySelector('.editor-actions button[type="button"]').click();
        expect(navigate).toHaveBeenCalledWith(['/views/mappings']);
        component.form.get('mappingName').setValue('Global edit');
        expect(component.canSave).toBeTrue();
    });

    it('links to the target Mappings tab only alongside the shared target notice', () => {
        expect(fixture.nativeElement.textContent).not.toContain('View all sources for this target');
        expect(fixture.nativeElement.querySelector('.shared-target-info')).toBeNull();
        mappings.getDetail.and.returnValue(of({...detail, fixedTargetEntityId: 50, targetColumns: detail.columns}));
        route.paramMap.next(convertToParamMap({adapterId: '7', mappingId: '31'}));
        fixture.detectChanges();
        const notice: HTMLElement = fixture.nativeElement.querySelector('#shared-target-info');
        const link: HTMLAnchorElement = notice.parentElement.querySelector('a');
        expect(link.textContent.trim()).toBe('View all sources for this target');
        expect(link.getAttribute('href')).toBe('/views/schema-editing/public.customers/mappings');
        mappings.getDetail.and.returnValue(of(detail));
        route.paramMap.next(convertToParamMap({adapterId: '7', mappingId: '31'}));
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).not.toContain('View all sources for this target');
    });

    it('returns to the same physical source target list on cancel and after saving', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        route.paramMap.next(convertToParamMap({mappingId: '31'}));
        route.queryParamMap.next(convertToParamMap({returnSourceAdapterId: '7', returnSourceNamespace: 'files', returnSourceTable: 'customers.csv'}));
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.editor-actions button[type="button"]').click();
        const destination = {queryParams: {sourceNamespace: 'files', sourceTable: 'customers.csv'}};
        expect(navigate).toHaveBeenCalledWith(['/views/mappings/source', 7], destination);
        navigate.calls.reset();
        component.form.get('mappingName').setValue('Renamed');
        mappings.update.and.returnValue(of({...detail, mappingName: 'Renamed'}));
        component.save();
        expect(navigate).toHaveBeenCalledWith(['/views/mappings/source', 7], destination);
        expect(component.dirty).toBeFalse();
    });

    it('creates another target and returns to the physical source target list', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        route.snapshot.data = {create: true};
        mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, mappingName: 'Another import', logicalTableName: 'customers_archive'}));
        route.paramMap.next(convertToParamMap({}));
        route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '50', sourceAllocationId: '60',
            returnSourceAdapterId: '7', returnSourceNamespace: 'files', returnSourceTable: 'customers.csv'}));
        fixture.detectChanges();
        expect(component.canSave).toBeTrue();
        expect(fixture.nativeElement.textContent).not.toContain('View all sources for this target');
        mappings.create.and.returnValue(of({...detail, mappingId: 33, targetEntityId: 55, logicalTableName: 'customers_archive'}));
        component.save();
        expect(mappings.create.calls.mostRecent().args[0].sourceAllocationId).toBe(60);
        expect(mappings.create.calls.mostRecent().args[0].targetEntityId).toBe(50);
        expect(navigate).toHaveBeenCalledWith(['/views/mappings/source', 7], {queryParams: {sourceNamespace: 'files', sourceTable: 'customers.csv'}});
    });

    it('rejects an incomplete source return destination', () => {
        mappings.getDetail.calls.reset();
        route.queryParamMap.next(convertToParamMap({returnSourceAdapterId: '7'}));
        fixture.detectChanges();
        expect(component.loadError).toBe('The physical source is invalid.');
        expect(mappings.getDetail).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('locks the existing target and validates source compatibility before saving', () => {
        spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        route.snapshot.data = {create: true};
        mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, mappingName: 'New incoming mapping', fixedTargetEntityId: 50, targetColumns: detail.columns}));
        route.paramMap.next(convertToParamMap({}));
        route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '51', existingTargetEntityId: '50', returnTargetEntityId: '50'}));
        fixture.detectChanges();
        expect(mappings.getDraft).toHaveBeenCalledWith(7, 51, 50, undefined);
        expect(fixture.nativeElement.querySelector('#table-name-info').textContent.trim()).toBe(
            'This mapping uses an existing target table, which cannot be renamed');
        expect(fixture.nativeElement.querySelector('#shared-target-info')).toBeNull();
        expect(component.form.get('targetNamespaceId').disabled).toBeTrue();
        expect(component.form.get('logicalTableName').disabled).toBeTrue();
        expect(component.canSave).toBeTrue();
        component.columns.at(0).get('included').setValue(false);
        fixture.detectChanges();
        expect(component.canSave).toBeFalse();
        expect(fixture.nativeElement.textContent).toContain('The included source fields must match all existing target columns');
        component.columns.at(0).get('included').setValue(true);
        expect(component.canSave).toBeTrue();
        mappings.create.and.returnValue(of({...detail, mappingId: 32}));
        component.save();
        expect(mappings.create.calls.mostRecent().args[0].existingTargetEntityId).toBe(50);
        expect(mappings.create.calls.mostRecent().args[0].targetEntityId).toBe(51);
    });

    it('shows Cancel and Save in the adapter editor and returns to Adapters on cancel', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.editor-actions button'));
        expect(buttons.map(button => button.textContent.trim())).toEqual(['Cancel', 'Save']);
        expect(buttons[0].disabled).toBeFalse();
        buttons[0].click();
        expect(navigate).toHaveBeenCalledWith(['/views/adapters']);
        expect(mappings.update).not.toHaveBeenCalled();
        component.saving = true;
        fixture.detectChanges();
        expect(buttons[0].disabled).toBeTrue();
    });

    it('returns to the table Mappings tab on cancel and after saving', () => {
        catalog.entities.set(new Map([[50, {id: 50, namespaceId: 1, name: 'customers'}]]));
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        route.queryParamMap.next(convertToParamMap({returnTargetEntityId: '50'}));
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.editor-actions button').click();
        expect(navigate).toHaveBeenCalledWith(['/views/schema-editing', 'public.customers', 'mappings']);
        navigate.calls.reset();
        component.form.get('mappingName').setValue('Renamed');
        mappings.update.and.returnValue(of({...detail, mappingName: 'Renamed'}));
        component.save();
        expect(navigate).toHaveBeenCalledWith(['/views/schema-editing', 'public.customers', 'mappings']);
        expect(component.dirty).toBeFalse();
    });

    it('keeps a shared target schema fixed while allowing the mapping to be renamed', () => {
        mappings.getDetail.and.returnValue(of({...detail, fixedTargetEntityId: 50, targetColumns: detail.columns}));
        route.paramMap.next(convertToParamMap({adapterId: '7', mappingId: '31'}));
        fixture.detectChanges();
        const notice: HTMLElement = fixture.nativeElement.querySelector('#shared-target-info');
        expect(notice.textContent.trim()).toBe('This mapping uses a target table shared by multiple sources. The target schema and mapping rules cannot be edited. You can still rename this mapping.');
        expect(notice.parentElement.parentElement).toBe(fixture.nativeElement.querySelector('.source-target-grid'));
        expect(notice.parentElement.previousElementSibling).toBe(fixture.nativeElement.querySelector('[aria-label="Target"]'));
        expect(fixture.nativeElement.querySelector('fieldset').getAttribute('aria-describedby')).toBe('shared-target-info');
        expect(fixture.nativeElement.querySelector('#table-name-info')).toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Rename mapping"]')).not.toBeNull();
        expect(component.columns.disabled).toBeTrue();
        expect(component.form.get('logicalTableName').disabled).toBeTrue();
        component.form.get('mappingName').setValue('Renamed');
        expect(component.canSave).toBeTrue();
    });

    it('opens details without editable controls or save actions', () => {
        const breadcrumbs = spyOn(TestBed.inject(BreadcrumbService), 'setBreadcrumbs');
        route.snapshot.data = {readOnly: true};
        route.paramMap.next(convertToParamMap({mappingId: '31'}));
        fixture.detectChanges();
        expect(component.form.disabled).toBeTrue();
        expect(breadcrumbs.calls.mostRecent().args[0].map(item => item.name)).toEqual(['Mappings', 'Physical to Logical', 'Mapping Details']);
        expect(component.canSave).toBeFalse();
        expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Include all fields"]').disabled).toBeTrue();
    });

    it('creates from a source draft and opens the saved mapping without sending a provisional mapping ID', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        route.snapshot.data = {create: true};
        mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, mappingName: 'New mapping', revision: 'draft'}));
        route.paramMap.next(convertToParamMap({}));
        route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '50'}));
        fixture.detectChanges();
        expect(component.canSave).toBeTrue();
        expect(mappings.getDraft).toHaveBeenCalledWith(7, 50);
        expect(mappings.getSources).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('#mapping-source')).toBeNull();
        expect(fixture.nativeElement.querySelector('#source-table-0').textContent).toContain('customers.csv');
        component.form.get('mappingName').setValue('Created');
        mappings.create.and.returnValue(of({...detail, mappingName: 'Created', mappingId: 32}));
        component.save();
        const request = mappings.create.calls.mostRecent().args[0];
        expect(request.targetEntityId).toBe(50);
        expect(request.expectedRevision).toBe('draft');
        expect('mappingId' in request).toBeFalse();
        expect(mappings.update).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(['/views/mappings', 32, 'edit'], {replaceUrl: true});
    });

    it('sorts sidebar mappings by name and preserves the explicitly selected mapping', () => {
        const first = {...detail, mappingName: 'csv2_customers_mapping', logicalTableName: 'customers_target_1'};
        const second = {...detail, mappingId: 32, mappingName: 'csv2_customers_mapping_1', logicalTableName: 'customers_target'};
        mappings.getSummaries.and.returnValue(of({adapters: [{adapterId: 7, adapterName: 'csv_source', mappings: [second, first]}]}));
        mappings.getMappings.and.returnValue(of({mappings: [second, first]}));
        mappings.getDetail.and.callFake((adapterId, mappingId) => of(mappingId === first.mappingId ? first : second));
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        route.paramMap.next(convertToParamMap({adapterId: '7', mappingId: String(first.mappingId)}));
        fixture.detectChanges();
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].children.map(node => node.name)).toEqual([first.mappingName, second.mappingName]);
        expect(navigate).not.toHaveBeenCalled();
        route.paramMap.next(convertToParamMap({adapterId: '7', mappingId: String(first.mappingId)}));
        fixture.detectChanges();
        expect(component.detail.mappingId).toBe(first.mappingId);
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].children[0].cssClass).toBe('node-content-wrapper-active');
        route.paramMap.next(convertToParamMap({adapterId: '7', mappingId: String(second.mappingId)}));
        fixture.detectChanges();
        expect(component.detail.mappingId).toBe(second.mappingId);
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].children[1].cssClass).toBe('node-content-wrapper-active');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('requires an explicit mapping ID instead of opening the first adapter mapping', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        mappings.getDetail.calls.reset();
        route.paramMap.next(convertToParamMap({adapterId: '7'}));
        fixture.detectChanges();
        expect(component.loadError).toBe('Choose a mapping from the mapping list.');
        expect(mappings.getDetail).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('loads the saved definition and compares values rather than form touch state', () => {
        expect(mappings.getDetail).toHaveBeenCalledWith(7, 31);
        const group = sidebar.setNodes.calls.mostRecent().args[0][0];
        expect(group.name).toBe('csv_source');
        expect(group.cssClass).toBe('');
        expect(group.isAutoExpand()).toBeFalse();
        const node = group.children[0];
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        group.action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/adapters', 7, 'mappings', 'list']);
        navigate.calls.reset();
        node.action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/adapters', 7, 'mappings', 31]);
        expect(fixture.nativeElement.querySelector('.mapping-list')).toBeNull();
        expect(component.dirty).toBeFalse();
        component.form.get('mappingName').setValue('Changed');
        expect(component.canSave).toBeTrue();
        component.form.get('mappingName').setValue('Import');
        expect(component.dirty).toBeFalse();
    });

    it('renders data models without repeating the mapping kind in the editor header', async () => {
        detail.kind = 'LOGICAL_TO_LOGICAL';
        detail.sourceModel = DataModel.DOCUMENT;
        detail.targetModel = DataModel.GRAPH;
        catalog.namespaces.set(new Map([[1, {id: 1, name: 'public', dataModel: DataModel.GRAPH, caseSensitive: false}]]));
        await component.reloadSaved();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('#mapping-relationship')).toBeNull();
        expect(root.querySelector('c-card-header').textContent).not.toContain('Logical to Logical');
        expect(root.querySelector('#source-model').textContent).toContain('Data model: Document');
        expect(root.querySelector('#source-model').tagName).toBe('P');
        expect(root.querySelector('#target-model').textContent).toContain('Data model: Graph');
        expect(root.querySelector('#target-model').tagName).toBe('P');
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].children[0].name).toBe('Import');
    });

    it('uses explicit inclusion flags and saved rule identities for rule labels', async () => {
        detail.rules = [{type: 'TRANSFORM', targetLogicalColumnId: 102}];
        detail.columns = detail.columns.map((column, index) => ({...column, included: index === 1}));
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
        expect(source.querySelector('.source-position')).toBeNull();
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
        expect(component.columns.at(1).get('logicalName').hasError('duplicateColumnName')).toBeTrue();
        expect(component.canSave).toBeFalse();
    });

    for (const create of [false, true]) {
        it(`validates target entity names while typing during ${create ? 'creation' : 'editing'}`, () => {
            if (create) {
                route.snapshot.data = {create: true};
                mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, mappingName: 'New mapping', logicalTableName: 'customers_mapped', revision: 'draft'}));
                route.paramMap.next(convertToParamMap({}));
                route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '50'}));
            }
            catalog.entities.set(new Map([
                [50, {id: 50, name: 'customers', namespaceId: 1}],
                [51, {id: 51, name: 'orders', namespaceId: 1}],
                [52, {id: 52, name: 'other_namespace', namespaceId: 2}]
            ]));
            fixture.detectChanges();
            const input: HTMLInputElement = fixture.nativeElement.querySelector('#table-name');
            input.value = ' ORDERS ';
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            const feedback: HTMLElement = fixture.nativeElement.querySelector('#table-name-error');
            expect(feedback.tagName).toBe('C-FORM-FEEDBACK');
            expect(feedback.textContent).toContain('An entity with this name already exists in the namespace.');
            expect(getComputedStyle(feedback).display).not.toBe('none');
            expect(input.classList).toContain('is-invalid');
            expect(component.canSave).toBeFalse();
            expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
            input.value = 'customers';
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            expect(component.form.get('logicalTableName').hasError('duplicateEntityName')).toBe(create);
            input.value = 'other_namespace';
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('#table-name-error')).toBeNull();
            expect(component.canSave).toBeTrue();
        });
    }

    it('uses namespace case rules and revalidates target names when the catalog changes', async () => {
        detail.namespaceCaseSensitive = true;
        catalog.namespaces.set(new Map([[1, {id: 1, name: 'public', dataModel: DataModel.RELATIONAL, caseSensitive: true}]]));
        await component.reloadSaved();
        catalog.entities.set(new Map([[51, {id: 51, name: 'Orders', namespaceId: 1}]]));
        component.form.get('logicalTableName').setValue('orders');
        expect(component.form.get('logicalTableName').valid).toBeTrue();
        catalog.entities.set(new Map([[51, {id: 51, name: 'orders', namespaceId: 1}]]));
        catalog.listener.set({});
        fixture.detectChanges();
        expect(component.form.get('logicalTableName').hasError('duplicateEntityName')).toBeTrue();
    });

    it('shows and clears table and column validation errors inline without a status alert', () => {
        component.form.get('logicalTableName').setValue('draft_table');
        mappings.update.and.returnValue(throwError(() => ({status: 400, error: {code: 'VALIDATION_FAILED', message: 'Correct fields',
            fieldErrors: {logicalTableName: 'An entity with this name already exists in the namespace.', 'columns.101': 'Server column feedback'}}})));
        component.save();
        fixture.detectChanges();
        expect(component.canSave).toBeFalse();
        expect(fixture.nativeElement.querySelector('#column-error-101').tagName).toBe('C-FORM-FEEDBACK');
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
        component.form.get('logicalTableName').setValue('corrected_table');
        expect(component.saveError.fieldErrors.logicalTableName).toBeUndefined();
        component.columns.at(0).get('logicalName').setValue('corrected_id');
        fixture.detectChanges();
        expect(component.saveError).toBeNull();
        expect(component.canSave).toBeTrue();
        component.columns.at(0).get('logicalName').setValue('NAME');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#column-error-101').textContent).toContain('Logical column names must be unique.');
        component.columns.at(0).get('logicalName').setValue('corrected_id');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#column-error-101')).toBeNull();
        expect(component.columns.at(1).get('logicalName').valid).toBeTrue();
    });

    it('renames from the title without saving or losing pending target edits', async () => {
        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('.mapping-title').textContent.trim()).toBe('Import');
        expect(root.querySelector('form #mapping-name')).toBeNull();
        expect(root.querySelector('form #mapping-relationship')).toBeNull();
        component.form.get('logicalTableName').setValue('draft_table');
        component.columns.at(0).get('logicalName').setValue('draft_id');
        root.querySelector<HTMLButtonElement>('[aria-label="Rename mapping"]').click();
        fixture.detectChanges();
        await fixture.whenStable();
        const input = root.querySelector<HTMLInputElement>('#mapping-name');
        expect(input.placeholder).toBe('Import');
        expect(input.parentElement.querySelectorAll('button').length).toBe(1);
        expect(input.parentElement.querySelector('button').textContent).toBe('rename');
        expect(parseFloat(getComputedStyle(input.parentElement).maxWidth)).toBeGreaterThanOrEqual(600);
        input.value = 'Renamed mapping';
        input.dispatchEvent(new Event('input'));
        const renameButton = input.parentElement.querySelector<HTMLButtonElement>('button');
        renameButton.focus();
        fixture.detectChanges();
        expect(component.nameEditing).toBeTrue();
        renameButton.click();
        fixture.detectChanges();
        expect(mappings.update).not.toHaveBeenCalled();
        expect(component.form.get('logicalTableName').value).toBe('draft_table');
        expect(component.columns.at(0).get('logicalName').value).toBe('draft_id');
        expect(component.detail.revision).toBe('original');
        expect(component.detail.mappingName).toBe('Import');
        expect(component.dirty).toBeTrue();
        expect(root.querySelector('.mapping-title').textContent).toBe('Renamed mapping');
        expect(root.querySelector('#mapping-name')).toBeNull();
        expect(toast.success).not.toHaveBeenCalled();
        mappings.update.and.returnValue(of({...detail, mappingName: 'Renamed mapping', logicalTableName: 'draft_table',
            columns: detail.columns.map((column, i) => ({...column, logicalName: i === 0 ? 'draft_id' : column.logicalName})), revision: 'saved'}));
        root.querySelector<HTMLButtonElement>('button[type="submit"]').click();
        const request = mappings.update.calls.mostRecent().args[0];
        expect(request.mappingName).toBe('Renamed mapping');
        expect(request.logicalTableName).toBe('draft_table');
        expect(request.columns[0].logicalName).toBe('draft_id');
        expect(component.dirty).toBeFalse();
        expect(toast.success).toHaveBeenCalledWith('Mapping saved.');
    });

    it('keeps valid draft names on focus loss or outside click without saving or discarding target edits', async () => {
        const root: HTMLElement = fixture.nativeElement;
        component.form.get('logicalTableName').setValue('draft_table');
        component.columns.at(0).get('logicalName').setValue('draft_id');
        root.querySelector<HTMLButtonElement>('[aria-label="Rename mapping"]').click();
        fixture.detectChanges();
        await fixture.whenStable();
        const input = root.querySelector<HTMLInputElement>('#mapping-name');
        input.value = 'Unconfirmed name';
        input.dispatchEvent(new Event('input'));
        root.querySelector<HTMLInputElement>('#table-name').focus();
        fixture.detectChanges();
        expect(root.querySelector('.mapping-name-input')).toBeNull();
        expect(root.querySelector('.mapping-title').textContent).toBe('Unconfirmed name');
        expect(component.form.get('logicalTableName').value).toBe('draft_table');
        expect(component.columns.at(0).get('logicalName').value).toBe('draft_id');
        expect(component.dirty).toBeTrue();
        root.querySelector<HTMLButtonElement>('[aria-label="Rename mapping"]').click();
        fixture.detectChanges();
        await fixture.whenStable();
        component.form.get('mappingName').setValue('Another unconfirmed name');
        root.querySelector<HTMLElement>('h1').click();
        fixture.detectChanges();
        expect(root.querySelector('.mapping-name-input')).toBeNull();
        expect(root.querySelector('.mapping-title').textContent).toBe('Another unconfirmed name');
        expect(component.detail.mappingName).toBe('Import');
        expect(mappings.update).not.toHaveBeenCalled();
    });

    it('lets a new mapping change its draft title and cancel another rename without creating it', () => {
        route.snapshot.data = {create: true};
        mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, mappingName: 'Suggested name', revision: 'draft'}));
        route.paramMap.next(convertToParamMap({}));
        route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '50'}));
        component.startRename();
        component.form.get('mappingName').setValue('My mapping');
        component.renameMapping();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.mapping-title').textContent).toBe('My mapping');
        expect(mappings.create).not.toHaveBeenCalled();
        expect(mappings.update).not.toHaveBeenCalled();
        component.startRename();
        component.form.get('mappingName').setValue('Cancelled');
        component.cancelRename();
        expect(component.form.get('mappingName').value).toBe('My mapping');
    });

    it('restores the last valid draft name when an invalid rename loses focus or Escape is pressed', async () => {
        const root: HTMLElement = fixture.nativeElement;
        component.startRename();
        component.form.get('mappingName').setValue('Valid draft');
        component.renameMapping();
        for (const cancel of ['blur', 'escape']) {
            component.startRename();
            fixture.detectChanges();
            await fixture.whenStable();
            const input = root.querySelector<HTMLInputElement>('#mapping-name');
            input.value = cancel === 'blur' ? ' ' : 'Cancelled draft';
            input.dispatchEvent(new Event('input'));
            if (cancel === 'blur') {
                root.querySelector<HTMLInputElement>('#table-name').focus();
            } else {
                input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
            }
            fixture.detectChanges();
            expect(root.querySelector('.mapping-title').textContent).toBe('Valid draft');
            expect(root.querySelector('#mapping-name')).toBeNull();
        }
        expect(mappings.update).not.toHaveBeenCalled();
    });

    it('lays out vertical source and target information beside each other above the rules', () => {
        const root: HTMLElement = fixture.nativeElement;
        root.style.width = '1200px';
        const source: HTMLElement = root.querySelector('section[aria-label="Source"]');
        const target: HTMLElement = root.querySelector('section[aria-label="Target"]');
        expect(source.querySelectorAll('input, select, button').length).toBe(0);
        expect(root.querySelector('#source-adapter')).toBeNull();
        expect(source.textContent).toContain('Namespace: files');
        expect(source.textContent).toContain('Data model: Relational');
        expect(source.textContent).toContain('Table name: customers.csv');
        expect(root.querySelector('#mapping-source-heading').textContent).toBe('Source Information');
        expect(root.querySelector('#mapping-target-heading').textContent).toBe('Target Information');
        expect(Math.abs(target.getBoundingClientRect().top - source.getBoundingClientRect().top)).toBeLessThan(1);
        expect(target.getBoundingClientRect().left).toBeGreaterThan(source.getBoundingClientRect().right);
        expect(target.getBoundingClientRect().right).toBeLessThan(root.getBoundingClientRect().right);
        expect(getComputedStyle(source).borderTopWidth).toBe('0px');
        expect(getComputedStyle(target).borderTopWidth).toBe('0px');
        expect(target.querySelectorAll('input').length).toBe(1);
        expect(target.querySelectorAll('select').length).toBe(1);
        expect(target.querySelector<HTMLSelectElement>('#target-namespace').disabled).toBeFalse();
        expect(target.querySelector<HTMLInputElement>('#table-name').readOnly).toBeFalse();
        const rules: HTMLElement = root.querySelector('.rules-section');
        expect(rules.getBoundingClientRect().top).toBeGreaterThanOrEqual(target.getBoundingClientRect().bottom);
        const sourceFields = Array.from(source.querySelectorAll<HTMLElement>('.metadata-grid > *'));
        const fields = Array.from(target.querySelectorAll<HTMLElement>('.metadata-grid > *'));
        expect(fields.length).toBe(3);
        expect(fields[1].getBoundingClientRect().top).toBeGreaterThan(fields[0].getBoundingClientRect().bottom);
        expect(fields[2].getBoundingClientRect().top).toBeGreaterThan(fields[1].getBoundingClientRect().bottom);
        fields.forEach((field, i) => expect(Math.abs(field.getBoundingClientRect().top - sourceFields[i].getBoundingClientRect().top)).toBeLessThan(1));
        expect(root.querySelector('#mapping-rules-heading').tagName).toBe('H2');
        expect(root.querySelector('#mapping-rules-heading').textContent).toBe('Mapping Rules');
        expect(root.querySelector('.editor-heading .mapping-title')).not.toBeNull();
        expect(root.querySelector('.editor-heading .mapping-tag')).toBeNull();
    });

    for (const create of [false, true]) {
        it(`selects the target namespace and validates names there before ${create ? 'creating' : 'saving'}`, async () => {
            catalog.namespaces.set(new Map([
                [1, {id: 1, name: 'public', dataModel: DataModel.RELATIONAL, caseSensitive: false}],
                [2, {id: 2, name: 'reporting', dataModel: DataModel.RELATIONAL, caseSensitive: true}],
                [3, {id: 3, name: 'documents', dataModel: DataModel.DOCUMENT, caseSensitive: false}]
            ]));
            catalog.entities.set(new Map([[51, {id: 51, name: 'customers', namespaceId: 2}]]));
            if (create) {
                route.snapshot.data = {create: true};
                mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, mappingName: 'New mapping', revision: 'draft'}));
                route.paramMap.next(convertToParamMap({}));
                route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '50'}));
                spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
            }
            fixture.detectChanges();
            await fixture.whenStable();
            const root: HTMLElement = fixture.nativeElement;
            const select = root.querySelector<HTMLSelectElement>('#target-namespace');
            expect(Array.from(select.options, option => option.textContent.trim())).toEqual(['public', 'reporting']);
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change'));
            fixture.detectChanges();
            expect(component.form.get('targetNamespaceId').value).toBe(2);
            expect(component.targetModel).toBe(DataModel.RELATIONAL);
            expect(root.querySelector('#target-model').textContent).toContain('Data model: Relational');
            expect(root.querySelector('#table-name-error').textContent).toContain('already exists');
            expect(component.canSave).toBeFalse();
            component.form.get('logicalTableName').setValue('Customers');
            fixture.detectChanges();
            expect(root.querySelector('#table-name-error')).toBeNull();
            expect(component.canSave).toBeTrue();
            expect(mappings.update).not.toHaveBeenCalled();
            expect(mappings.create).not.toHaveBeenCalled();
            const save = create ? mappings.create : mappings.update;
            save.and.returnValue(of({...detail, namespaceId: 2, namespaceName: 'reporting', namespaceCaseSensitive: true, logicalTableName: 'Customers'}));
            component.save();
            expect(save.calls.mostRecent().args[0].targetNamespaceId).toBe(2);
            expect(component.detail.namespaceName).toBe('reporting');
            expect(component.dirty).toBeFalse();
        });
    }

    it('blocks saving a removed namespace and derives the model from the current catalog', () => {
        catalog.namespaces.set(new Map([[2, {id: 2, name: 'reporting', dataModel: DataModel.RELATIONAL, caseSensitive: false}]]));
        component.form.get('targetNamespaceId').setValue(2);
        expect(component.canSave).toBeTrue();
        catalog.namespaces.set(new Map([[2, {id: 2, name: 'reporting', dataModel: DataModel.DOCUMENT, caseSensitive: false}]]));
        catalog.listener.set({});
        fixture.detectChanges();
        expect(component.targetModel).toBe(DataModel.DOCUMENT);
        expect(component.canSave).toBeFalse();
        expect(fixture.nativeElement.querySelector('#target-namespace-error').textContent).toContain('relational namespace');
    });

    it('does not confirm a lost save response with the wrong target namespace', () => {
        catalog.namespaces.set(new Map([[2, {id: 2, name: 'reporting', dataModel: DataModel.RELATIONAL, caseSensitive: false}]]));
        component.form.get('targetNamespaceId').setValue(2);
        mappings.update.and.returnValue(throwError(() => ({status: 0})));
        mappings.getMapping.and.returnValue(of(detail));
        component.save();
        expect(component.saveError.code).toBe('SAVE_UNCONFIRMED');
        expect(component.form.get('targetNamespaceId').value).toBe(2);
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('saves all column IDs together, adopts canonical names and refreshes the catalog', () => {
        component.form.get('mappingName').setValue('Customers');
        const saved = {...detail, mappingName: 'Customers', revision: 'saved'};
        mappings.update.and.returnValue(of(saved));
        component.save();
        expect(mappings.update.calls.mostRecent().args[0]).toEqual({
            adapterId: 7, mappingId: 31, expectedRevision: 'original', mappingName: 'Customers', logicalTableName: 'customers', targetNamespaceId: 1,
            columns: [{logicalColumnId: 101, logicalName: 'id', included: true}, {logicalColumnId: 102, logicalName: 'name', included: true}]
        });
        expect(component.dirty).toBeFalse();
        expect(component.detail.revision).toBe('saved');
        expect(catalog.getSnapshot).toHaveBeenCalled();
    });

    for (const mode of ['adapter', 'global', 'create']) {
        it(`validates duplicate mapping names while typing in the ${mode} editor before saving`, () => {
            const other = {...detail, mappingId: 32, adapterId: 8, adapterName: 'other_adapter', namespaceName: 'other_namespace',
                mappingName: 'Existing name'};
            mappings.getMappings.and.returnValue(of({mappings: [detail, other]}));
            if (mode === 'create') {
                route.snapshot.data = {create: true};
                mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, mappingName: 'Existing name', revision: 'draft'}));
                route.paramMap.next(convertToParamMap({}));
                route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '50'}));
            } else if (mode === 'global') {
                route.paramMap.next(convertToParamMap({mappingId: '31'}));
            } else {
                component.refreshSummaries();
                expect(sidebar.setNodes.calls.mostRecent().args[0][0].children.map(node => node.name)).toEqual(['Import']);
            }
            fixture.detectChanges();
            const root: HTMLElement = fixture.nativeElement;
            component.startRename();
            fixture.detectChanges();
            const input = root.querySelector<HTMLInputElement>('#mapping-name');
            input.value = ' existing NAME ';
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            const feedback = root.querySelector<HTMLElement>('#mapping-name-error');
            expect(feedback.tagName).toBe('C-FORM-FEEDBACK');
            expect(feedback.textContent).toContain('A mapping with this name already exists.');
            expect(getComputedStyle(feedback).display).not.toBe('none');
            expect(input.classList).toContain('is-invalid');
            expect(root.querySelector<HTMLButtonElement>('button[type="submit"]').disabled).toBeTrue();
            expect(root.querySelector('[role="alert"]')).toBeNull();
            component.save();
            expect(mappings.create).not.toHaveBeenCalled();
            expect(mappings.update).not.toHaveBeenCalled();

            input.value = 'Unique name';
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            expect(root.querySelector('#mapping-name-error')).toBeNull();
            expect(input.classList).not.toContain('is-invalid');
            expect(root.querySelector<HTMLButtonElement>('button[type="submit"]').disabled).toBeFalse();
        });
    }

    it('keeps the current mapping name valid when it belongs only to this mapping', () => {
        mappings.getMappings.and.returnValue(of({mappings: [detail]}));
        component.refreshSummaries();
        component.columns.at(0).get('included').setValue(false);
        fixture.detectChanges();
        expect(component.form.get('mappingName').valid).toBeTrue();
        expect(fixture.nativeElement.querySelector('#mapping-name-error')).toBeNull();
        expect(component.canSave).toBeTrue();
    });

    it('rejects the unchanged name when another mapping has the same name', () => {
        mappings.getMappings.and.returnValue(of({mappings: [detail, {...detail, mappingId: 32}]}));
        component.refreshSummaries();
        component.columns.at(0).get('included').setValue(false);
        fixture.detectChanges();
        expect(component.form.get('mappingName').hasError('duplicateMappingName')).toBeTrue();
        expect(fixture.nativeElement.querySelector('#mapping-name-error').textContent).toContain('A mapping with this name already exists.');
        expect(component.canSave).toBeFalse();
    });

    it('revalidates when names load or change and requires a successful name-list load before saving', () => {
        const response = new Subject<{mappings: MappingDetail[]}>();
        mappings.getMappings.and.returnValue(response);
        component.refreshSummaries();
        component.form.get('mappingName').setValue('Existing name');
        expect(component.canSave).toBeFalse();
        response.next({mappings: [detail, {...detail, mappingId: 32, mappingName: 'Existing name'}]});
        expect(component.form.get('mappingName').hasError('duplicateMappingName')).toBeTrue();
        response.next({mappings: [detail]});
        expect(component.canSave).toBeTrue();
        response.error(new Error('Cannot load names'));
        expect(component.canSave).toBeFalse();
        mappings.getMappings.and.returnValue(of({mappings: [detail]}));
        component.refreshSummaries();
        expect(component.canSave).toBeTrue();
    });

    for (const create of [false, true]) {
        it(`shows duplicate mapping names below the name field during ${create ? 'creation' : 'renaming'} and allows correction`, () => {
            spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
            if (create) {
                route.snapshot.data = {create: true};
                mappings.getDraft.and.returnValue(of({...detail, mappingId: -1, revision: 'draft'}));
                route.paramMap.next(convertToParamMap({}));
                route.queryParamMap.next(convertToParamMap({adapterId: '7', targetEntityId: '50'}));
            }
            const save = create ? mappings.create : mappings.update;
            save.and.returnValue(throwError(() => ({status: 400, error: {
                code: 'VALIDATION_FAILED', message: 'Correct the highlighted mapping fields.',
                fieldErrors: {mappingName: 'A mapping with this name already exists.'}
            }})));
            component.form.get('mappingName').setValue('Existing name');
            component.save();
            fixture.detectChanges();
            const root: HTMLElement = fixture.nativeElement;
            expect(root.querySelector('#mapping-name-error').textContent).toContain('A mapping with this name already exists.');
            expect(root.querySelector('#mapping-name').classList).toContain('is-invalid');
            expect(root.querySelector<HTMLInputElement>('#mapping-name').value).toBe('Existing name');
            expect(root.querySelector('[role="alert"]')).toBeNull();
            expect(component.canSave).toBeFalse();
            expect(component.conflict).toBeFalse();
            expect(toast.success).not.toHaveBeenCalled();

            component.form.get('mappingName').setValue('Unique name');
            fixture.detectChanges();
            expect(root.querySelector('#mapping-name-error')).toBeNull();
            expect(root.querySelector('#mapping-name').classList).not.toContain('is-invalid');
            expect(component.canSave).toBeTrue();
            save.and.returnValue(of({...detail, mappingName: 'Unique name', revision: 'saved'}));
            component.save();
            expect(save).toHaveBeenCalledTimes(2);
            expect(component.detail.mappingName).toBe('Unique name');
            expect(component.saveError).toBeNull();
        });
    }

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

    it('requires at least one field and allows the selection to be corrected', () => {
        component.setAllIncluded(false);
        fixture.detectChanges();
        expect(component.includedCount).toBe(0);
        expect(component.columns.hasError('noIncludedFields')).toBeTrue();
        expect(component.canSave).toBeFalse();
        expect(fixture.nativeElement.textContent).toContain('Include at least one field');
        component.setAllIncluded(true);
        expect(component.canSave).toBeFalse();
        expect(component.columns.hasError('noIncludedFields')).toBeFalse();
        expect(component.includedCount).toBe(2);
        expect(component.dirty).toBeFalse();
        expect(component.columns.at(0).get('logicalName').enabled).toBeTrue();
    });

    it('does not validate or save draft names for excluded fields', () => {
        component.columns.at(0).get('logicalName').setValue('invalid name');
        expect(component.form.invalid).toBeTrue();
        component.columns.at(0).get('included').setValue(false);
        expect(component.form.valid).toBeTrue();
        mappings.update.and.returnValue(of({...detail, rules: [detail.rules[1]],
            columns: detail.columns.map((column, index) => ({...column, included: index === 1}))}));
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
        expect(Array.from(root.querySelectorAll('[scope="colgroup"]'), header => (header as HTMLTableCellElement).colSpan)).toEqual([4, 3]);
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
        expect(groups[0].querySelector('c-form-feedback')).not.toBeNull();
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

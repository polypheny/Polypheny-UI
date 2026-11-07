import {NO_ERRORS_SCHEMA, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject, of, throwError} from 'rxjs';
import {MappingManagementComponent} from './mapping-management.component';
import {MappingSummary} from './mapping.model';
import {MappingService} from '../../services/mapping.service';
import {CatalogService} from '../../services/catalog.service';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {EntityType} from '../../models/catalog.model';
import {DataModel} from '../../models/ui-request.model';

describe('MappingManagementComponent', () => {
    const lastSourceMappingReason = 'An imported source table must always have a mapping. Remove the source table or adapter instead.';
    let fixture: any;
    let component: MappingManagementComponent;
    let mappings: jasmine.SpyObj<MappingService>;
    let rows: MappingSummary[];
    let sidebar: jasmine.SpyObj<LeftSidebarService>;
    let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    beforeEach(async () => {
        const customer: MappingSummary = {
            mappingId: 31, adapterId: 7, adapterName: 'csv_source', mappingName: 'Customer import', kind: 'PHYSICAL_TO_LOGICAL',
            targetEntityId: 50, sourceModel: DataModel.RELATIONAL, targetModel: DataModel.RELATIONAL,
            namespaceName: 'public', logicalTableName: 'customers', editable: true, revision: 'original', removesTarget: true, removable: false, removalBlockedReason: lastSourceMappingReason,
            physicalSources: [{allocationId: 60, physicalEntityId: 70, namespaceName: 'files', physicalName: 'customers.csv'}]
        };
        rows = [customer, {...customer, mappingId: 32, mappingName: 'Orders', logicalTableName: 'orders',
            editable: false, readOnlyReason: 'Unsupported adapter', removalBlockedReason: 'Unsupported adapter', targetModel: DataModel.DOCUMENT, kind: 'LOGICAL_TO_LOGICAL'}];
        mappings = jasmine.createSpyObj('MappingService', ['getMappings', 'getSources', 'remove']);
        mappings.getMappings.and.returnValue(of({mappings: rows}));
        mappings.getSources.and.returnValue(of({sources: [{adapterId: 7, adapterName: 'csv_source', targetEntityId: 51,
            namespaceName: 'public', logicalTableName: 'unmapped', kind: 'PHYSICAL_TO_LOGICAL'}]}));
        sidebar = jasmine.createSpyObj('LeftSidebarService', ['close', 'open', 'setNodes', 'setTopButtons', 'reset']);
        params = new BehaviorSubject(convertToParamMap({}));
        query = new BehaviorSubject(convertToParamMap({adapterId: '7'}));
        await TestBed.configureTestingModule({
            declarations: [MappingManagementComponent], imports: [CommonModule, FormsModule, RouterTestingModule], schemas: [NO_ERRORS_SCHEMA],
            providers: [
                {provide: MappingService, useValue: mappings},
                {provide: ActivatedRoute, useValue: {paramMap: params, queryParamMap: query}},
                {provide: CatalogService, useValue: {listener: signal(null), adapters: signal(new Map([[7, {id: 7, name: 'csv_source'}]])), entities: signal(new Map([[50, {id: 50, name: 'customers', namespaceId: 1, entityType: EntityType.SOURCE, modifiable: false}]])), getSnapshot: () => of(null)}},
                {provide: BreadcrumbService, useValue: {setBreadcrumbs: () => {}, hide: () => {}}},
                {provide: LeftSidebarService, useValue: sidebar},
                {provide: ToasterService, useValue: {success: () => {}}}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(MappingManagementComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('opens the adapter mapping list with adapter navigation and clickable endpoints', async () => {
        const breadcrumbs = spyOn(TestBed.inject(BreadcrumbService), 'setBreadcrumbs');
        query.next(convertToParamMap({}));
        params.next(convertToParamMap({adapterId: '7'}));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(mappings.getMappings.calls.mostRecent().args).toEqual([7]);
        expect(mappings.getSources.calls.mostRecent().args).toEqual([7]);
        expect(fixture.nativeElement.querySelector('h1').textContent).toBe('csv_source Physical to Logical Mappings');
        const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
        expect(table.querySelectorAll('tbody tr').length).toBe(2);
        expect(table.querySelector('a').getAttribute('href')).toBe('/views/adapters/7/mappings/31');
        expect(table.querySelector('.mapping-source a').getAttribute('href')).toBe('/views/mappings/source/7?sourceNamespace=files&sourceTable=customers.csv');
        expect(table.querySelector('.mapping-target a').getAttribute('href')).toBe('/views/schema-editing/public.customers/mappings');
        const group = sidebar.setNodes.calls.mostRecent().args[0][0];
        expect(group.name).toBe('csv_source');
        expect(group.cssClass).toBe('node-content-wrapper-active');
        expect(group.isAutoExpand()).toBeFalse();
        expect(group.children.every(node => node.cssClass === '')).toBeTrue();
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        group.action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/adapters', 7, 'mappings', 'list']);
        navigate.calls.reset();
        group.children[0].action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/adapters', 7, 'mappings', 31]);
        expect(breadcrumbs.calls.mostRecent().args[0].map(item => item.name)).toEqual(['Adapters', 'csv_source Mappings']);
        expect(fixture.nativeElement.querySelector('#drop-mapping')).toBeNull();
        navigate.calls.reset();
        component.selectedSource = '7:51';
        component.create();
        expect(navigate).toHaveBeenCalledOnceWith(['/views/adapters', 7, 'mappings', 'create'], {
            queryParams: {targetEntityId: 51}
        });
    });

    it('shows an empty adapter list without redirecting to an editor', () => {
        mappings.getMappings.and.returnValue(of({mappings: []}));
        mappings.getSources.and.returnValue(of({sources: []}));
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        params.next(convertToParamMap({adapterId: '7'}));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('h1').textContent).toBe('csv_source Physical to Logical Mappings');
        expect(fixture.nativeElement.textContent).toContain('This adapter has no saved mappings.');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('rejects invalid adapter list IDs before fetching mappings', () => {
        for (const adapterId of ['bad', '-1', '9007199254740992']) {
            mappings.getMappings.calls.reset();
            params.next(convertToParamMap({adapterId}));
            fixture.detectChanges();
            expect(component.loadError).toBe('The adapter ID is invalid.');
            expect(mappings.getMappings).not.toHaveBeenCalled();
        }
    });

    it('lists all targets of one physical source across distinct allocations and preselects it for creation', async () => {
        const original = rows[0];
        const anotherTarget: MappingSummary = {...original, mappingId: 33, mappingName: 'Customer archive', targetEntityId: 55,
            logicalTableName: 'customers_archive', physicalSources: [{...original.physicalSources[0], allocationId: 61, physicalEntityId: 71}]};
        const otherAdapter = {...original, mappingId: 34, adapterId: 8, adapterName: 'other_csv'};
        const otherNamespace = {...original, mappingId: 35, physicalSources: [{...original.physicalSources[0], namespaceName: 'other_files'}]};
        const otherTable = {...original, mappingId: 36, physicalSources: [{...original.physicalSources[0], physicalName: 'orders.csv'}]};
        mappings.getMappings.and.returnValue(of({mappings: [...rows, anotherTarget, otherAdapter, otherNamespace, otherTable]}));
        mappings.getSources.and.returnValue(of({sources: [
            {adapterId: 7, adapterName: 'csv_source', targetEntityId: 50, namespaceName: 'files', logicalTableName: 'customers.csv', kind: 'PHYSICAL_TO_LOGICAL', sourceAllocationId: 60},
            {adapterId: 8, adapterName: 'other_csv', targetEntityId: 52, namespaceName: 'files', logicalTableName: 'customers.csv', kind: 'PHYSICAL_TO_LOGICAL', sourceAllocationId: 62}
        ]}));
        query.next(convertToParamMap({sourceNamespace: 'files', sourceTable: 'customers.csv'}));
        params.next(convertToParamMap({sourceAdapterId: '7'}));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.visibleMappings.map(mapping => mapping.mappingId)).toEqual([33, 31]);
        expect(fixture.nativeElement.querySelector('h1').textContent).toBe('customers.csv (source)');
        expect(fixture.nativeElement.querySelectorAll('table tbody tr').length).toBe(2);
        const archiveRow: HTMLTableRowElement = fixture.nativeElement.querySelector('table tbody tr');
        expect(archiveRow.querySelector('.mapping-source a')).toBeNull();
        expect(archiveRow.querySelector('.mapping-source').textContent.trim()).toBe('files.customers.csv');
        expect(archiveRow.querySelector('.mapping-target a').getAttribute('href')).toBe('/views/schema-editing/public.customers_archive/mappings');
        const kind: HTMLSelectElement = fixture.nativeElement.querySelector('#create-mapping-kind');
        expect(kind.selectedOptions[0].textContent.trim()).toBe('Physical to Logical');
        expect(kind.disabled).toBeTrue();
        expect(fixture.nativeElement.querySelector('#create-mapping-source').disabled).toBeTrue();
        expect(component.selectedSource).toBe('7:50:60');
        expect(component.mappingQuery()).toEqual({returnSourceAdapterId: 7, returnSourceNamespace: 'files', returnSourceTable: 'customers.csv'});
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const node = sidebar.setNodes.calls.mostRecent().args[0][0].children[0];
        node.action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/mappings', 33, 'edit'], {queryParams: component.mappingQuery()});
        navigate.calls.reset();
        component.create();
        expect(navigate).toHaveBeenCalledWith(['/views/mappings/create'], {queryParams: {
            adapterId: 7, targetEntityId: 50, sourceAllocationId: 60,
            returnSourceAdapterId: 7, returnSourceNamespace: 'files', returnSourceTable: 'customers.csv'
        }});
        mappings.getMappings.and.returnValue(of({mappings: [anotherTarget]}));
        mappings.getSources.and.returnValue(of({sources: [{adapterId: 7, adapterName: 'csv_source', targetEntityId: 55,
            namespaceName: 'files', logicalTableName: 'customers.csv', kind: 'PHYSICAL_TO_LOGICAL', sourceAllocationId: 61}]}));
        component.refresh();
        fixture.detectChanges();
        expect(component.visibleMappings.map(mapping => mapping.mappingId)).toEqual([33]);
        expect(component.selectedSource).toBe('7:55:61');
        expect(component.canCreate).toBeTrue();
    });

    it('keeps the source target list available when creation sources cannot be loaded', () => {
        mappings.getSources.and.returnValue(throwError(() => ({error: {code: 'SOURCE_UNAVAILABLE', message: 'Source unavailable'}})));
        query.next(convertToParamMap({sourceNamespace: 'files', sourceTable: 'customers.csv'}));
        params.next(convertToParamMap({sourceAdapterId: '7'}));
        fixture.detectChanges();
        expect(component.loadError).toBeNull();
        expect(component.sourceError).toBe('Source unavailable');
        expect(component.visibleMappings.map(mapping => mapping.mappingId)).toEqual([31]);
        expect(component.canCreate).toBeFalse();
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    });

    it('rejects invalid or incomplete physical source links without fetching mappings', () => {
        for (const sourceAdapterId of ['bad', '7', '9007199254740992']) {
            mappings.getMappings.calls.reset();
            params.next(convertToParamMap({sourceAdapterId}));
            fixture.detectChanges();
            expect(component.loadError).toBe('The physical source is invalid.');
            expect(mappings.getMappings).not.toHaveBeenCalled();
            expect(fixture.nativeElement.querySelector('form')).toBeNull();
        }
    });

    it('clears the source filter when navigating back to the general mapping kind', () => {
        query.next(convertToParamMap({sourceNamespace: 'files', sourceTable: 'customers.csv'}));
        params.next(convertToParamMap({sourceAdapterId: '7'}));
        fixture.detectChanges();
        expect(component.sourceTargets).toBeTrue();
        params.next(convertToParamMap({kind: 'PHYSICAL_TO_LOGICAL'}));
        fixture.detectChanges();
        expect(component.sourceTargets).toBeFalse();
        expect(component.mappingQuery()).toBeNull();
        expect(fixture.nativeElement.querySelector('#create-mapping-source').disabled).toBeFalse();
    });

    it('shows mapping management cards and puts mapping navigation in the shared sidebar', () => {
        expect(mappings.getMappings).toHaveBeenCalledWith(7);
        expect(mappings.getSources).toHaveBeenCalledWith(7);
        expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Mappings');
        expect(fixture.nativeElement.textContent).toContain('Create Mapping');
        expect(fixture.nativeElement.textContent).toContain('Drop Mapping');
        expect(fixture.nativeElement.querySelector('table')).toBeNull();
        const nodes = sidebar.setNodes.calls.mostRecent().args[0];
        expect(nodes.map(node => node.name)).toEqual(['Physical to Logical', 'Logical to Logical']);
        expect(nodes[0].children.map(node => node.name)).toEqual(['Customer import']);
        expect(nodes[1].children.map(node => node.name)).toEqual(['Orders']);
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        nodes[0].children[0].action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/mappings', 31, 'edit']);
        nodes[1].children[0].action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/mappings', 32]);
    });

    it('groups mappings of the same kind together across namespaces and orders groups by mapping kind', () => {
        mappings.getMappings.and.returnValue(of({mappings: [rows[1],
            {...rows[0], mappingId: 33, namespaceName: 'analytics', mappingName: 'Other import'}, rows[0],
            {...rows[0], mappingId: 34, mappingName: 'API mapping', kind: 'LOGICAL_TO_EXPOSED'}]}));
        component.refresh();
        const nodes = sidebar.setNodes.calls.mostRecent().args[0];
        expect(nodes.map(node => node.name)).toEqual(['Physical to Logical', 'Logical to Logical', 'Logical to Exposed']);
        expect(nodes[0].children.map(node => node.name)).toEqual(['Customer import', 'Other import']);
        expect(nodes[1].children.map(node => node.name)).toEqual(['Orders']);
        expect(nodes[2].children.map(node => node.name)).toEqual(['API mapping']);
    });

    it('opens the kind view from the group label without collapsing it', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const group = sidebar.setNodes.calls.mostRecent().args[0][0];
        expect(group.isAutoExpand()).toBeFalse();
        expect(group.isAutoActive()).toBeFalse();
        group.action(null, null, null);
        expect(navigate).toHaveBeenCalledOnceWith(['/views/mappings/kind', 'PHYSICAL_TO_LOGICAL']);
    });

    it('lists only mappings of the selected kind with their metadata and creation below', async () => {
        params.next(convertToParamMap({kind: 'PHYSICAL_TO_LOGICAL'}));
        fixture.detectChanges();
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('h1').textContent).toBe('Physical to Logical');
        const table = root.querySelector('table');
        expect(table.querySelectorAll('tbody tr').length).toBe(1);
        expect(table.textContent).toContain('Customer import');
        expect(table.textContent).toContain('csv_source');
        expect(table.textContent).toContain('files.customers.csv');
        expect(table.textContent).toContain('public.customers');
        expect(table.textContent).toContain('Relational to Relational');
        expect(table.textContent).not.toContain('Orders');
        expect(table.querySelector('a').getAttribute('href')).toBe('/views/mappings/31/edit');
        expect(table.querySelector('.mapping-source a').getAttribute('href')).toBe('/views/mappings/source/7?sourceNamespace=files&sourceTable=customers.csv');
        expect(table.querySelector('.mapping-target a').getAttribute('href')).toBe('/views/schema-editing/public.customers/mappings');
        const cards = root.querySelector('c-card');
        expect(table.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(root.querySelector('#create-mapping-kind')).toBeNull();
        expect(root.querySelector('#drop-mapping')).toBeNull();
        expect(root.querySelectorAll('c-card').length).toBe(1);
        expect(root.querySelector('c-card-header').textContent).toBe('Create Mapping');
        expect(table.querySelector('button').textContent).toBe('');
        expect(table.querySelector('button .cil-trash')).not.toBeNull();
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].cssClass).toBe('node-content-wrapper-active');
        component.selectedSource = '7:51';
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        component.create();
        expect(navigate).toHaveBeenCalledWith(['/views/mappings/create'], {queryParams: {adapterId: 7, targetEntityId: 51}});
    });

    it('updates the list and clears form selections when navigating between kind views', async () => {
        params.next(convertToParamMap({kind: 'PHYSICAL_TO_LOGICAL'}));
        component.selectedSource = '7:51';
        component.selectedId = 31;
        params.next(convertToParamMap({kind: 'LOGICAL_TO_LOGICAL'}));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.selectedId).toBeNull();
        expect(component.selectedSource).toBe('');
        expect(component.selectedKind).toBe('LOGICAL_TO_LOGICAL');
        const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
        expect(table.textContent).toContain('Orders');
        expect(table.textContent).not.toContain('Customer import');
        expect(table.querySelector('a').getAttribute('href')).toBe('/views/mappings/32');
        expect(fixture.nativeElement.querySelector('#create-mapping-source').disabled).toBeTrue();
    });

    it('keeps an empty kind accessible with creation controls and no stale rows', async () => {
        mappings.getMappings.and.returnValue(of({mappings: []}));
        params.next(convertToParamMap({kind: 'PHYSICAL_TO_LOGICAL'}));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(fixture.nativeElement.textContent).toContain('No mappings are registered for this mapping kind.');
        expect(fixture.nativeElement.querySelector('table')).toBeNull();
        expect(fixture.nativeElement.querySelector('#create-mapping-source').disabled).toBeFalse();
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].name).toBe('Physical to Logical');
    });

    it('rejects an unknown mapping kind without fetching or offering creation', () => {
        mappings.getMappings.calls.reset();
        params.next(convertToParamMap({kind: 'UNKNOWN'}));
        fixture.detectChanges();
        expect(component.loadError).toBe('The mapping kind is invalid.');
        expect(mappings.getMappings).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('drops the chosen row only after confirmation, using its current revision', async () => {
        const removable = {...rows[0], mappingId: 33, mappingName: 'Second import', removable: true,
            revision: 'second-revision', removalBlockedReason: null};
        mappings.getMappings.and.returnValue(of({mappings: [...rows, removable]}));
        params.next(convertToParamMap({kind: 'PHYSICAL_TO_LOGICAL'}));
        fixture.detectChanges();
        await fixture.whenStable();
        const drop: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Drop Second import"]');
        expect(drop.querySelector('.cil-trash')).not.toBeNull();
        expect(drop.querySelector('.fa-warning')).toBeNull();
        drop.click();
        fixture.detectChanges();
        expect(drop.querySelector('.fa-warning')).toBeNull();
        expect(component.removal.mappingId).toBe(33);
        expect(mappings.remove).not.toHaveBeenCalled();
        component.closeRemoval();
        expect(component.removal).toBeNull();
        expect(drop.querySelector('.cil-trash')).not.toBeNull();
        drop.click();
        mappings.remove.and.returnValue(of({removed: true}));
        mappings.getMappings.and.returnValue(of({mappings: rows}));
        component.remove();
        fixture.detectChanges();
        expect(mappings.remove).toHaveBeenCalledOnceWith(33, 'second-revision');
        expect(fixture.nativeElement.querySelector('button[aria-label="Drop Second import"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('button[aria-label="Drop Customer import"]')).not.toBeNull();
    });

    it('shows the triangle only after a blocked attempt, without a message, and resets when permissions reload', () => {
        params.next(convertToParamMap({kind: 'PHYSICAL_TO_LOGICAL'}));
        fixture.detectChanges();
        const drop: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Drop Customer import"]');
        expect(drop.querySelector('.cil-trash')).not.toBeNull();
        drop.click();
        fixture.detectChanges();
        expect(drop.querySelector('.fa-warning')).not.toBeNull();
        expect(drop.querySelector('.cil-trash')).toBeNull();
        expect(drop.parentElement.title).toBe('');
        expect(drop.parentElement.textContent).not.toContain(lastSourceMappingReason);
        drop.click();
        component.confirmRemoval(31);
        component.confirmRemoval(32);
        component.confirmRemoval(999);
        expect(component.removal).toBeUndefined();
        expect(mappings.remove).not.toHaveBeenCalled();
        drop.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();
        expect(drop.querySelector('.cil-trash')).not.toBeNull();
        drop.click();
        mappings.getMappings.and.returnValue(of({mappings: [{...rows[0], removable: true, removalBlockedReason: null}]}));
        component.refresh();
        fixture.detectChanges();
        const reloaded: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Drop Customer import"]');
        expect(reloaded.querySelector('.cil-trash')).not.toBeNull();
        reloaded.click();
        fixture.detectChanges();
        expect(reloaded.querySelector('.fa-warning')).toBeNull();
        expect(component.removal.mappingId).toBe(31);
        expect(mappings.remove).not.toHaveBeenCalled();
    });

    it('opens the shared creation editor only for a currently available source', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        component.create();
        expect(navigate).not.toHaveBeenCalled();
        component.selectedSource = '7:51';
        component.create();
        expect(navigate).toHaveBeenCalledOnceWith(['/views/mappings/create'], {queryParams: {adapterId: 7, targetEntityId: 51}});
        mappings.getSources.and.returnValue(of({sources: []}));
        component.refresh();
        expect(component.selectedSource).toBe('');
        component.create();
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('preserves the list on cancellation and sends the selected revision only after confirmation', () => {
        const removable: MappingSummary = {...rows[0], mappingId: 33, kind: 'LOGICAL_TO_LOGICAL', removable: true, removalBlockedReason: null};
        mappings.getMappings.and.returnValue(of({mappings: [...rows, removable]}));
        component.refresh();
        component.selectedId = 33;
        component.confirmRemoval();
        component.closeRemoval();
        expect(mappings.remove).not.toHaveBeenCalled();
        component.confirmRemoval();
        mappings.remove.and.returnValue(of({removed: true}));
        mappings.getMappings.and.returnValue(of({mappings: [rows[1]]}));
        component.remove();
        expect(mappings.remove).toHaveBeenCalledOnceWith(33, 'original');
        expect(component.rows).toEqual([rows[1]]);
        expect(component.selectedId).toBeNull();
    });

    it('keeps revision conflicts visible and does not retry removal automatically', () => {
        const removable: MappingSummary = {...rows[0], mappingId: 33, kind: 'LOGICAL_TO_LOGICAL', removable: true, removalBlockedReason: null};
        mappings.getMappings.and.returnValue(of({mappings: [...rows, removable]}));
        component.refresh();
        component.selectedId = 33;
        component.confirmRemoval();
        mappings.remove.and.returnValue(throwError(() => ({status: 409, error: {code: 'REVISION_CONFLICT', message: 'Reload this mapping'}})));
        component.remove();
        component.remove();
        expect(mappings.remove).toHaveBeenCalledTimes(1);
        expect(component.removeError.code).toBe('REVISION_CONFLICT');
        expect(component.rows.length).toBe(3);
    });

    it('does not offer removal for read-only definitions', () => {
        component.selectedId = 32;
        component.confirmRemoval();
        expect(component.removal).toBeUndefined();
        expect(mappings.remove).not.toHaveBeenCalled();
    });

    it('lists only mapping names without a placeholder and explains why the last source mapping cannot be dropped', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        const select: HTMLSelectElement = fixture.nativeElement.querySelector('#drop-mapping');
        expect(Array.from(select.options).filter(option => !option.hidden).map(option => option.textContent.trim())).toEqual(['Customer import', 'Orders']);
        expect(select.selectedOptions[0].textContent.trim()).toBe('');
        component.selectedId = 31;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('label[for="drop-mapping"]').textContent).toBe('Name');
        expect(fixture.nativeElement.querySelector('#drop-mapping-reason').textContent).toContain(lastSourceMappingReason);
        expect(select.closest('form').querySelector<HTMLButtonElement>('button[type="submit"]').disabled).toBeTrue();
        component.confirmRemoval();
        expect(component.removal).toBeUndefined();
        expect(mappings.remove).not.toHaveBeenCalled();
    });

    it('shows an empty disabled selector when there are no mappings', async () => {
        mappings.getMappings.and.returnValue(of({mappings: []}));
        component.refresh();
        fixture.detectChanges();
        await fixture.whenStable();
        const select: HTMLSelectElement = fixture.nativeElement.querySelector('#drop-mapping');
        expect(Array.from(select.options).filter(option => !option.hidden).length).toBe(0);
        expect(select.disabled).toBeTrue();
        expect(component.selectedId).toBeNull();
    });

    it('opens mapping management with a blank drop selection after leaving it', async () => {
        component.selectedId = 32;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.destroy();
        fixture = TestBed.createComponent(MappingManagementComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.selectedId).toBeNull();
        expect(fixture.nativeElement.querySelector('#drop-mapping').selectedOptions[0].textContent.trim()).toBe('');
    });

    it('filters sources by mapping kind, clears the previous source and uses shared kind labels', async () => {
        const physical = {adapterId: 7, adapterName: 'csv_source', targetEntityId: 51,
            namespaceName: 'public', logicalTableName: 'customers', kind: 'PHYSICAL_TO_LOGICAL' as const};
        const logical = {...physical, targetEntityId: 52, logicalTableName: 'logical_customers', kind: 'LOGICAL_TO_LOGICAL' as const};
        mappings.getSources.and.returnValue(of({sources: [physical, logical]}));
        component.refresh();
        fixture.detectChanges();
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        const kinds: HTMLSelectElement = root.querySelector('#create-mapping-kind');
        const source: HTMLSelectElement = root.querySelector('#create-mapping-source');
        expect(Array.from(kinds.options, option => option.textContent.trim())).toEqual(['Physical to Logical', 'Logical to Logical', 'Logical to Exposed']);
        expect(Array.from(source.options).filter(option => !option.hidden).map(option => option.textContent.trim())).toEqual(['public.customers (csv_source)']);
        component.selectedSource = '7:51';
        kinds.value = kinds.options[1].value;
        kinds.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.selectedSource).toBe('');
        expect(component.createSource).toBeUndefined();
        expect(Array.from(source.options).filter(option => !option.hidden).map(option => option.textContent.trim())).toEqual(['public.logical_customers (csv_source)']);
        component.selectKind('LOGICAL_TO_EXPOSED');
        fixture.detectChanges();
        await fixture.whenStable();
        expect(source.disabled).toBeTrue();
        expect(root.textContent).toContain('No source entities are available for this mapping kind.');
    });

    it('embeds the shared list for a target across kinds without changing Schema navigation', () => {
        fixture.destroy();
        sidebar.setNodes.calls.reset();
        sidebar.close.calls.reset();
        mappings.getMappings.and.returnValue(of({mappings: [rows[0], {...rows[1], targetEntityId: 51}]}));
        const breadcrumbs = spyOn(TestBed.inject(BreadcrumbService), 'setBreadcrumbs');
        fixture = TestBed.createComponent(MappingManagementComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('targetEntityId', 50);
        fixture.detectChanges();
        expect(mappings.getMappings).toHaveBeenCalledWith(undefined, 50);
        expect(mappings.getSources).toHaveBeenCalledWith(undefined, 50);
        expect(component.visibleMappings.map(mapping => mapping.mappingId)).toEqual([31]);
        expect(fixture.nativeElement.querySelector('h1')).toBeNull();
        expect(fixture.nativeElement.querySelector('table thead').textContent).toContain('Mapping Kind');
        expect(fixture.nativeElement.textContent).not.toContain('Drop Mapping');
        expect(fixture.nativeElement.textContent).not.toContain('Target:');
        expect(sidebar.setNodes).not.toHaveBeenCalled();
        expect(breadcrumbs).not.toHaveBeenCalled();
        expect(component.mappingQuery()).toEqual({returnTargetEntityId: 50});
        const row: HTMLTableRowElement = fixture.nativeElement.querySelector('table tbody tr');
        expect(row.querySelector('a').getAttribute('href')).toBe('/views/mappings/31/edit?returnTargetEntityId=50');
        expect(row.querySelector('.mapping-source a').getAttribute('href')).toBe('/views/mappings/source/7?sourceNamespace=files&sourceTable=customers.csv');
        expect(row.querySelector('.mapping-target a')).toBeNull();
        expect(row.querySelector('.mapping-target').textContent.trim()).toBe('public.customers');
        fixture.destroy();
        expect(sidebar.close).not.toHaveBeenCalled();
    });

    it('passes the current table as a fixed target when creating from its tab', () => {
        component.targetEntityId = 50;
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        component.selectedSource = '7:51';
        component.create();
        expect(navigate).toHaveBeenCalledWith(['/views/mappings/create'], {queryParams: {
            adapterId: 7, targetEntityId: 51, existingTargetEntityId: 50, returnTargetEntityId: 50
        }});
    });

    it('explains that dropping one of several incoming mappings preserves the target', () => {
        rows[0] = {...rows[0], removable: true, removesTarget: false};
        component.targetEntityId = 50;
        component.refresh();
        component.confirmRemoval(31);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('The target table and its remaining mappings will be preserved.');
        expect(fixture.nativeElement.textContent).not.toContain('The logical target table will be removed.');
    });

    it('distinguishes a failed load from an empty list and supports retry', () => {
        mappings.getMappings.and.returnValue(throwError(() => ({status: 0})));
        component.refresh();
        expect(component.loadError).toContain('Cannot reach');
        mappings.getMappings.and.returnValue(of({mappings: []}));
        component.refresh();
        expect(component.loadError).toBeNull();
        expect(component.rows).toEqual([]);
    });
});

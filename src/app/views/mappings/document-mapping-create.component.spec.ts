import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {provideRouter, Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {of} from 'rxjs';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {NamespaceModel} from '../../models/catalog.model';
import {DataModel} from '../../models/ui-request.model';
import {CatalogService} from '../../services/catalog.service';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {DocumentMappingCreateComponent} from './document-mapping-create.component';
import {DocumentMappingDetailComponent} from './document-mapping-detail.component';
import {MappingSummary} from './mapping.model';
import {MappingUnsavedChangesGuard} from './mapping-unsaved-changes.guard';

@Component({standalone: true, template: 'Mappings'})
class MappingsStubComponent {}

describe('DocumentMappingCreateComponent', () => {
    const source = {adapterId: 7, adapterName: 'json_source', sourceEntityId: 30, sourceAllocationId: 60, namespaceName: 'files', physicalName: 'customers'};
    const alternateSource = {...source, sourceEntityId: 31, sourceAllocationId: 61, namespaceName: 'other'};
    const draft = {mappingId: -1, targetModel: DataModel.DOCUMENT, namespaceId: 2, namespaceName: 'files', mappingName: 'Customers mapping',
        logicalCollectionName: 'customers_mapped', revision: 'draft-1', rules: [{type: 'DOCUMENT_COPY_ENTIRE'}],
        validation: {identifierPattern: '[a-zA-Z_][a-zA-Z0-9_]*', identifierMaxLength: 100, mappingNameMaxLength: 255,
            identifierMessage: 'Use a valid identifier.', mappingNameMessage: 'Enter a mapping name up to 255 characters.'}};
    const existingMapping: MappingSummary = {
        mappingId: 52, adapterId: 7, adapterName: 'json_source', mappingName: 'Customer import',
        kind: 'PHYSICAL_TO_LOGICAL', targetEntityId: 30, sourceModel: DataModel.DOCUMENT, targetModel: DataModel.DOCUMENT,
        namespaceName: 'files', logicalTableName: 'customers', editable: true, removable: false, removesTarget: false,
        physicalSources: [{namespaceName: 'files', physicalName: 'customers', allocationId: 60, physicalEntityId: 70}]
    };
    let http: HttpTestingController;
    let getSnapshot: jasmine.Spy;
    let setBreadcrumbs: jasmine.Spy;
    let sidebar: jasmine.SpyObj<LeftSidebarService>;

    beforeEach(() => {
        getSnapshot = jasmine.createSpy('getSnapshot').and.returnValue(of(null));
        setBreadcrumbs = jasmine.createSpy('setBreadcrumbs');
        sidebar = jasmine.createSpyObj('LeftSidebarService', ['close', 'open', 'setNodes', 'setTopButtons', 'reset']);
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                provideRouter([
                    {path: 'views/mappings', component: MappingsStubComponent},
                    {path: 'views/schema-editing/:id/mappings', component: MappingsStubComponent},
                    {path: 'views/mappings/document/create', component: DocumentMappingCreateComponent,
                        canDeactivate: [MappingUnsavedChangesGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange'},
                    {path: 'views/mappings/document/:mappingId', component: DocumentMappingDetailComponent,
                        canDeactivate: [MappingUnsavedChangesGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange'},
                    {path: 'views/adapters/:adapterId/mappings/document/create', component: DocumentMappingCreateComponent,
                        canDeactivate: [MappingUnsavedChangesGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange'}
                ]),
                {provide: WebuiSettingsService, useValue: {getConnection: () => '/api'}},
                {provide: CatalogService, useValue: {getSnapshot, listener: signal(null), adapters: signal(new Map()),
                    entities: signal(new Map([
                        [30, {id: 30, name: 'customers', namespaceId: 2, dataModel: DataModel.DOCUMENT}],
                        [31, {id: 31, name: 'orders', namespaceId: 3, dataModel: DataModel.DOCUMENT}]
                    ])),
                    namespaces: signal(new Map<number, NamespaceModel>([
                    [1, {id: 1, name: 'public', dataModel: DataModel.RELATIONAL, caseSensitive: false}],
                    [2, {id: 2, name: 'files', dataModel: DataModel.DOCUMENT, caseSensitive: false}],
                    [3, {id: 3, name: 'reports', dataModel: DataModel.DOCUMENT, caseSensitive: true}],
                    [4, {id: 4, name: 'graph', dataModel: DataModel.GRAPH, caseSensitive: false}]
                ]))}},
                {provide: BreadcrumbService, useValue: {setBreadcrumbs, hide: () => {}}},
                {provide: LeftSidebarService, useValue: sidebar},
                {provide: ToasterService, useValue: {success: () => {}, warn: () => {}}}
            ],
            teardown: {destroyAfterEach: true}
        });
        http = TestBed.inject(HttpTestingController);
    });

    it('keeps the adapter navigation and opens with the collection selected from its mapping list', async () => {
        const harness = await RouterTestingHarness.create('/views/adapters/7/mappings/document/create?sourceEntityId=30&sourceAllocationId=60');
        http.expectOne('/api/getMappings').flush({mappings: [existingMapping, {...existingMapping, adapterId: 8, mappingId: 61,
            mappingName: 'Orders', sourceModel: DataModel.RELATIONAL, targetModel: DataModel.RELATIONAL}]});
        const summariesRequest = http.expectOne('/api/getAdapterMappings');
        expect(summariesRequest.request.body).toEqual({adapterIds: [7]});
        summariesRequest.flush({adapters: [{adapterId: 7, adapterName: 'json_source', mappings: [existingMapping]}]});
        const [adapterNode] = sidebar.setNodes.calls.mostRecent().args[0];
        expect(sidebar.open).toHaveBeenCalled();
        expect(adapterNode.name).toBe('json_source');
        expect(adapterNode.cssClass).toBe('node-content-wrapper-active');
        expect(adapterNode.children.map(node => node.name)).toEqual(['Customer import']);

        const sourcesRequest = http.expectOne('/api/getDocumentMappingSources');
        expect(sourcesRequest.request.body).toEqual({adapterId: 7});
        sourcesRequest.flush({sources: [alternateSource, source]});
        const draftRequest = http.expectOne('/api/getDocumentMappingDraft');
        expect(draftRequest.request.body).toEqual({adapterId: 7, sourceEntityId: 30, sourceAllocationId: 60});
        draftRequest.flush(draft);
        harness.detectChanges();

        const view = harness.routeNativeElement;
        expect(view.querySelector('h1').textContent).toBe('Create Mapping');
        expect(view.querySelector('c-card-header').textContent).toContain('Customers mapping');
        expect(view.querySelector('[aria-label="Source"]').textContent).toContain('customers');
        expect(view.querySelector('#document-mapping-create-source')).toBeNull();
        const namespace = view.querySelector<HTMLSelectElement>('#document-mapping-create-namespace');
        expect(namespace.disabled).toBeTrue();
        expect(Array.from(namespace.options, option => option.text)).toEqual(['files']);
        const rule = view.querySelector<HTMLSelectElement>('#document-mapping-create-rule');
        expect(Array.from(rule.options, option => option.text)).toEqual(['Copy entire document']);
        const breadcrumbs = setBreadcrumbs.calls.mostRecent().args[0];
        expect(breadcrumbs.map(item => item.name)).toEqual(['Adapters', 'json_source Mappings', 'Create Mapping']);
        expect(breadcrumbs[0].routerLink).toBe('/views/adapters');
        expect(breadcrumbs[1].routerLink).toEqual(['/views/adapters', 7, 'mappings', 'list']);
        expect(harness.routeNativeElement.querySelector('a')).toBeNull();

        view.querySelector<HTMLButtonElement>('button[aria-label="Rename mapping"]').click();
        harness.detectChanges();
        const mappingName = view.querySelector<HTMLInputElement>('#document-mapping-create-name');
        const rename = view.querySelector<HTMLButtonElement>('.mapping-name-input button');
        mappingName.value = ' orders ';
        mappingName.dispatchEvent(new Event('input'));
        harness.detectChanges();
        expect(view.querySelector('#document-mapping-name-error').textContent).toContain('A mapping with this name already exists.');
        expect(rename.disabled).toBeTrue();
        expect(view.querySelector<HTMLButtonElement>('button[type="submit"]').disabled).toBeTrue();
        submit(harness);
        http.expectNone('/api/createDocumentMapping');
        mappingName.value = draft.mappingName;
        mappingName.dispatchEvent(new Event('input'));
        harness.detectChanges();
        expect(rename.disabled).toBeFalse();
        rename.click();
        harness.detectChanges();

        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        adapterNode.action(null, null, null);
        adapterNode.children[0].action(null, null, null);
        expect(navigate.calls.allArgs()).toEqual([
            [['/views/adapters', 7, 'mappings', 'list']],
            [['/views/adapters', 7, 'mappings', 'document', 52]]
        ]);
        navigate.calls.reset();
        submit(harness);
        const createRequest = http.expectOne('/api/createDocumentMapping');
        expect(createRequest.request.body).toEqual(jasmine.objectContaining({adapterId: 7, sourceEntityId: 30,
            sourceAllocationId: 60, targetNamespaceId: 2}));
        createRequest.flush({...draft, mappingId: 53, adapterId: 7});
        expect(navigate).toHaveBeenCalledOnceWith(['/views/adapters', 7, 'mappings', 'document', 53],
            {queryParams: null, replaceUrl: true});
        harness.fixture.destroy();
        expect(sidebar.close).toHaveBeenCalledTimes(1);
    });

    afterEach(() => http.verify());

    function select(harness: RouterTestingHarness, id: string, label: string) {
        const selectElement = harness.routeNativeElement.querySelector<HTMLSelectElement>(`#document-mapping-create-${id}`);
        selectElement.selectedIndex = Array.from(selectElement.options).findIndex(option => option.textContent.trim() === label);
        expect(selectElement.selectedIndex).toBeGreaterThanOrEqual(0);
        selectElement.dispatchEvent(new Event('change'));
        harness.detectChanges();
    }

    function setCollection(harness: RouterTestingHarness, name: string) {
        const input = harness.routeNativeElement.querySelector<HTMLInputElement>('#document-mapping-create-collection');
        input.value = name;
        input.dispatchEvent(new Event('input'));
        harness.detectChanges();
    }

    function submit(harness: RouterTestingHarness) {
        harness.routeNativeElement.querySelector<HTMLButtonElement>('button[type="submit"]').click();
        harness.detectChanges();
    }

    it('creates an entire-document mapping in another document namespace and opens its details', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/create');
        http.expectNone('/api/getAdapterMappings');
        const breadcrumbs = setBreadcrumbs.calls.mostRecent().args[0];
        expect(breadcrumbs.map(item => item.name)).toEqual(['Mappings', 'Physical to Logical', 'Create Mapping']);
        expect(breadcrumbs[0].routerLink).toEqual(['/views/mappings']);
        expect(breadcrumbs[1].routerLink).toEqual(['/views/mappings/kind', 'PHYSICAL_TO_LOGICAL']);
        const mappingList = http.expectOne('/api/getMappings');
        expect(mappingList.request.body).toEqual({});
        mappingList.flush({mappings: [existingMapping, {...existingMapping, mappingId: 40, mappingName: 'Orders',
            sourceModel: DataModel.RELATIONAL, targetModel: DataModel.RELATIONAL}]});
        const [kindNode] = sidebar.setNodes.calls.mostRecent().args[0];
        expect(sidebar.open).toHaveBeenCalled();
        expect(kindNode.name).toBe('Physical to Logical');
        expect(kindNode.children.map(node => node.name)).toEqual(['Customer import', 'Orders']);
        expect(kindNode.children.every(node => node.cssClass === '')).toBeTrue();
        const sourcesRequest = http.expectOne('/api/getDocumentMappingSources');
        expect(sourcesRequest.request.body).toEqual({});
        sourcesRequest.flush({sources: [source, alternateSource]});
        harness.detectChanges();

        const sourceSelect = harness.routeNativeElement.querySelector<HTMLSelectElement>('#document-mapping-create-source');
        expect(Array.from(sourceSelect.options, option => option.text)).toEqual(['files.customers (json_source)', 'other.customers (json_source)']);
        expect(sourceSelect.selectedIndex).toBe(0);
        const draftRequest = http.expectOne('/api/getDocumentMappingDraft');
        expect(draftRequest.request.body).toEqual({adapterId: 7, sourceEntityId: 30, sourceAllocationId: 60});
        draftRequest.flush(draft);
        harness.detectChanges();

        const names = Array.from(harness.routeNativeElement.querySelectorAll('#document-mapping-create-namespace option'))
            .map(option => option.textContent.trim());
        expect(names).toEqual(['files', 'reports']);
        expect(harness.routeNativeElement.querySelector<HTMLSelectElement>('#document-mapping-create-namespace').disabled).toBeFalse();
        expect(harness.routeNativeElement.textContent).toContain('Copy entire document');
        setCollection(harness, 'Customers');
        expect(harness.routeNativeElement.querySelector('#document-mapping-collection-error').textContent)
            .toContain('An entity with this name already exists in the namespace.');
        expect(harness.routeNativeElement.querySelector<HTMLButtonElement>('button[type="submit"]').disabled).toBeTrue();
        select(harness, 'namespace', 'reports');
        expect(harness.routeNativeElement.querySelector('#document-mapping-collection-error')).toBeNull();
        expect(harness.routeNativeElement.querySelector<HTMLButtonElement>('button[type="submit"]').disabled).toBeFalse();
        setCollection(harness, 'orders');
        expect(harness.routeNativeElement.querySelector('#document-mapping-collection-error')).not.toBeNull();
        setCollection(harness, 'Orders');
        expect(harness.routeNativeElement.querySelector('#document-mapping-collection-error')).toBeNull();
        setCollection(harness, '1invalid');
        expect(harness.routeNativeElement.querySelector('#document-mapping-collection-error').textContent).toContain('Use a valid identifier.');
        setCollection(harness, 'a'.repeat(101));
        expect(harness.routeNativeElement.querySelector('#document-mapping-collection-error').textContent).toContain('Use a valid identifier.');
        setCollection(harness, 'customer_archive');
        submit(harness);
        submit(harness);

        const createRequest = http.expectOne('/api/createDocumentMapping');
        expect(createRequest.request.body).toEqual({adapterId: 7, sourceEntityId: 30, sourceAllocationId: 60,
            expectedRevision: 'draft-1', targetNamespaceId: 3, logicalCollectionName: 'customer_archive', mappingName: 'Customers mapping'});
        const created = {...draft, mappingId: 52, kind: 'PHYSICAL_TO_LOGICAL', adapterId: 7, adapterName: 'json_source', namespaceName: 'reports',
            logicalCollectionName: 'customer_archive', physicalSources: [source]};
        createRequest.flush(created);
        await harness.fixture.whenStable();
        harness.detectChanges();

        expect(getSnapshot).toHaveBeenCalledTimes(1);
        expect(sidebar.close).toHaveBeenCalledTimes(1);
        expect(TestBed.inject(Router).url).toBe('/views/mappings/document/52');
        http.expectOne('/api/getMapping').flush(created);
        http.expectOne('/api/getMappings').flush({mappings: [created]});
        harness.detectChanges();
        expect(harness.routeNativeElement.querySelector<HTMLSelectElement>('#document-mapping-namespace').selectedOptions[0].text).toBe('reports');
        expect(harness.routeNativeElement.querySelector<HTMLInputElement>('#document-mapping-collection-name').value).toBe('customer_archive');
        expect(harness.routeNativeElement.textContent).toContain('Copy entire document');
    });

    it('uses the exact source from a source-filtered link and preserves target settings when reloading a stale draft', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/create?returnSourceAdapterId=7&returnSourceNamespace=files&returnSourceTable=customers');
        http.expectOne('/api/getMappings').flush({mappings: [existingMapping, {...existingMapping, mappingId: 41, mappingName: 'Other customers',
            physicalSources: [{...existingMapping.physicalSources[0], namespaceName: 'other'}]}]});
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].children.map(node => node.name)).toEqual(['Customer import']);
        const sourcesRequest = http.expectOne('/api/getDocumentMappingSources');
        expect(sourcesRequest.request.body).toEqual({adapterId: 7});
        sourcesRequest.flush({sources: [alternateSource, source]});
        const draftRequest = http.expectOne('/api/getDocumentMappingDraft');
        expect(draftRequest.request.body).toEqual({adapterId: 7, sourceEntityId: 30, sourceAllocationId: 60});
        draftRequest.flush(draft);
        harness.detectChanges();
        expect(harness.routeNativeElement.querySelector('#document-mapping-create-source')).toBeNull();

        select(harness, 'namespace', 'reports');
        setCollection(harness, 'customer_archive');
        submit(harness);
        http.expectOne('/api/createDocumentMapping').flush({code: 'REVISION', message: 'The draft is stale.'}, {status: 409, statusText: 'Conflict'});
        harness.detectChanges();
        expect(harness.routeNativeElement.querySelector('[role="alert"]').textContent).toContain('The draft is stale.');
        expect(harness.routeNativeElement.querySelector<HTMLButtonElement>('button[type="submit"]').disabled).toBeTrue();
        harness.routeNativeElement.querySelector<HTMLButtonElement>('[role="alert"] button').click();
        http.expectOne('/api/getDocumentMappingDraft').flush({...draft, revision: 'draft-2'});
        harness.detectChanges();

        submit(harness);
        const retry = http.expectOne('/api/createDocumentMapping');
        expect(retry.request.body).toEqual(jasmine.objectContaining({expectedRevision: 'draft-2', targetNamespaceId: 3, logicalCollectionName: 'customer_archive'}));
        retry.flush({code: 'VALIDATION', message: 'Fix the collection name.', fieldErrors: {logicalCollectionName: 'Name is already in use.'}},
            {status: 400, statusText: 'Bad Request'});
        harness.detectChanges();
        expect(harness.routeNativeElement.querySelector('#document-mapping-collection-error').textContent).toContain('Name is already in use.');
    });

    it('keeps the collection selected on the general mapping list and lets the user choose a target namespace', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/create?sourceEntityId=31&sourceAllocationId=61');
        http.expectOne('/api/getMappings').flush({mappings: [existingMapping]});
        http.expectOne('/api/getDocumentMappingSources').flush({sources: [source, alternateSource]});
        const draftRequest = http.expectOne('/api/getDocumentMappingDraft');
        expect(draftRequest.request.body).toEqual({adapterId: 7, sourceEntityId: 31, sourceAllocationId: 61});
        draftRequest.flush(draft);
        harness.detectChanges();

        const view = harness.routeNativeElement;
        expect(view.querySelector('#document-mapping-create-source')).toBeNull();
        expect(view.querySelector('[aria-label="Source"]').textContent).toContain('other');
        expect(view.querySelector<HTMLSelectElement>('#document-mapping-create-namespace').disabled).toBeFalse();
        expect(view.querySelector('#document-existing-target-info')).toBeNull();
    });

    it('creates a mapping for the fixed collection and returns to its Schema tab', async () => {
        const harness = await RouterTestingHarness.create(
            '/views/mappings/document/create?existingTargetEntityId=31&sourceEntityId=30&sourceAllocationId=60');
        http.expectOne('/api/getMappings').flush({mappings: [existingMapping]});
        const sourcesRequest = http.expectOne('/api/getDocumentMappingSources');
        expect(sourcesRequest.request.body).toEqual({targetEntityId: 31});
        sourcesRequest.flush({sources: [source]});
        const draftRequest = http.expectOne('/api/getDocumentMappingDraft');
        expect(draftRequest.request.body).toEqual({adapterId: 7, sourceEntityId: 30, sourceAllocationId: 60, existingTargetEntityId: 31});
        const fixedDraft = {...draft, fixedTargetEntityId: 31, targetEntityId: 31, namespaceId: 3,
            namespaceName: 'reports', logicalCollectionName: 'orders'};
        draftRequest.flush(fixedDraft);
        harness.detectChanges();

        const view = harness.routeNativeElement;
        const notice = view.querySelector('#document-existing-target-info');
        expect(notice.textContent.trim()).toBe('This mapping uses an existing target collection. Its namespace, name, and mapping rules are fixed.');
        expect(notice.previousElementSibling).toBe(view.querySelector('[aria-label="Target"]'));
        expect(view.querySelector<HTMLSelectElement>('#document-mapping-create-namespace').disabled).toBeTrue();
        const collection = view.querySelector<HTMLInputElement>('#document-mapping-create-collection');
        expect(collection.disabled).toBeTrue();
        expect(collection.value).toBe('orders');
        submit(harness);
        const createRequest = http.expectOne('/api/createDocumentMapping');
        expect(createRequest.request.body).toEqual(jasmine.objectContaining({
            existingTargetEntityId: 31, targetNamespaceId: 3, logicalCollectionName: 'orders'
        }));
        createRequest.flush({...fixedDraft, mappingId: 53, adapterId: 7});
        await harness.fixture.whenStable();
        expect(TestBed.inject(Router).url).toBe('/views/schema-editing/reports.orders/mappings');
    });

    it('keeps the draft when Cancel is rejected and returns to the mapping list when confirmed', async () => {
        const createUrl = '/views/mappings/document/create';
        const harness = await RouterTestingHarness.create(createUrl);
        const router = TestBed.inject(Router);
        http.expectOne('/api/getMappings').flush({mappings: [existingMapping]});
        http.expectOne('/api/getDocumentMappingSources').flush({sources: [source]});
        http.expectOne('/api/getDocumentMappingDraft').flush(draft);
        harness.detectChanges();
        const editor = harness.routeDebugElement.componentInstance as DocumentMappingCreateComponent;
        expect(editor.canDeactivate()).toBeTrue();
        setCollection(harness, 'unsaved_collection');

        const cancel = harness.routeNativeElement.querySelector<HTMLButtonElement>('.editor-actions button');
        cancel.click();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        harness.detectChanges();
        const dialog = harness.routeNativeElement.querySelector('c-modal:not([aria-hidden])');
        expect(dialog.textContent).toContain('Discard unsaved changes?');
        dialog.querySelector<HTMLButtonElement>('c-modal-footer button:first-child').click();
        await harness.fixture.whenStable();
        expect(router.url).toBe(createUrl);
        expect(editor.target.controls.logicalCollectionName.value).toBe('unsaved_collection');

        cancel.click();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        harness.detectChanges();
        harness.routeNativeElement.querySelector<HTMLButtonElement>('c-modal:not([aria-hidden]) c-modal-footer button:last-child').click();
        await harness.fixture.whenStable();
        expect(router.url).toBe('/views/mappings');
        http.expectNone('/api/createDocumentMapping');
    });
});

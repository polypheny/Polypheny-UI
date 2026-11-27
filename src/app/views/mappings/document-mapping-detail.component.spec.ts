import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {provideRouter, Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {of} from 'rxjs';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {DataModel} from '../../models/ui-request.model';
import {CatalogService} from '../../services/catalog.service';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {DocumentMappingDetailComponent} from './document-mapping-detail.component';
import {MappingUnsavedChangesGuard} from './mapping-unsaved-changes.guard';

@Component({standalone: true, template: 'Mapping list'})
class MappingListStubComponent {}

describe('DocumentMappingDetailComponent', () => {
    const detail = {
        mappingId: 31, mappingName: 'Customer documents', adapterId: 7, adapterName: 'json_source',
        sourceModel: DataModel.DOCUMENT, targetModel: DataModel.DOCUMENT, kind: 'PHYSICAL_TO_LOGICAL', namespaceName: 'reports', logicalCollectionName: 'archive',
        namespaceId: 3, targetEntityId: 70, namespaceCaseSensitive: false,
        physicalSources: [{namespaceName: 'files', physicalName: 'customers.json'}],
        validation: {identifierPattern: '[a-zA-Z_][a-zA-Z0-9_]*', identifierMaxLength: 100, mappingNameMaxLength: 255,
            identifierMessage: 'Use a valid identifier.', mappingNameMessage: 'Enter a mapping name up to 255 characters.'},
        rules: [{type: 'DOCUMENT_COPY_ENTIRE'}], revision: 'original', editable: true, removable: false, removalBlockedReason: 'The source needs one mapping.'
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
                    {path: 'views/mappings/source/:sourceAdapterId', component: MappingListStubComponent},
                    {path: 'views/schema-editing/:id/mappings', component: MappingListStubComponent},
                    {path: 'views/mappings/document/:mappingId', component: DocumentMappingDetailComponent,
                        canDeactivate: [MappingUnsavedChangesGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange'},
                    {path: 'views/adapters/:adapterId/mappings/document/:mappingId', component: DocumentMappingDetailComponent,
                        canDeactivate: [MappingUnsavedChangesGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange'}
                ]),
                {provide: WebuiSettingsService, useValue: {getConnection: () => '/api'}},
                {provide: CatalogService, useValue: {getSnapshot, listener: signal(null), adapters: signal(new Map()), namespaces: signal(new Map([
                    [1, {id: 1, name: 'public', dataModel: DataModel.RELATIONAL, caseSensitive: false}],
                    [3, {id: 3, name: 'reports', dataModel: DataModel.DOCUMENT, caseSensitive: false}],
                    [4, {id: 4, name: 'analytics', dataModel: DataModel.DOCUMENT, caseSensitive: false}]
                ])),
                    entities: signal(new Map([
                        [70, {id: 70, name: 'archive', namespaceId: 3, dataModel: DataModel.DOCUMENT}],
                        [71, {id: 71, name: 'orders', namespaceId: 3, dataModel: DataModel.DOCUMENT}]
                    ]))}},
                {provide: BreadcrumbService, useValue: {setBreadcrumbs, hide: () => {}}},
                {provide: LeftSidebarService, useValue: sidebar}
            ],
            teardown: {destroyAfterEach: true}
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function changeName(harness: RouterTestingHarness, id: string, value: string) {
        const input = harness.routeNativeElement.querySelector<HTMLInputElement>(`#${id}`);
        input.value = value;
        input.dispatchEvent(new Event('input'));
        harness.detectChanges();
    }

    function collectionName(view: HTMLElement): string {
        return view.querySelector<HTMLInputElement>('#document-mapping-collection-name').value;
    }

    function changeNamespace(harness: RouterTestingHarness, name: string) {
        const select = harness.routeNativeElement.querySelector<HTMLSelectElement>('#document-mapping-namespace');
        select.value = Array.from(select.options).find(option => option.text === name).value;
        select.dispatchEvent(new Event('change'));
        harness.detectChanges();
    }

    function flushMappingList(mappings = [detail]) {
        const request = http.expectOne('/api/getMappings');
        expect(request.request.body).toEqual({});
        request.flush({mappings});
    }

    it('shows the source, collection and one entire-document rule without a column editor', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        const request = http.expectOne('/api/getMapping');
        expect(request.request.body).toEqual({mappingId: 31});
        request.flush(detail);
        flushMappingList();
        harness.detectChanges();

        const view = harness.routeNativeElement;
        expect(view.querySelector('h1').textContent).toBe('Edit Mapping');
        expect(view.querySelector('c-card-header').textContent).toContain('Customer documents');
        expect(view.querySelector('[aria-labelledby="document-mapping-source"]').textContent).toContain('customers.json');
        const namespace = view.querySelector<HTMLSelectElement>('#document-mapping-namespace');
        expect(namespace.disabled).toBeFalse();
        expect(Array.from(namespace.options, option => option.text)).toEqual(['analytics', 'reports']);
        expect(namespace.selectedOptions[0].text).toBe('reports');
        expect(collectionName(view)).toBe('archive');
        expect(view.querySelector('#document-shared-target-info')).toBeNull();
        const rules = view.querySelector<HTMLSelectElement>('#document-mapping-rule');
        expect(Array.from(rules.options, option => option.text)).toEqual(['Copy entire document']);
        expect(rules.disabled).toBeFalse();
        expect(view.querySelector('table')).toBeNull();
    });

    it('uses the general mapping breadcrumbs and groups document and relational mappings in the sidebar', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        http.expectOne('/api/getMapping').flush(detail);
        flushMappingList([detail, {...detail, mappingId: 32, mappingName: 'Orders',
            sourceModel: DataModel.RELATIONAL, targetModel: DataModel.RELATIONAL}]);
        harness.detectChanges();

        const breadcrumbs = setBreadcrumbs.calls.mostRecent().args[0];
        expect(breadcrumbs.map(item => item.name)).toEqual(['Mappings', 'Physical to Logical', 'Edit Mapping']);
        expect(breadcrumbs[0].routerLink).toEqual(['/views/mappings']);
        expect(breadcrumbs[1].routerLink).toEqual(['/views/mappings/kind', 'PHYSICAL_TO_LOGICAL']);
        const [kindNode] = sidebar.setNodes.calls.mostRecent().args[0];
        expect(sidebar.open).toHaveBeenCalled();
        expect(kindNode.name).toBe('Physical to Logical');
        expect(kindNode.children.map(node => node.name)).toEqual(['Customer documents', 'Orders']);
        expect(kindNode.children[0].cssClass).toBe('node-content-wrapper-active');

        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        kindNode.action(null, null, null);
        kindNode.children[0].action(null, null, null);
        kindNode.children[1].action(null, null, null);
        expect(navigate.calls.allArgs()).toEqual([
            [['/views/mappings/kind', 'PHYSICAL_TO_LOGICAL']],
            [['/views/mappings', 'document', 31]],
            [['/views/mappings', 32, 'edit']]
        ]);
        harness.fixture.destroy();
        expect(sidebar.close).toHaveBeenCalledTimes(1);
    });

    it('keeps adapter breadcrumbs and highlights the current mapping in the sidebar', async () => {
        const harness = await RouterTestingHarness.create('/views/adapters/7/mappings/document/31');
        const request = http.expectOne('/api/getAdapterMapping');
        expect(request.request.body).toEqual({adapterId: 7, mappingId: 31});
        request.flush(detail);
        flushMappingList();
        const summariesRequest = http.expectOne('/api/getAdapterMappings');
        expect(summariesRequest.request.body).toEqual({adapterIds: [7]});
        summariesRequest.flush({adapters: [{adapterId: 7, adapterName: 'json_source', mappings: [detail,
            {...detail, mappingId: 32, mappingName: 'Second mapping'}]}]});
        harness.detectChanges();

        const breadcrumbs = setBreadcrumbs.calls.mostRecent().args[0];
        expect(breadcrumbs.map(item => item.name)).toEqual(['Adapters', 'json_source Mappings', 'Edit Mapping']);
        expect(breadcrumbs[1].routerLink).toEqual(['/views/adapters', 7, 'mappings', 'list']);
        const [adapterNode] = sidebar.setNodes.calls.mostRecent().args[0];
        expect(sidebar.open).toHaveBeenCalled();
        expect(adapterNode.name).toBe('json_source');
        expect(adapterNode.children.map(node => node.name)).toEqual(['Customer documents', 'Second mapping']);
        expect(adapterNode.children[0].cssClass).toBe('node-content-wrapper-active');
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        adapterNode.children[1].action(null, null, null);
        expect(navigate).toHaveBeenCalledWith(['/views/adapters', 7, 'mappings', 'document', 32]);
        harness.fixture.destroy();
        expect(sidebar.close).toHaveBeenCalledTimes(1);
    });

    it('shows load errors and retries the same mapping', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        http.expectOne('/api/getMapping').flush({message: 'Mapping unavailable.'}, {status: 404, statusText: 'Not Found'});
        flushMappingList([]);
        harness.detectChanges();
        expect(harness.routeNativeElement.querySelector('[role="alert"]').textContent).toContain('Mapping unavailable.');

        harness.routeNativeElement.querySelector('button').click();
        await Promise.resolve();
        http.expectOne('/api/getMapping').flush(detail);
        flushMappingList();
        harness.detectChanges();

        expect(harness.routeNativeElement.textContent).toContain('Copy entire document');
    });

    it('saves both names with the current revision and displays the accepted names', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        http.expectOne('/api/getMapping').flush(detail);
        flushMappingList([detail, {...detail, mappingId: 32, adapterId: 8, mappingName: 'Orders'}]);
        harness.detectChanges();
        const view = harness.routeNativeElement;

        view.querySelector('button').click();
        harness.detectChanges();
        expect(view.querySelector<HTMLInputElement>('#document-mapping-name').value).toBe('Customer documents');
        expect(view.querySelector<HTMLInputElement>('#document-mapping-collection-name').value).toBe('archive');
        const save = view.querySelector<HTMLButtonElement>('button[type="submit"]');
        expect(save.disabled).toBeTrue();
        changeName(harness, 'document-mapping-name', '  ORDERS  ');
        expect(view.querySelector('#document-mapping-name-error').textContent).toContain('A mapping with this name already exists.');
        expect(view.querySelector<HTMLButtonElement>('.mapping-name-input button').disabled).toBeTrue();
        expect(save.disabled).toBeTrue();
        changeName(harness, 'document-mapping-name', 'a'.repeat(256));
        expect(view.querySelector('#document-mapping-name-error').textContent).toContain('Enter a mapping name up to 255 characters.');
        changeName(harness, 'document-mapping-name', '  Archived customers ');
        expect(view.querySelector('#document-mapping-name-error')).toBeNull();
        expect(save.disabled).toBeFalse();
        changeName(harness, 'document-mapping-collection-name', 'Orders');
        expect(view.querySelector('#document-mapping-collection-name-error').textContent)
            .toContain('An entity with this name already exists in the namespace.');
        expect(save.disabled).toBeTrue();
        save.click();
        http.expectNone('/api/updateDocumentMapping');
        changeName(harness, 'document-mapping-collection-name', ' Customer_Archive ');
        expect(view.querySelector('#document-mapping-collection-name-error')).toBeNull();
        save.click();
        harness.detectChanges();

        const request = http.expectOne('/api/updateDocumentMapping');
        expect(request.request.body).toEqual({adapterId: 7, mappingId: 31, expectedRevision: 'original',
            mappingName: 'Archived customers', logicalCollectionName: 'Customer_Archive', targetNamespaceId: 3});
        request.flush({...detail, revision: 'saved', mappingName: 'Archived customers', logicalCollectionName: 'customer_archive'});
        flushMappingList([{...detail, mappingName: 'Archived customers'}]);
        harness.detectChanges();

        expect(view.querySelector('#document-mapping-name')).toBeNull();
        expect(view.querySelector('c-card-header').textContent).toContain('Archived customers');
        expect(collectionName(view)).toBe('customer_archive');
        expect(view.textContent).toContain('Copy entire document');
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].children[0].name).toBe('Archived customers');
        expect(getSnapshot).toHaveBeenCalledTimes(1);
    });

    it('checks the collection name in the selected namespace', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        http.expectOne('/api/getMapping').flush(detail);
        flushMappingList();
        harness.detectChanges();
        const view = harness.routeNativeElement;
        const save = view.querySelector<HTMLButtonElement>('button[type="submit"]');

        changeName(harness, 'document-mapping-collection-name', 'orders');
        expect(view.querySelector('#document-mapping-collection-name-error').textContent)
            .toContain('An entity with this name already exists in the namespace.');
        expect(save.disabled).toBeTrue();
        changeNamespace(harness, 'analytics');
        expect(view.querySelector('#document-mapping-collection-name-error')).toBeNull();
        expect(save.disabled).toBeFalse();
        changeNamespace(harness, 'reports');
        expect(save.disabled).toBeTrue();
    });

    it('shows field validation and reloads saved names after a revision conflict', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        http.expectOne('/api/getMapping').flush(detail);
        flushMappingList();
        harness.detectChanges();
        const view = harness.routeNativeElement;
        view.querySelector('button').click();
        harness.detectChanges();
        changeName(harness, 'document-mapping-collection-name', 'duplicate');
        const save = view.querySelector<HTMLButtonElement>('button[type="submit"]');

        save.click();
        http.expectOne('/api/updateDocumentMapping').flush({code: 'VALIDATION', message: 'Fix the collection name.',
            fieldErrors: {logicalCollectionName: 'This name is already in use.'}}, {status: 400, statusText: 'Bad Request'});
        harness.detectChanges();
        expect(view.querySelector('#document-mapping-collection-name-error').textContent).toContain('This name is already in use.');
        expect(view.querySelector<HTMLInputElement>('#document-mapping-collection-name').value).toBe('duplicate');

        changeName(harness, 'document-mapping-collection-name', 'customer_archive');
        save.click();
        http.expectOne('/api/updateDocumentMapping').flush({code: 'REVISION', message: 'The mapping changed.'}, {status: 409, statusText: 'Conflict'});
        harness.detectChanges();
        const alert = view.querySelector('#document-mapping-save-error');
        expect(alert.textContent).toContain('The mapping changed.');
        expect(save.disabled).toBeTrue();
        expect(collectionName(view)).toBe('customer_archive');

        alert.querySelector('button').click();
        harness.detectChanges();
        view.querySelector<HTMLButtonElement>('c-modal:not([aria-hidden]) c-modal-footer button:last-child').click();
        await Promise.resolve();
        http.expectOne('/api/getMapping').flush({...detail, revision: 'other', mappingName: 'Other change', logicalCollectionName: 'other_archive'});
        flushMappingList([{...detail, mappingName: 'Other change'}]);
        harness.detectChanges();
        expect(view.querySelector('#document-mapping-name')).toBeNull();
        expect(view.querySelector('c-card-header').textContent).toContain('Other change');
        expect(collectionName(view)).toBe('other_archive');
        http.expectNone('/api/updateDocumentMapping');
    });

    it('links from a shared document mapping to the target collection Mappings tab', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        http.expectOne('/api/getMapping').flush({...detail, fixedTargetEntityId: detail.targetEntityId});
        flushMappingList();
        harness.detectChanges();

        const view = harness.routeNativeElement;
        const notice = view.querySelector('#document-shared-target-info');
        const link = notice.parentElement.querySelector('a');
        expect(notice.textContent.trim()).toBe('This mapping uses a target collection shared by multiple sources. '
            + 'The target information and mapping rules are fixed.');
        expect(view.querySelector<HTMLSelectElement>('#document-mapping-namespace').disabled).toBeTrue();
        expect(view.querySelector<HTMLInputElement>('#document-mapping-collection-name').disabled).toBeTrue();
        expect(view.querySelector<HTMLSelectElement>('#document-mapping-rule').disabled).toBeTrue();
        expect(link.textContent.trim()).toBe('View all sources for this target');
        expect(link.getAttribute('href')).toBe('/views/schema-editing/reports.archive/mappings');
        link.click();
        await harness.fixture.whenStable();
        expect(TestBed.inject(Router).url).toBe('/views/schema-editing/reports.archive/mappings');
    });

    it('returns to the collection Mappings tab after Cancel or a successful namespace move', async () => {
        const editorUrl = '/views/mappings/document/31?returnTargetEntityId=70';
        const harness = await RouterTestingHarness.create(editorUrl);
        const router = TestBed.inject(Router);
        http.expectOne('/api/getMapping').flush(detail);
        flushMappingList();
        harness.detectChanges();

        harness.routeNativeElement.querySelector<HTMLButtonElement>('.editor-actions button:first-child').click();
        await harness.fixture.whenStable();
        expect(router.url).toBe('/views/schema-editing/reports.archive/mappings');

        await harness.navigateByUrl(editorUrl);
        http.expectOne('/api/getMapping').flush(detail);
        flushMappingList();
        harness.detectChanges();
        changeNamespace(harness, 'analytics');
        harness.routeNativeElement.querySelector<HTMLButtonElement>('button[type="submit"]').click();
        const saved = {...detail, namespaceId: 4, namespaceName: 'analytics', revision: 'updated'};
        const request = http.expectOne('/api/updateDocumentMapping');
        expect(request.request.body).toEqual({adapterId: 7, mappingId: 31, expectedRevision: 'original',
            mappingName: 'Customer documents', logicalCollectionName: 'archive', targetNamespaceId: 4});
        request.flush(saved);
        flushMappingList([saved]);
        await harness.fixture.whenStable();

        expect(getSnapshot).toHaveBeenCalledTimes(1);
        expect(router.url).toBe('/views/schema-editing/analytics.archive/mappings');
    });

    it('hides renaming for read-only document mappings', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31');
        http.expectOne('/api/getMapping').flush({...detail, editable: false, readOnlyReason: 'This mapping is read-only.'});
        flushMappingList([{...detail, editable: false}]);
        harness.detectChanges();

        expect(harness.routeNativeElement.querySelector('[aria-label="Rename mapping"]')).toBeNull();
        expect(harness.routeNativeElement.querySelector<HTMLSelectElement>('#document-mapping-namespace').disabled).toBeTrue();
        expect(harness.routeNativeElement.querySelector('button[type="submit"]')).toBeNull();
        expect(harness.routeNativeElement.textContent).toContain('This mapping is read-only.');
        expect(setBreadcrumbs.calls.mostRecent().args[0].map(item => item.name)).toEqual(['Mappings', 'Physical to Logical', 'Mapping Details']);
    });

    it('cancels a switch to another mapping when keeping edits, then returns to the source list when discarding', async () => {
        const harness = await RouterTestingHarness.create('/views/mappings/document/31?returnSourceAdapterId=7&returnSourceNamespace=files&returnSourceTable=customers.json');
        const router = TestBed.inject(Router);
        const initialUrl = router.url;
        http.expectOne('/api/getMapping').flush({...detail, removable: true, removalBlockedReason: null});
        flushMappingList([detail, {...detail, mappingId: 32, mappingName: 'Different collection',
            physicalSources: [{namespaceName: 'files', physicalName: 'orders.json'}]}]);
        harness.detectChanges();
        expect(sidebar.setNodes.calls.mostRecent().args[0][0].children.map(node => node.name)).toEqual(['Customer documents']);
        const actions = Array.from(harness.routeNativeElement.querySelectorAll<HTMLButtonElement>('.editor-actions button'));
        expect(actions.map(button => button.textContent.trim())).toEqual(['Cancel', 'Save']);
        changeNamespace(harness, 'analytics');
        const switchMapping = router.navigateByUrl('/views/mappings/document/32');
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        harness.detectChanges();
        harness.routeNativeElement.querySelector<HTMLButtonElement>('c-modal:not([aria-hidden]) c-modal-footer button:first-child').click();
        expect(await switchMapping).toBeFalse();
        expect(router.url).toBe(initialUrl);
        const namespace = harness.routeNativeElement.querySelector<HTMLSelectElement>('#document-mapping-namespace');
        expect(namespace.selectedOptions[0].text).toBe('analytics');
        http.expectNone('/api/getMapping');

        actions[0].click();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        harness.detectChanges();
        harness.routeNativeElement.querySelector<HTMLButtonElement>('c-modal:not([aria-hidden]) c-modal-footer button:last-child').click();
        await harness.fixture.whenStable();
        expect(router.url).toBe('/views/mappings/source/7?sourceNamespace=files&sourceTable=customers.json');
        http.expectNone('/api/updateDocumentMapping');
    });
});

import {NO_ERRORS_SCHEMA, signal} from '@angular/core';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';
import {AdaptersComponent} from './adapters.component';
import {CrudService} from '../../services/crud.service';
import {CatalogService} from '../../services/catalog.service';
import {MappingService} from '../../services/mapping.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {AdapterType} from './adapter.model';
import {DeployMode} from '../../models/catalog.model';

describe('Adapter mapping entry point', () => {
    it('links source cards with mappings using the adapter ID and leaves other cards unchanged', fakeAsync(() => {
        const adapter = (id: number, name: string) => ({id, name, adapterName: 'CSV', settings: {}, mode: 'EMBEDDED'});
        const mappings = jasmine.createSpy('getSummaries').and.returnValue(of({adapters: [
            {adapterId: 7, adapterName: 'source', mappings: [{mappingId: 31, editable: true}]},
            {adapterId: 8, adapterName: 'empty', mappings: []}
        ]}));
        TestBed.configureTestingModule({
            declarations: [AdaptersComponent], imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterTestingModule],
            schemas: [NO_ERRORS_SCHEMA], providers: [
                {provide: CrudService, useValue: {}}, {provide: ToasterService, useValue: {}},
                {provide: LeftSidebarService, useValue: {close: () => {}}},
                {provide: MappingService, useValue: {getSummaries: mappings}},
                {provide: CatalogService, useValue: {
                    listener: signal(null), getAdapterTemplates: () => [],
                    getStores: () => [adapter(1, 'store')], getSources: () => [adapter(7, 'source'), adapter(8, 'empty')]
                }}
            ]
        });
        const fixture = TestBed.createComponent(AdaptersComponent);
        fixture.detectChanges();
        tick(150);
        fixture.detectChanges();
        expect(mappings).toHaveBeenCalledWith([7, 8]);
        const links = fixture.nativeElement.querySelectorAll('.mapping-action');
        expect(links.length).toBe(1);
        expect(links[0].getAttribute('href')).toBe('/views/adapters/7/mappings/list');
        expect(links[0].textContent).toContain('Edit mappings');
        fixture.destroy();
    }));

    it('allows selecting two files in the new-adapter picker and sends both in one deployment', fakeAsync(() => {
        const template: any = {
            adapterName: 'CSV', adapterType: AdapterType.SOURCE, modes: [DeployMode.EMBEDDED], persistent: true,
            settings: [
                {name: 'method', type: 'LIST', defaultValue: 'upload', options: ['upload', 'link'], appliesTo: [DeployMode.EMBEDDED]},
                {name: 'directory', type: 'DIRECTORY', defaultValue: '', fileNames: [], appliesTo: [DeployMode.EMBEDDED], subOf: 'method_upload'}
            ]
        };
        const createAdapter = jasmine.createSpy('createAdapter').and.returnValue(of({affectedTuples: 1}));
        TestBed.configureTestingModule({
            declarations: [AdaptersComponent], imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterTestingModule],
            schemas: [NO_ERRORS_SCHEMA], providers: [
                {provide: CrudService, useValue: {createAdapter, getAdapterNameValidationRegex: () => /^[a-z][a-z0-9_]*$/}},
                {provide: ToasterService, useValue: {success: () => {}}},
                {provide: LeftSidebarService, useValue: {close: () => {}}},
                {provide: MappingService, useValue: {}},
                {provide: CatalogService, useValue: {
                    listener: signal(null), getAdapterTemplates: () => [template], getStores: () => [], getSources: () => []
                }}
            ]
        });
        const fixture = TestBed.createComponent(AdaptersComponent);
        fixture.detectChanges();
        fixture.componentInstance.initDeployModal(template);
        fixture.detectChanges();
        const input: HTMLInputElement = fixture.nativeElement.querySelector('#deploy-files-directory');
        expect(input.multiple).toBeTrue();
        const selection = new DataTransfer();
        selection.items.add(new File(['id:long\n1\n'], 'customers.csv', {type: 'text/csv'}));
        selection.items.add(new File(['order_id:long\n1\n'], 'orders.csv', {type: 'text/csv'}));
        input.files = selection.files;
        input.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        fixture.componentInstance.deploy();
        expect(createAdapter).toHaveBeenCalledTimes(1);
        const [adapter, data] = createAdapter.calls.mostRecent().args;
        expect(JSON.parse(adapter.settings.get('directory'))).toEqual(['customers.csv', 'orders.csv']);
        expect((data.get('customers.csv') as File).name).toBe('customers.csv');
        expect((data.get('orders.csv') as File).name).toBe('orders.csv');
        tick();
        fixture.destroy();
    }));
});

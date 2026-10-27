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
        expect(links[0].getAttribute('href')).toBe('/views/adapters/7/mappings');
        expect(links[0].textContent).toContain('Edit mappings');
        fixture.destroy();
    }));
});

import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {MappingService} from './mapping.service';
import {WebuiSettingsService} from './webui-settings.service';

describe('MappingService', () => {
    let service: MappingService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HttpClientTestingModule], providers: [
            MappingService, {provide: WebuiSettingsService, useValue: {getConnection: () => '/api'}}
        ]});
        service = TestBed.inject(MappingService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('loads summaries in one request for all adapter IDs', () => {
        service.getSummaries([7, 8]).subscribe(response => expect(response.adapters).toEqual([]));
        const request = http.expectOne('/api/getAdapterMappings');
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({adapterIds: [7, 8]});
        request.flush({adapters: []});
    });

    it('filters by target identity and preserves the selected physical source in drafts', () => {
        service.getMappings(undefined, 50).subscribe();
        let request = http.expectOne('/api/getMappings');
        expect(request.request.body).toEqual({targetEntityId: 50});
        request.flush({mappings: []});
        service.getSources(undefined, 50).subscribe();
        request = http.expectOne('/api/getMappingSources');
        expect(request.request.body).toEqual({targetEntityId: 50});
        request.flush({sources: []});
        service.getDraft(7, 51, 50, 61).subscribe();
        request = http.expectOne('/api/getMappingDraft');
        expect(request.request.body).toEqual({adapterId: 7, targetEntityId: 51, existingTargetEntityId: 50, sourceAllocationId: 61});
        request.flush({});
    });

    it('sends inclusion, stable identities and the expected revision on update', () => {
        const draft = {adapterId: 7, mappingId: 31, expectedRevision: 'original', mappingName: 'Customers', logicalTableName: 'customers', columns: [{logicalColumnId: 101, logicalName: 'id', included: false}]};
        service.update(draft).subscribe({error: error => {
            expect(MappingService.error(error).code).toBe('REVISION_CONFLICT');
        }});
        const request = http.expectOne('/api/updateMapping');
        expect(request.request.body).toEqual(draft);
        request.flush({code: 'REVISION_CONFLICT', message: 'Reload'}, {status: 409, statusText: 'Conflict'});
    });
});

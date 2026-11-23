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
        request = http.expectOne('/api/getRelMappingSources');
        expect(request.request.body).toEqual({targetEntityId: 50});
        request.flush({sources: []});
        service.getDraft(7, 51, 50, 61).subscribe();
        request = http.expectOne('/api/getRelMappingDraft');
        expect(request.request.body).toEqual({adapterId: 7, targetEntityId: 51, existingTargetEntityId: 50, sourceAllocationId: 61});
        request.flush({});

        const draft = {adapterId: 7, targetEntityId: 51, expectedRevision: 'original', mappingName: 'Customers',
            logicalTableName: 'customers', columns: [{logicalColumnId: 101, logicalName: 'id', included: true}]};
        service.create(draft).subscribe();
        request = http.expectOne('/api/createRelMapping');
        expect(request.request.body).toEqual(draft);
        request.flush({});
    });

    it('sends inclusion, stable identities and the expected revision on update', () => {
        const draft = {adapterId: 7, mappingId: 31, expectedRevision: 'original', mappingName: 'Customers', logicalTableName: 'customers', columns: [{logicalColumnId: 101, logicalName: 'id', included: false}]};
        service.update(draft).subscribe({error: error => {
            expect(MappingService.error(error).code).toBe('REVISION');
        }});
        const request = http.expectOne('/api/updateRelMapping');
        expect(request.request.body).toEqual(draft);
        request.flush({code: 'REVISION', message: 'Reload'}, {status: 409, statusText: 'Conflict'});
    });

    it('validates unsaved conversions without saving the mapping', () => {
        const draft = {adapterId: 7, targetEntityId: 50, sourceAllocationId: 60, expectedRevision: 'original',
            columns: [{logicalColumnId: 101, logicalName: 'amount', included: true, targetType: 'INTEGER', ruleType: 'CONVERT_COLUMN'}]};
        service.validateConversions(draft).subscribe(response => expect(response.columns[0].errors[0].error.code).toBe('EXECUTION'));
        const request = http.expectOne('/api/validateRelMappingConversions');
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(draft);
        request.flush({columns: [{logicalColumnId: 101, checkedRecords: 10, errors: [
            {recordNumber: 3, error: {code: 'EXECUTION', message: 'Mapping conversion failed'}}
        ]}]});
    });
});

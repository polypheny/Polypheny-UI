import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {AdapterMappings, MappingCreate, MappingDetail, MappingError, MappingSource, MappingSummary, MappingUpdate} from '../views/mappings/mapping.model';

@Injectable({providedIn: 'root'})
export class MappingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(WebuiSettingsService).getConnection('crud.rest');

    getSummaries(adapterIds: number[]) {
        return this.http.post<{adapters: AdapterMappings[]}>(`${this.baseUrl}/getAdapterMappings`, {adapterIds});
    }

    getMappings(adapterId?: number, targetEntityId?: number) {
        return this.http.post<{mappings: MappingSummary[]}>(`${this.baseUrl}/getMappings`, {
            ...(adapterId == null ? {} : {adapterId}), ...(targetEntityId == null ? {} : {targetEntityId})
        });
    }

    getMapping(mappingId: number) {
        return this.http.post<MappingDetail>(`${this.baseUrl}/getMapping`, {mappingId});
    }

    getSources(adapterId?: number, targetEntityId?: number) {
        return this.http.post<{sources: MappingSource[]}>(`${this.baseUrl}/getMappingSources`, {
            ...(adapterId == null ? {} : {adapterId}), ...(targetEntityId == null ? {} : {targetEntityId})
        });
    }

    getDraft(adapterId: number, targetEntityId: number, existingTargetEntityId?: number, sourceAllocationId?: number) {
        return this.http.post<MappingDetail>(`${this.baseUrl}/getMappingDraft`, {adapterId, targetEntityId,
            ...(existingTargetEntityId == null ? {} : {existingTargetEntityId}), ...(sourceAllocationId == null ? {} : {sourceAllocationId})});
    }

    create(request: MappingCreate) {
        return this.http.post<MappingDetail>(`${this.baseUrl}/createMapping`, request);
    }

    remove(mappingId: number, expectedRevision: string) {
        return this.http.post<{removed: boolean}>(`${this.baseUrl}/removeMapping`, {mappingId, expectedRevision});
    }

    getDetail(adapterId: number, mappingId: number) {
        return this.http.post<MappingDetail>(`${this.baseUrl}/getAdapterMapping`, {adapterId, mappingId});
    }

    update(request: MappingUpdate) {
        return this.http.post<MappingDetail>(`${this.baseUrl}/updateMapping`, request);
    }

    static error(error: any): MappingError {
        const body = error?.error;
        return body && typeof body.message === 'string' ? body : {
            code: 'REQUEST_FAILED',
            message: error?.status === 0 ? 'Cannot reach the server. Check the connection and try again.' : 'The mapping request failed. Please try again.'
        };
    }
}

import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {AdapterMappings, MappingDetail, MappingError, MappingUpdate} from '../views/adapters/mappings/mapping.model';

@Injectable({providedIn: 'root'})
export class MappingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(WebuiSettingsService).getConnection('crud.rest');

    getSummaries(adapterIds: number[]) {
        return this.http.post<{adapters: AdapterMappings[]}>(`${this.baseUrl}/getAdapterMappings`, {adapterIds});
    }

    getDetail(adapterId: number, mappingId: number) {
        return this.http.post<MappingDetail>(`${this.baseUrl}/getAdapterMapping`, {adapterId, mappingId});
    }

    update(request: MappingUpdate) {
        return this.http.post<MappingDetail>(`${this.baseUrl}/updateAdapterMapping`, request);
    }

    static error(error: any): MappingError {
        const body = error?.error;
        return body && typeof body.message === 'string' ? body : {
            code: 'REQUEST_FAILED',
            message: error?.status === 0 ? 'Cannot reach the server. Check the connection and try again.' : 'The mapping request failed. Please try again.'
        };
    }
}

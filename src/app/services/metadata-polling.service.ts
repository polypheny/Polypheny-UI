// src/app/services/metadata-polling.service.ts
import {inject, Injectable} from '@angular/core';
import { CrudService } from './crud.service';
import {timer, Subscription, of, switchMap} from 'rxjs';

import { CatalogService } from './catalog.service';
import { AdapterModel } from '../views/adapters/adapter.model';

export interface MetadataStatusResponse {
    changed: 'OK' | 'WARNING' | 'CRITICAL' | null;
}

@Injectable({providedIn: 'root'})
export class MetadataPollingService {

    private readonly _crud = inject(CrudService);
    private readonly _catalog = inject(CatalogService);

    private readonly intervalMs = 30_000;
    private timerSub: Subscription | null = null;


    start(): void {
        if (this.timerSub) {
            return;
        }

        this.timerSub = timer(0, this.intervalMs).pipe(
            switchMap(() => of(this._catalog.getSources()))
        ).subscribe(sourceList => {
            sourceList.forEach(source => this.checkSource(source));
        });
    }

    stop(): void {
        this.timerSub?.unsubscribe();
        this.timerSub = null;
    }


    private checkSource(adapter: AdapterModel): void {
        this._crud.metadataStatus(adapter.name).subscribe({
            next: (res: Object) => {
                const casted = res as MetadataStatusResponse;
                console.log('casted', casted);
                this._catalog.updateAdapterFlag(adapter.name, {
                    metadataStatus: casted.changed
                });
            },
            error: err => console.error('[metadata-poll]', err)
        });
    }

}

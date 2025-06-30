import {Injectable} from '@angular/core';
import {AbstractNode, ChangeLogEntry} from '../components/data-view/models/result-set.model';
import {AdapterModel, AdapterType, PolyMap} from '../views/adapters/adapter.model';
import {DeployMode} from '../models/catalog.model';


export type PreviewMode = 'deploy' | 'change' | 'config';

export interface PreviewContext {
    mode: PreviewMode;
    adapter: AdapterModel;
    metadata: AbstractNode;
    preview: Record<string, any[]> | any[];
    formData: FormData;
    files: Map<string, File>;
    adapterSettings: PolyMap<string, string>;
    adapterInfo: Partial<{
        uniqueName: string;
        adapterName: string;
        type: AdapterType;
        mode: DeployMode;
        persistent: boolean;
    }>;
    changeLog?: ChangeLogEntry[];
}

@Injectable({providedIn: 'root'})
export class PreviewNavigationService {

    private _ctx: PreviewContext | null = null;

    setContext(ctx: PreviewContext): void {
        this._ctx = ctx;
    }

    get context(): PreviewContext | null {
        return this._ctx;
    }

    clear(): void {
        this._ctx = null;
    }
}

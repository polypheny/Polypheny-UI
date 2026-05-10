import {Pipe, PipeTransform} from '@angular/core';
const FEATURE_DISPLAY_NAMES: Record<string, string> = {
    vector: 'pgvector',
    postgis: 'PostGIS',
};

@Pipe({ name: 'adapterFeatureName' })
export class AdapterFeatureNamePipe implements PipeTransform {
    transform(feature: string): string {
        return FEATURE_DISPLAY_NAMES[feature] ?? feature;
    }
}


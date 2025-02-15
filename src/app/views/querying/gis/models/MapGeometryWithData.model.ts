import {Geometry, Point} from 'geojson';
import {MapLayer} from './MapLayer.model';

/**
 * Represents one row in the results returned by Polypheny.
 */
export class MapGeometryWithData {
    /**
     * Used for styling if the results are ordered
     */
    index: number;
    geometry: Geometry;
    data: Record<string, any> = {};
    cache: Record<string, number> = {};
    layer?: MapLayer = undefined;
    type: 'point' | 'path';

    constructor(
        index: number,
        geometry: Geometry,
        data: Record<string, any> | undefined = undefined,
    ) {
        this.index = index;
        this.geometry = geometry;
        this.type = this.isPoint() ? 'point' : 'path';

        if (data) {
            this.data = data;
        }
    }

    isPoint(){
        return this.geometry.type === 'Point';
    }

    getPoint() {
        if (this.isPoint()){
            return this.geometry as Point;
        }
        throw new Error('Can only call getPoint() if geometry is actually of type Point!');
    }

    copy(){
        // We leave out cache on purpose, because we will use the copy to compare both if the layer has changed.
        return new MapGeometryWithData(this.index, this.geometry, this.data);
    }

    getNumberValueFromField(fieldName: string): number {
        let finalValue: any = this.data;

        for (const key of fieldName.split('.')) {
            if (finalValue && typeof finalValue === 'object') {
                finalValue = finalValue[key];
            } else {
                return NaN;
            }
        }

        if (typeof finalValue === 'number') {
            return finalValue;
        }

        return NaN;
    }

    getDataForPreview(obj: Record<string, any> = null): Record<string, any> {
        if (obj === null){
            obj = this.data;
        }

        const previewData = { ...obj }; // Create a shallow copy to avoid mutating the original
        for (const key in previewData) {
            if (previewData.hasOwnProperty(key)) {
                if (key === 'coordinates') {
                    previewData[key] = '...';
                } else if (typeof previewData[key] === 'object' && previewData[key] !== null) {
                    previewData[key] = this.getDataForPreview(previewData[key]); // Recurse for nested objects
                }
            }
        }
        return previewData;
    }
}

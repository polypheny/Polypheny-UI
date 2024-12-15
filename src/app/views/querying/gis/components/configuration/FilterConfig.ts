import {MapLayerConfiguration} from '../../models/MapLayerConfiguration.interface';
import {Polygon} from 'geojson';
import {FilterComponent} from './filter/filter.component';
import {MapLayer} from '../../models/MapLayer.model';

export class FilterConfig implements MapLayerConfiguration {
    configurationComponentType = FilterComponent;
    filterPolygon: Polygon = null;
    filterPolygonText = '';
    layer: MapLayer;

    constructor(layer: MapLayer) {
        this.layer = layer;
    }

    copy(): MapLayerConfiguration {
        const copy = new FilterConfig(this.layer);
        copy.filterPolygon = this.filterPolygon;
        copy.filterPolygonText = this.filterPolygonText;
        return copy;
    }

    addPolygon(polygon: Polygon) {
        this.filterPolygon = polygon;
        this.filterPolygonText = 'Polygon';
        console.log('Polygon added', polygon);
    }

    removePolygon() {
        this.filterPolygon = null;
        this.filterPolygonText = '';
        console.log('Polygon removed');
    }
}

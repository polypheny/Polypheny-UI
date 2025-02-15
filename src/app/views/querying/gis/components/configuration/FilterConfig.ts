import {MapLayerConfiguration} from '../../models/MapLayerConfiguration.interface';
import {Polygon} from 'geojson';
import {FilterComponent} from './filter/filter.component';
import {MapLayer} from '../../models/MapLayer.model';

export class FilterConfig implements MapLayerConfiguration {
    configurationComponentType = FilterComponent;
    layer: MapLayer;
    isDrawingModeActive = false;
    polygon: Polygon;

    constructor(layer: MapLayer) {
        this.layer = layer;
    }

    copy(): MapLayerConfiguration {
        return new FilterConfig(this.layer);
    }
}

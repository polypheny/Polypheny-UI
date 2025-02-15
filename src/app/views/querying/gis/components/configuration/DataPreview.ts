import {MapLayerConfiguration} from '../../models/MapLayerConfiguration.interface';
import {DataPreviewComponent} from './data-preview/data-preview.component';
import {MapLayer} from '../../models/MapLayer.model';

export class DataPreview implements MapLayerConfiguration {
    configurationComponentType = DataPreviewComponent;
    layer: MapLayer;
    previewObject: Object;

    constructor(layer: MapLayer) {
        this.layer = layer;
    }

    copy(): MapLayerConfiguration {
        throw new Error('Layer should not need to be copied, there is no configuration that can change.');
    }

    updatePreviewObject(){
        this.previewObject = this.layer.data[0].data;
    }
}

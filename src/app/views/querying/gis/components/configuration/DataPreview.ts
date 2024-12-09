import {MapLayerConfiguration} from "../../models/MapLayerConfiguration.interface";
import {DataPreviewComponent} from "./data-preview/data-preview.component";
import {MapLayer} from "../../models/MapLayer.model";

export class DataPreview implements MapLayerConfiguration {
    configurationComponentType = DataPreviewComponent
    layer: MapLayer

    constructor(layer: MapLayer) {
        this.layer = layer;
    }

}
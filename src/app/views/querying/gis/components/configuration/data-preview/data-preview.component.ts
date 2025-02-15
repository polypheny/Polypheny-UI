import { Component, Inject } from '@angular/core';
import { MapLayerConfigurationComponent } from '../../../models/visualization-configuration.interface';
import { LayerSettingsService } from '../../../services/layersettings.service';
import {DataPreview} from '../DataPreview';
import {MapLayer} from '../../../models/MapLayer.model';

@Component({
    selector: 'app-data-preview',
    templateUrl: './data-preview.component.html',
    styleUrl: './data-preview.component.css',
})
export class DataPreviewComponent implements MapLayerConfigurationComponent {
    layer: MapLayer;


    constructor(
        @Inject('config') protected config: DataPreview,
        private layerSettings: LayerSettingsService,
    ) {
        this.layer = config.layer;
    }

    protected readonly Object = Object;
}

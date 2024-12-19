import {Component, Inject} from '@angular/core';
import {MapLayerConfigurationComponent} from '../../../models/visualization-configuration.interface';
import {LayerSettingsService} from '../../../services/layersettings.service';
import {DataPreview} from '../DataPreview';
import {MapLayer} from '../../../models/MapLayer.model';
import {FilterConfig} from '../FilterConfig';

@Component({
    selector: 'app-data-preview',
    templateUrl: './filter.component.html',
    styleUrl: './filter.component.css',
})
export class FilterComponent implements MapLayerConfigurationComponent {

    constructor(
        @Inject('config') protected config: FilterConfig,
        private layerSettings: LayerSettingsService,
    ) {
    }

    enableDrawingMode() {
        this.layerSettings.enableDrawingModeForLayer(this.config.layer);
    }

    disableDrawingMode() {
        this.layerSettings.disableDrawingModeForLayer(this.config.layer);
    }

    editQuery() {
        this.layerSettings.editQuery(this.config.layer);
    }
}

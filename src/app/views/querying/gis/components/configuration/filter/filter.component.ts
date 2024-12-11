import {Component, Inject} from '@angular/core';
import {MapLayerConfigurationComponent} from '../../../models/visualization-configuration.interface';
import {LayerSettingsService} from '../../../services/layersettings.service';
import {DataPreview} from "../DataPreview";
import {MapLayer} from "../../../models/MapLayer.model";
import {FilterConfig} from "../FilterConfig";

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
        //
    }

    configChanged() {
        this.layerSettings.visualizationConfigurationChanged(this.config);
    }

    drawOrRemovePolygon() {
        if (this.config.filterPolygon) {
            console.log("drawOrRemovePolygon REMOVE")
            this.config.removePolygon();
            this.layerSettings.removePolygonFilterForLayer(this.config.layer);
        } else {
            console.log("drawOrRemovePolygon ADD")
            this.layerSettings.addPolygonFilterForLayer(this.config.layer)
        }
    }
}

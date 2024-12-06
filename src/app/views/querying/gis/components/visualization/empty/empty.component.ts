import {Component, Inject} from '@angular/core';
import {VisualizationConfiguration} from "../../../models/visualization-configuration.interface";
import {ColorVisualization} from "../color-visualization-model";
import {LayerSettingsService} from "../../../services/layersettings.service";

@Component({
  selector: 'app-empty',
  templateUrl: './empty.component.html',
})
export class EmptyComponent implements VisualizationConfiguration {
    constructor(
        @Inject('config') protected config: ColorVisualization,
        private layerSettings: LayerSettingsService,
    ) {}
}

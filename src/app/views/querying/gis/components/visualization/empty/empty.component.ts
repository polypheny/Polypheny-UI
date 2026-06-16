import {Component, Inject} from '@angular/core';
import {MapLayerConfigurationComponent} from '../../../models/visualization-configuration.interface';
import {ColorVisualization} from '../color-visualization-model';
import {LayerSettingsService} from '../../../services/layersettings.service';

@Component({
  selector: 'app-empty',
  templateUrl: './empty.component.html',
})
export class EmptyComponent implements MapLayerConfigurationComponent {
    constructor(
        @Inject('config') protected config: ColorVisualization,
        private layerSettings: LayerSettingsService,
    ) {}
}

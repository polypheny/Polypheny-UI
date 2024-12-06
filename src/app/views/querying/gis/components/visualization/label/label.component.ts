import { Component, Inject } from '@angular/core';
import { VisualizationConfiguration } from '../../../models/visualization-configuration.interface';
import { FormsModule } from '@angular/forms';
import { LayerSettingsService } from '../../../services/layersettings.service';
import {
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    FormControlDirective,
    FormSelectDirective,
    InputGroupComponent,
    InputGroupTextDirective,
} from '@coreui/angular';
import { NgForOf, NgIf } from '@angular/common';
import {AreaShapeVisualization} from "../area-shape-visualization.model";
import {LabelVisualization} from "../label-visualization-model";

@Component({
    selector: 'app-area-shape',
    templateUrl: './label.component.html',
    styleUrl: './label.component.css',
})
export class LabelComponent implements VisualizationConfiguration {
    constructor(
        @Inject('config') protected config: LabelVisualization,
        private layerSettings: LayerSettingsService,
    ) {
        //
    }

    configChanged() {
        this.layerSettings.visualizationConfigurationChanged(this.config);
    }
}

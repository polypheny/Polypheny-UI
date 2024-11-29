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
import { ColorVisualization } from '../color-visualization-model';
import { NgForOf, NgIf } from '@angular/common';
import {PointShapeVisualization} from "../point-shape-visualization.model";

@Component({
    selector: 'app-point-shape',
    standalone: true,
    imports: [
        FormsModule,
        InputGroupComponent,
        InputGroupTextDirective,
        FormControlDirective,
        FormSelectDirective,
        NgForOf,
        NgIf,
        FormCheckComponent,
        FormCheckInputDirective,
        FormCheckLabelDirective,
    ],
    templateUrl: './point-shape.component.html',
    styleUrl: './point-shape.component.css',
})
export class PointShapeComponent implements VisualizationConfiguration {
    constructor(
        @Inject('config') protected config: PointShapeVisualization,
        private layerSettings: LayerSettingsService,
    ) {
        //
    }

    configChanged() {
        this.layerSettings.visualizationConfigurationChanged(this.config);
    }
}

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

@Component({
    selector: 'app-area-shape',
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
    templateUrl: './area-shape.component.html',
    styleUrl: './area-shape.component.css',
})
export class AreaShapeComponent implements VisualizationConfiguration {
    constructor(
        @Inject('config') protected config: AreaShapeVisualization,
        private layerSettings: LayerSettingsService,
    ) {
        //
    }

    configChanged() {
        this.layerSettings.visualizationConfigurationChanged(this.config);
    }
}

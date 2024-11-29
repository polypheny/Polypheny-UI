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

@Component({
    selector: 'app-color',
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
    templateUrl: './color.component.html',
    styleUrl: './color.component.css',
})
export class ColorComponent implements VisualizationConfiguration {
    constructor(
        @Inject('config') protected config: ColorVisualization,
        private layerSettings: LayerSettingsService,
    ) {
        //
    }

    configChanged() {
        this.layerSettings.visualizationConfigurationChanged(this.config);
    }
}

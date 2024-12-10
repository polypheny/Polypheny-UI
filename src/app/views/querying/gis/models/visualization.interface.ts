import { MapLayerConfigurationComponent } from './visualization-configuration.interface';
import { Type } from '@angular/core';
import {MapGeometryWithData} from "./MapGeometryWithData.model";
import {MapLayerConfiguration} from "./MapLayerConfiguration.interface";

export interface Visualization extends MapLayerConfiguration {
    name: string;

    apply(): void;

    copy(): Visualization;

    init(data: MapGeometryWithData[]): void;

    getValueForAttribute(attr: string, data: MapGeometryWithData): string | number;
}

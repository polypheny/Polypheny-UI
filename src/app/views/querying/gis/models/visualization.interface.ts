import { VisualizationConfiguration } from './visualization-configuration.interface';
import { Type } from '@angular/core';
import {MapGeometryWithData} from "./RowResult.model";

export interface Visualization {
    name: string;
    configurationComponentType: Type<VisualizationConfiguration>;

    apply(): void;

    copy(): Visualization;

    init(data: MapGeometryWithData[]): void;

    getValueForAttribute(attr: string, data: MapGeometryWithData): string | number;
}

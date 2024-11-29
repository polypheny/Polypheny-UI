import { VisualizationConfiguration } from './visualization-configuration.interface';
import { Type } from '@angular/core';
import {RowResult} from "./RowResult.model";

export interface Visualization {
    name: string;
    configurationComponentType: Type<VisualizationConfiguration>;

    apply(): void;

    copy(): Visualization;

    init(data: RowResult[]): void;

    getValueForAttribute(attr: string, data: RowResult): string | number;
}

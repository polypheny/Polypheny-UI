import { Type } from '@angular/core';
import { RowResult } from '../../models/RowResult.model';
import { VisualizationConfiguration } from '../../models/visualization-configuration.interface';
import { Visualization } from '../../models/visualization.interface';
import {EmptyComponent} from "./empty/empty.component";

export class EmptyVisualization implements Visualization {
    name: string = "Empty";
    configurationComponentType: Type<VisualizationConfiguration> = EmptyComponent;

    apply(): void {
        throw new Error('Method not implemented.');
    }
    copy(): Visualization {
        throw new Error('Method not implemented.');
    }
    init(data: RowResult[]): void {
        throw new Error('Method not implemented.');
    }
    getValueForAttribute(attr: string, data: RowResult): string | number {
        throw new Error('Method not implemented.');
    }
}

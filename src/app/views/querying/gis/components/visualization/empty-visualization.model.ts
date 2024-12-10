import { Type } from '@angular/core';
import { MapGeometryWithData } from '../../models/MapGeometryWithData.model';
import { MapLayerConfigurationComponent } from '../../models/visualization-configuration.interface';
import { Visualization } from '../../models/visualization.interface';
import {EmptyComponent} from "./empty/empty.component";
import {MapLayerConfiguration} from "../../models/MapLayerConfiguration.interface";

export class EmptyVisualization implements Visualization, MapLayerConfiguration {
    name: string = "Empty";
    configurationComponentType: Type<MapLayerConfigurationComponent> = EmptyComponent;

    apply(): void {
        throw new Error('Method not implemented.');
    }
    copy(): Visualization {
        throw new Error('Method not implemented.');
    }
    init(data: MapGeometryWithData[]): void {
        throw new Error('Method not implemented.');
    }
    getValueForAttribute(attr: string, data: MapGeometryWithData): string | number {
        throw new Error('Method not implemented.');
    }
}

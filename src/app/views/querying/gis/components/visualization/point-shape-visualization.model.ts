import { Visualization } from '../../models/visualization.interface';
import { MapGeometryWithData } from '../../models/MapGeometryWithData.model';
import { PointShapeComponent } from './point-shape/point-shape.component';
import {MapLayerConfiguration} from "../../models/MapLayerConfiguration.interface";

export class PointShapeVisualization implements Visualization, MapLayerConfiguration {
    name = 'Point Shape';
    configurationComponentType = PointShapeComponent;

    modes: string[] = ['Circle', 'Icon'];
    selectedMode: string = this.modes[0];
    size: number;
    fieldName: string = '';

    constructor(size: number) {
        this.size = size;
    }

    init(data: MapGeometryWithData[]): void {
        //
    }

    copy(): Visualization {
        const copy = new PointShapeVisualization(this.size);
        copy.selectedMode = this.selectedMode;
        copy.fieldName = this.fieldName;
        return copy;
    }

    getValueForAttribute(attr: string, data: MapGeometryWithData): string | number {
        if (data.isPoint()) {
            switch (attr) {
                case 'r':
                    return this.size;
            }
        }

        throw new Error(`Visualization does not support attribute [${attr}]`);
    }

    apply(): void {}
}

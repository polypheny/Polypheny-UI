import { Visualization } from '../../models/visualization.interface';
import { MapGeometryWithData } from '../../models/MapGeometryWithData.model';
import { PointShapeComponent } from './point-shape/point-shape.component';
import {MapLayerConfiguration} from '../../models/MapLayerConfiguration.interface';

const modes = ['Circle', 'Square', 'Triangle', 'Star', 'Cross'] as const; // readonly tuple
type Mode = typeof modes[number]; // Union type: 'Circle' | 'Square' | 'Triangle' | 'Star' | 'Cross'

export class PointShapeVisualization implements Visualization, MapLayerConfiguration {
    name = 'Point Shape';
    configurationComponentType = PointShapeComponent;

    modes = modes;
    selectedMode: Mode;
    size: number;

    // TODO: Currently deactivated, because it required too much client-side logic. It is easier to just apply
    //       the filter when specifying the query, and then applying the selectedMode to the whole layer, instead
    //       of comparing the field here.
    // fieldName = '';

    constructor(size: number) {
        this.size = size;
        this.selectedMode = this.modes[0];
    }

    init(data: MapGeometryWithData[]): void {
        //
    }

    copy(): PointShapeVisualization {
        const copy = new PointShapeVisualization(this.size);
        copy.selectedMode = this.selectedMode;
        // copy.fieldName = this.fieldName;
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

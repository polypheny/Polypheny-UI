import { Visualization } from '../../models/visualization.interface';
import { MapGeometryWithData } from '../../models/RowResult.model';
import { EmptyComponent } from './empty/empty.component';
import {AreaShapeComponent} from "./area-shape/area-shape.component";

export class AreaShapeVisualization implements Visualization {
    name = 'Area Shape';
    // TODO: Change to own component
    configurationComponentType = AreaShapeComponent;

    outlineThickness: number;
    modes: string[] = ['Solid'];
    selectedMode: string = this.modes[0];

    constructor(outlineThickness: number) {
        this.outlineThickness = outlineThickness;
    }

    init(data: MapGeometryWithData[]): void {
        //
    }

    copy(): Visualization {
        const copy = new AreaShapeVisualization(this.outlineThickness);
        copy.selectedMode = this.selectedMode;
        return copy;
    }

    getValueForAttribute(attr: string, data: MapGeometryWithData): string | number {
        switch (attr) {
            case 'stroke-width':
                return this.outlineThickness;
        }

        throw new Error(`Visualization does not support attribute [${attr}]`);
    }

    apply(): void {}
}

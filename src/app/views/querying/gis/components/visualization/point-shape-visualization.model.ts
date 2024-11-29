import { Visualization } from '../../models/visualization.interface';
import { RowResult } from '../../models/RowResult.model';
import { PointShapeComponent } from './point-shape/point-shape.component';

export class PointShapeVisualization implements Visualization {
    name = 'Point Shape';
    configurationComponentType = PointShapeComponent;

    modes: string[] = ['Circle', 'Icon'];
    selectedMode: string = this.modes[0];
    size: number;
    fieldName: string = '';

    constructor(size: number) {
        this.size = size;
    }

    init(data: RowResult[]): void {
        //
    }

    copy(): Visualization {
        const copy = new PointShapeVisualization(this.size);
        copy.selectedMode = this.selectedMode;
        copy.fieldName = this.fieldName;
        return copy;
    }

    getValueForAttribute(attr: string, data: RowResult): string | number {
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

import { Visualization } from '../../models/visualization.interface';
import { MapGeometryWithData } from '../../models/RowResult.model';
import {LabelComponent} from "./label/label.component";
import {MapLayerConfiguration} from "../../models/MapLayerConfiguration.interface";

export class LabelVisualization implements Visualization, MapLayerConfiguration {
    name = 'Label';
    configurationComponentType = LabelComponent;

    fieldName: string = '';

    constructor() {}

    init(data: MapGeometryWithData[]): void {
        //
    }

    copy(): Visualization {
        const copy = new LabelVisualization();
        copy.fieldName = this.fieldName;
        return copy;
    }

    getValueForAttribute(attr: string, data: MapGeometryWithData): string | number {
        return 'TODO';
        // throw new Error(`Visualization does not support attribute [${attr}]`);
    }

    apply(): void {}
}

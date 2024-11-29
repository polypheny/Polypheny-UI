import { Visualization } from '../../models/visualization.interface';
import { RowResult } from '../../models/RowResult.model';
import {LabelComponent} from "./label/label.component";

export class LabelVisualization implements Visualization {
    name = 'Label';
    configurationComponentType = LabelComponent;

    fieldName: string = '';

    constructor() {}

    init(data: RowResult[]): void {
        //
    }

    copy(): Visualization {
        const copy = new LabelVisualization();
        copy.fieldName = this.fieldName;
        return copy;
    }

    getValueForAttribute(attr: string, data: RowResult): string | number {
        return 'TODO';
        // throw new Error(`Visualization does not support attribute [${attr}]`);
    }

    apply(): void {}
}

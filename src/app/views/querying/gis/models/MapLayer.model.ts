import { Visualization } from './visualization.interface';
import { MapGeometryWithData } from './RowResult.model';
import { ColorVisualization } from '../components/visualization/color-visualization-model';
import {AreaShapeVisualization} from "../components/visualization/area-shape-visualization.model";
import {LabelVisualization} from "../components/visualization/label-visualization-model";
import {PointShapeVisualization} from "../components/visualization/point-shape-visualization.model";

export class MapLayer {
    name: string;
    data: MapGeometryWithData[] = [];

    pointShapeVisualization: Visualization = new PointShapeVisualization(3);
    areaShapeVisualization: Visualization = new AreaShapeVisualization(1);
    colorVisualization: Visualization = new ColorVisualization('red');
    labelVisualization: Visualization = new LabelVisualization();

    // Computed (Not used in copy)
    isActive: boolean = true;
    isRemoved: boolean = false;
    index: number = -1;

    constructor(name: string) {
        this.name = name;
    }

    copy() {
        // Do not copy isActive and isRemoved, because we use the copy to check if
        // anything changes so we need to rerender, but in these cases we do not need
        // to rerender.
        const copy = new MapLayer(this.name).addData(
            this.data.map((d) => d.copy()),
        );
        copy.pointShapeVisualization = this.pointShapeVisualization.copy();
        copy.areaShapeVisualization = this.areaShapeVisualization.copy();
        copy.colorVisualization = this.colorVisualization.copy();
        copy.labelVisualization = this.labelVisualization.copy();
        return copy;
    }

    addData(data: MapGeometryWithData[]) {
        data.forEach((d) => (d.layer = this));
        this.data.push(...data);
        return this;
    }
}

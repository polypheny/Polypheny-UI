import {Visualization} from './visualization.interface';
import {MapGeometryWithData} from './RowResult.model';
import {ColorVisualization} from '../components/visualization/color-visualization-model';
import {AreaShapeVisualization} from "../components/visualization/area-shape-visualization.model";
import {LabelVisualization} from "../components/visualization/label-visualization-model";
import {PointShapeVisualization} from "../components/visualization/point-shape-visualization.model";
import {CombinedResult} from "../../../../components/data-view/data-view.model";
import {DataModel} from "../../../../models/ui-request.model";
import {GeoJSON, Geometry} from "geojson";

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

    static from(result: CombinedResult): MapLayer {
        console.log(result)
        const layer = new MapLayer("Query")
        const mapData = []

        switch (result.dataModel) {
            case DataModel.DOCUMENT:
                for (let i = 0; i < result.data.length; i++) {
                    const json = result.data[i][0];
                    const jsonObject: Record<string, any> = JSON.parse(json)
                    const geometry = this.getGeometryFromData(jsonObject)
                    if (geometry) {
                        const geometryWithData = new MapGeometryWithData(i, geometry, jsonObject)
                        mapData.push(geometryWithData)
                    }
                }
                break;
            case DataModel.RELATIONAL:
                break;
            case DataModel.GRAPH:
                break;
            default:
                throw Error(`Cannot convert CombinedResult to MapLayer. Unknown document model: ${result.dataModel}`);
        }
        layer.addData(mapData);
        return layer
    }

    static getGeometryFromData(data: Record<string, any>): Geometry | undefined {
        // GeoJSON object
        if ("geometry" in data) {
            return data["geometry"]
        }

        // Detect 2 columns that store lattidue / longitude coordinates
        const latLong = [
            ["lat", "lon"],
            ["latitude", "longitude"],
            ["lati", 'long'],
        ]
        const isNumber = (value: any): boolean => {
            return typeof value === 'number' && !isNaN(value);
        };

        for (const ll of latLong) {
            const lat = ll[0]
            const lon = ll[1]

            if (lat in data && lon in data && isNumber(data[lat]) && isNumber(data[lon])) {
                return {
                    type: "Point",
                    coordinates: [data[lat], data[lon]]
                }
            }
        }

        // TODO: Detect heuristic, so that we can automatically detect the most common geometry types
        //   - string in wkt format
        //   - If we are inside SQL, we should be able to use the schema, to detect Geometry objects?

        return undefined
    }
}

import {Visualization} from './visualization.interface';
import {MapGeometryWithData} from './RowResult.model';
import {ColorVisualization} from '../components/visualization/color-visualization-model';
import {AreaShapeVisualization} from '../components/visualization/area-shape-visualization.model';
import {LabelVisualization} from '../components/visualization/label-visualization-model';
import {PointShapeVisualization} from '../components/visualization/point-shape-visualization.model';
import {CombinedResult} from '../../../../components/data-view/data-view.model';
import {DataModel} from '../../../../models/ui-request.model';
import {Geometry} from 'geojson';

export class MapLayer {

    constructor(name: string) {
        this.name = name;
    }

    name: string;
    data: MapGeometryWithData[] = [];

    pointShapeVisualization: Visualization = new PointShapeVisualization(3);
    areaShapeVisualization: Visualization = new AreaShapeVisualization(1);
    colorVisualization: Visualization = new ColorVisualization('red');
    labelVisualization: Visualization = new LabelVisualization();

    // Computed (Not used in copy)
    isActive = true;
    isRemoved = false;
    index = -1;

    static from(result: CombinedResult): MapLayer {
        console.log(result);
        const layer = new MapLayer('Query');
        const mapData = [];

        switch (result.dataModel) {
            case DataModel.DOCUMENT:
                for (let rowIndex = 0; rowIndex < result.data.length; rowIndex++) {
                    const json = result.data[rowIndex][0];
                    const jsonObject: Record<string, any> = Object.fromEntries(
                        Object.entries(JSON.parse(json)).map(([key, value]) => [key.toLowerCase(), value])
                    );
                    const geometry = this.getGeometryFromData(jsonObject);
                    if (geometry) {
                        const geometryWithData = new MapGeometryWithData(rowIndex, geometry, jsonObject);
                        mapData.push(geometryWithData);
                    }
                }
                break;
            case DataModel.RELATIONAL:
                for (let rowIndex = 0; rowIndex < result.data.length; rowIndex++) {
                    const map = new Map<string, any>();
                    for (let headerIndex = 0; headerIndex < result.header.length; headerIndex++) {
                        // TODO: Geometry objects
                        const header = result.header[headerIndex];
                        const key = header.name.toLowerCase();
                        const value = result.data[rowIndex][headerIndex];
                        if (header.dataType.startsWith('INTEGER')) {
                            map.set(key, parseInt(value, 10));
                        } else if (header.dataType.startsWith('DECIMAL')) {
                            map.set(key, parseFloat(value));
                        } else {
                            map.set(key, value);
                        }
                    }
                    const geometry = this.getGeometryFromData(map);
                    console.log(geometry);
                    if (geometry) {
                        const geometryWithData = new MapGeometryWithData(rowIndex, geometry, map);
                        mapData.push(geometryWithData);
                    }
                }
                break;
            case DataModel.GRAPH:
                for (let rowIndex = 0; rowIndex < result.data.length; rowIndex++) {
                    const map = new Map<string, any>();
                    for (let headerIndex = 0; headerIndex < result.header.length; headerIndex++) {
                        const header = result.header[headerIndex];
                        const key = header.name.toLowerCase();
                        const datatype = header.dataType;
                        const value = result.data[rowIndex][headerIndex];

                        if (datatype.startsWith('NODE')) {
                            const json = JSON.parse(value);
                            const properties = json['properties'];
                            const propertiesLowercase: Record<string, any> = Object.fromEntries(
                                Object.entries(properties).map(([key, value]) => [key.toLowerCase(), value])
                            );
                            // Node stored as JSON
                            map.set(key, propertiesLowercase);
                        } else {
                            // Other value
                            map.set(key, value);
                        }
                    }

                    const geometry = this.getGeometryFromData(map);
                    if (geometry) {
                        const geometryWithData = new MapGeometryWithData(rowIndex, geometry, map);
                        mapData.push(geometryWithData);
                    }
                }
                break;
            default:
                throw Error(`Cannot convert CombinedResult to MapLayer. Unknown document model: ${result.dataModel}`);
        }
        layer.addData(mapData);
        layer.index = 1;
        console.log('Created layer: ', layer);
        return layer;
    }

    static getGeometryFromData(data: Record<string, any>): Geometry | undefined {
        // GeoJSON object
        if ('geometry' in data) {
            return data['geometry'];
        }

        // Detect 2 columns that store latitude / longitude coordinates
        const latLong = [
            ['lat', 'lon'],
            ['latitude', 'longitude'],
            ['lati', 'long'],
        ];
        const isNumber = (value: any): boolean => {
            return typeof value === 'number' && !isNaN(value);
        };

        for (const ll of latLong) {
            const lat = ll[0];
            const lon = ll[1];

            if (data.has(lat) &&
                data.has(lon) &&
                isNumber(data.get(lat)) &&
                isNumber(data.get(lon))) {
                return {
                    type: 'Point',
                    coordinates: [data.get(lon), data.get(lat)]
                };
            }
        }

        // TODO: Detect heuristic, so that we can automatically detect the most common geometry types
        //   - string in wkt format

        return undefined;
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

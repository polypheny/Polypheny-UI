import {Visualization} from './visualization.interface';
import {MapGeometryWithData} from './MapGeometryWithData.model';
import {ColorVisualization} from '../components/visualization/color-visualization-model';
import {AreaShapeVisualization} from '../components/visualization/area-shape-visualization.model';
import {LabelVisualization} from '../components/visualization/label-visualization-model';
import {PointShapeVisualization} from '../components/visualization/point-shape-visualization.model';
import {CombinedResult} from '../../../../components/data-view/data-view.model';
import {DataModel} from '../../../../models/ui-request.model';
import {Geometry, Polygon} from 'geojson';
import {v4} from 'uuid';
import * as L from 'leaflet';
import {MapLayerConfiguration} from './MapLayerConfiguration.interface';
import {DataPreview} from '../components/configuration/DataPreview';
import {FilterConfig} from '../components/configuration/FilterConfig';
import {AlgValidatorService} from '../../../../components/polyalg/polyalg-viewer/alg-validator.service';
import {PlanNode} from '../../../../components/polyalg/models/polyalg-plan.model';

export class MapLayer {

    constructor(name: string) {
        this.name = name;
        this.uuid = v4();
        this.lastUpdated = new Date().toISOString();
    }

    uuid: string;
    name: string;
    data: MapGeometryWithData[] = [];
    containsPoints = false;
    containsAreas = false;
    containsData = false;

    // Query
    isQueryLayer = false;
    query = null;
    geometryField = null;
    language = null;
    namespace = null;
    lastUpdated = '';

    // Query Filter
    planNode: PlanNode = null;

    dataPreview: MapLayerConfiguration = new DataPreview(this);
    filterConfig: FilterConfig = new FilterConfig(this);
    pointShapeVisualization: PointShapeVisualization = new PointShapeVisualization(3);
    areaShapeVisualization: Visualization = new AreaShapeVisualization(1);
    colorVisualization: Visualization = new ColorVisualization('red', this);
    labelVisualization: Visualization = new LabelVisualization();

    // Computed (Not used in copy)
    isActive = true;
    isRemoved = false;
    index = -1;

    static from(result: CombinedResult): MapLayer {
        console.log('MapLayer from result: ', result);
        const layer = new MapLayer(result.query);
        layer.query = result.query;
        layer.language = result.language;
        layer.namespace = result.namespace;
        layer.isQueryLayer = true;
        const mapData = [];
        let geometryField = undefined;

        switch (result.dataModel) {
            case DataModel.DOCUMENT:
                for (let rowIndex = 0; rowIndex < result.data.length; rowIndex++) {
                    const json = result.data[rowIndex][0];
                    const jsonObject = Object.fromEntries(
                        Object.entries(JSON.parse(json)).map(([key, value]) => [key.toLowerCase(), value])
                    );
                    const [geometry, key] = this.getGeometryFromData(jsonObject);
                    if (geometry) {
                        geometryField = key;
                        const geometryWithData = new MapGeometryWithData(rowIndex, geometry, jsonObject);
                        mapData.push(geometryWithData);
                    }
                }
                break;

            case DataModel.RELATIONAL:
                for (let rowIndex = 0; rowIndex < result.data.length; rowIndex++) {
                    const obj: Record<string, any> = {};

                    for (let headerIndex = 0; headerIndex < result.header.length; headerIndex++) {
                        const header = result.header[headerIndex];
                        const key = header.name.toLowerCase();
                        const value = result.data[rowIndex][headerIndex];

                        if (header.dataType.startsWith('GEOMETRY')) {
                            obj[key] = JSON.parse(value);
                        } else if (header.dataType.startsWith('INTEGER')) {
                            obj[key] = parseInt(value, 10);
                        } else if (header.dataType.startsWith('DECIMAL')) {
                            obj[key] = parseFloat(value);
                        } else if (header.dataType.startsWith('DOUBLE')) {
                            obj[key] = parseFloat(value);
                        }
                        else {
                            obj[key] = value;
                        }
                    }

                    const [geometry, key] = this.getGeometryFromData(obj);
                    if (geometry) {
                        geometryField = key;
                        const geometryWithData = new MapGeometryWithData(rowIndex, geometry, obj);
                        mapData.push(geometryWithData);
                    }
                }
                break;

            case DataModel.GRAPH:
                for (let rowIndex = 0; rowIndex < result.data.length; rowIndex++) {
                    const obj: Record<string, any> = {};

                    for (let headerIndex = 0; headerIndex < result.header.length; headerIndex++) {
                        const header = result.header[headerIndex];
                        const key = header.name.toLowerCase();
                        const datatype = header.dataType;
                        const value = result.data[rowIndex][headerIndex];

                        if (datatype.startsWith('NODE')) {
                            const json = JSON.parse(value);
                            const properties = json['properties'];
                            // Node stored as JSON
                            obj[key] = Object.fromEntries(
                                Object.entries(properties).map(([key, value]) => [key.toLowerCase(), value])
                            );
                        } else {
                            // Other value
                            obj[key] = value;
                        }
                    }

                    const [geometry, key] = this.getGeometryFromData(obj);
                    if (geometry) {
                        geometryField = key;
                        const geometryWithData = new MapGeometryWithData(rowIndex, geometry, obj);
                        mapData.push(geometryWithData);
                    }
                }
                break;

            default:
                throw Error(`Cannot convert CombinedResult to MapLayer. Unknown document model: ${result.dataModel}`);
        }

        if (mapData.length > 0){
            layer.addData(mapData);
            layer.geometryField = geometryField;
        }

        console.log(`Created layer with ${layer.data.length}: data points:`, layer);
        return layer;
    }


    static getGeometryFromData(data: Record<string, any>): [Geometry, string] | undefined {
        // Detect GeoJSON objects
        for (const key in data) {
            if (data.hasOwnProperty(key) && this.isGeoJSON(data[key])) {
                return [data[key], key];
            }
        }

        // TODO: If we do this, we cannot filter the layer, because we do not have a single field
        //       that we can use in the logical plan to reference the coordinates.
        // Detect 2 columns that store latitude / longitude coordinates
        // const latLong = [
        //     ['lat', 'lon'],
        //     ['latitude', 'longitude'],
        //     ['lati', 'long'],
        // ];
        // const isNumber = (value: any): boolean => {
        //     return typeof value === 'number' && !isNaN(value);
        // };
        //
        // for (const ll of latLong) {
        //     const lat = ll[0];
        //     const lon = ll[1];
        //
        //     if (
        //         data.hasOwnProperty(lat) &&
        //         data.hasOwnProperty(lon) &&
        //         isNumber(data[lat]) &&
        //         isNumber(data[lon])
        //     ) {
        //         return {
        //             type: 'Point',
        //             coordinates: [data[lon], data[lat]],
        //         };
        //     }
        // }

        // TODO: Detect heuristic, so that we can automatically detect the most common geometry types
        //   - string in WKT format

        return [undefined, undefined];
    }


    static isGeoJSON(obj: any): boolean {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        const validTypes: string[] = [
            'Feature',
            'FeatureCollection',
            'GeometryCollection',
            'Point',
            'MultiPoint',
            'LineString',
            'MultiLineString',
            'Polygon',
            'MultiPolygon',
        ];

        if (!obj.type || !validTypes.includes(obj.type)) {
            return false;
        }

        switch (obj.type) {
            case 'Feature':
                return obj.hasOwnProperty('geometry') && obj.hasOwnProperty('properties');
            case 'FeatureCollection':
                return Array.isArray(obj.features);
            case 'GeometryCollection':
                return Array.isArray(obj.geometries);
            case 'Point':
            case 'MultiPoint':
            case 'LineString':
            case 'MultiLineString':
            case 'Polygon':
            case 'MultiPolygon':
                return obj.hasOwnProperty('coordinates');
            default:
                return false;
        }
    }

    getBounds(): L.LatLng[] {
        const bounds: L.LatLng[] = [];

        for (const data of this.data) {
            switch (data.geometry.type) {
                case 'Point':
                    bounds.push(L.latLng(data.geometry.coordinates[1], data.geometry.coordinates[0]));
                    break;
                case 'LineString':
                case 'MultiPoint':
                    data.geometry.coordinates.forEach((coord: number[]) => {
                        bounds.push(L.latLng(coord[1], coord[0]));
                    });
                    break;
                case 'Polygon':
                case 'MultiLineString':
                    data.geometry.coordinates.forEach((ring: number[][]) => {
                        ring.forEach((coord: number[]) => {
                            bounds.push(L.latLng(coord[1], coord[0]));
                        });
                    });
                    break;
                case 'MultiPolygon':
                    data.geometry.coordinates.forEach((polygon: number[][][]) => {
                        polygon.forEach((ring: number[][]) => {
                            ring.forEach((coord: number[]) => {
                                bounds.push(L.latLng(coord[1], coord[0]));
                            });
                        });
                    });
                    break;
            }
        }

        return bounds;
    }

    copy(includeData = true) {
        // Do not copy isActive and isRemoved, because we use the copy to check if
        // anything changes so we need to rerender, but in these cases we do not need
        // to rerender.

        const copy = new MapLayer(this.name);
        copy.lastUpdated = this.lastUpdated;
        if (includeData) {
            copy.addData(
                this.data.map((d) => d.copy()),
            );
        }
        copy.uuid = this.uuid;
        copy.pointShapeVisualization = this.pointShapeVisualization.copy();
        copy.areaShapeVisualization = this.areaShapeVisualization.copy();
        copy.colorVisualization = this.colorVisualization.copy();
        copy.labelVisualization = this.labelVisualization.copy();
        copy.filterConfig = this.filterConfig.copy() as FilterConfig;
        return copy;
    }

    addData(data: MapGeometryWithData[], overwrite=false) {
        if (overwrite){
            this.data = [];
        }

        this.containsPoints = false;
        this.containsAreas = false;
        if (data.length > 0){
            this.containsData = Object.keys(data[0].data).length !== 0;
        }

        // Remove everything that does not have a geometry.
        data = data.filter((d) => d.geometry !== null);

        data.forEach((d) => {
            if (d.isPoint()) {
                this.containsPoints = true;
            } else {
                this.containsAreas = true;
            }
            d.layer = this;
            return;
        });
        this.data.push(...data);
        return this;
    }

    convertQueryToPlan() {
        const polyAlg = this.query; // TODO: Convert

        // this.planValidator.buildPlan(this.polyAlg, this.planType).subscribe({
        //     next: (plan) => this.polyAlgPlan.set(plan),
        //     error: (err) => {
        //         this.textEditor.setCode(this.polyAlg);
        //         this.textEditorState.set('INVALID');
        //         this.textEditorError.set(err.error.errorMsg);
        //         this.nodeEditorState.set('INVALID');
        //         this.nodeEditorError.set(err.error.errorMsg);
        //         this._toast.error('Unable to build the initial plan. It most likely contains a (yet) unsupported feature.');
        //     }
        // });
    }
}

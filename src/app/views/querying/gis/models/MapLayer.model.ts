import {Visualization} from './visualization.interface';
import {MapGeometryWithData} from './MapGeometryWithData.model';
import {ColorVisualization} from '../components/visualization/color-visualization-model';
import {AreaShapeVisualization} from '../components/visualization/area-shape-visualization.model';
import {LabelVisualization} from '../components/visualization/label-visualization-model';
import {PointShapeVisualization} from '../components/visualization/point-shape-visualization.model';
import {CombinedResult} from '../../../../components/data-view/data-view.model';
import {DataModel} from '../../../../models/ui-request.model';
import {Geometry} from 'geojson';
import {v4} from 'uuid';
import * as L from 'leaflet';
import {MapLayerConfiguration} from './MapLayerConfiguration.interface';
import {DataPreview} from '../components/configuration/DataPreview';
import {FilterConfig} from '../components/configuration/FilterConfig';
import {PlanNode} from '../../../../components/polyalg/models/polyalg-plan.model';

export class MapLayer {

    constructor() {
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
    query = '';
    geometryField = '';
    language = '';
    namespace = '';
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
    index = -1;

    static from(result: CombinedResult): MapLayer {
        console.log('MapLayer from result: ', result);
        const layer = new MapLayer();
        if (!result) {
            // Empty layer.
            return layer;
        }

        layer.name = result.query;
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
                        } else if (header.dataType.startsWith('INTEGER') || header.dataType.startsWith('BIGINT')) {
                            obj[key] = parseInt(value, 10);
                        } else if (header.dataType.startsWith('DECIMAL')) {
                            obj[key] = parseFloat(value);
                        } else if (header.dataType.startsWith('DOUBLE')) {
                            obj[key] = parseFloat(value);
                        } else {
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
                            obj[key] = this.parseKeysAsJsonRecursively(Object.fromEntries(
                                Object.entries(properties).map(([key, value]) => [key.toLowerCase(), value])
                            ));
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

        if (mapData.length > 0) {
            layer.addData(mapData);
            layer.geometryField = geometryField;
        }

        console.log(`Created layer with ${layer.data.length} data points:`, layer);
        return layer;
    }

    static parseKeysAsJsonRecursively(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            // Not a PolyMap
            return obj;
        }

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        obj[key] = this.parseKeysAsJsonRecursively(parsed);
                    } catch (e) {
                        // The value is not a PolyMap.
                    }
                } else if (typeof value === 'object') {
                    // The parsed PolyMap could contain other PolyMaps.
                    obj[key] = this.parseKeysAsJsonRecursively(value);
                }
            }
        }
        return obj;
    }

    static getGeometryFromData(data: Record<string, any>, path: string[] = []): [Geometry, string] | undefined {
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];

                if (this.isGeoJSON(value)) {
                    // Key = Path to variable, separated by dots (if key is nested).
                    return [value, [...path, key].join('.')];
                } else if (typeof value === 'object' && value !== null) {
                    // Recursively check nested objects.
                    const result = this.getGeometryFromData(value, [...path, key]);
                    if (result) {
                        return result;
                    }
                }
            }
        }
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

        const copy = new MapLayer();
        copy.name = this.name;
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

    addData(data: MapGeometryWithData[], overwrite = false) {
        if (overwrite) {
            this.data = [];
        }

        this.containsPoints = false;
        this.containsAreas = false;
        if (data.length > 0) {
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

        // Update preview object
        (this.dataPreview as DataPreview).updatePreviewObject();

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

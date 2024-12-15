import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {MapLayer} from '../models/MapLayer.model';
import {Visualization} from '../models/visualization.interface';
import {CombinedResult} from '../../../../components/data-view/data-view.model';
import {MapLayerConfiguration} from '../models/MapLayerConfiguration.interface';
import {Polygon} from 'geojson';


@Injectable({
    providedIn: 'root',
})
export class LayerSettingsService {
    // Filter
    private addLayerFilterPolygon: BehaviorSubject<MapLayer>;
    addLayerFilterPolygon$: Observable<MapLayer>;
    private removeLayerFilterPolygon: BehaviorSubject<MapLayer>;
    removeLayerFilterPolygon$: Observable<MapLayer>;
    private layerPolygonFilter: BehaviorSubject<[MapLayer, Polygon]>;
    layerPolygonFilter$: Observable<[MapLayer, Polygon]>;
    private fitLayerToMap: BehaviorSubject<MapLayer>;
    fitLayerToMap$: Observable<MapLayer>;
    private queryFromConsoleResults: BehaviorSubject<CombinedResult>;
    queryFromConsoleResults$: Observable<CombinedResult>;
    private selectedBaseLayer: BehaviorSubject<string>;
    selectedBaseLayer$: Observable<string>;
    private layers: BehaviorSubject<MapLayer[]>;
    layers$: Observable<MapLayer[]>;
    private modifiedConfig: BehaviorSubject<MapLayerConfiguration | null>;
    modifiedConfig$: Observable<MapLayerConfiguration | null>;
    private canRerenderLayers: BehaviorSubject<boolean>;
    canRerenderLayers$: Observable<boolean>;
    private rerenderButtonClickedSubject: Subject<void>;
    rerenderButtonClicked$: Observable<void>;
    private toggleLayerVisibilitySubject: Subject<MapLayer>;
    toggleLayerVisibility$: Observable<MapLayer>;

    constructor() {
        this.reset();
    }

    reset() {
        // To make sure that information from one session does not spill over the next session, we recreate all
        // reactive variables, so that they don't hold any old values. Otherwise, the next time we subscribe, we will
        // receive the most recent value, which could be from an old session.
        this.addLayerFilterPolygon = new BehaviorSubject<MapLayer>(null);
        this.addLayerFilterPolygon$ = this.addLayerFilterPolygon.asObservable();
        this.removeLayerFilterPolygon = new BehaviorSubject<MapLayer>(null);
        this.removeLayerFilterPolygon$ = this.removeLayerFilterPolygon.asObservable();
        this.layerPolygonFilter = new BehaviorSubject<[MapLayer, Polygon]>(null);
        this.layerPolygonFilter$ = this.layerPolygonFilter.asObservable();
        this.fitLayerToMap = new BehaviorSubject<MapLayer>(null);
        this.fitLayerToMap$ = this.fitLayerToMap.asObservable();
        this.queryFromConsoleResults = new BehaviorSubject<CombinedResult>(null);
        this.queryFromConsoleResults$ = this.queryFromConsoleResults.asObservable();
        this.selectedBaseLayer = new BehaviorSubject<string>('EMPTY');
        this.selectedBaseLayer$ = this.selectedBaseLayer.asObservable();
        this.layers = new BehaviorSubject<MapLayer[]>([]);
        this.layers$ = this.layers.asObservable();
        this.modifiedConfig = new BehaviorSubject<Visualization | null>(null);
        this.modifiedConfig$ = this.modifiedConfig.asObservable();
        this.canRerenderLayers = new BehaviorSubject(false);
        this.canRerenderLayers$ = this.canRerenderLayers.asObservable();
        this.rerenderButtonClickedSubject = new Subject<void>();
        this.rerenderButtonClicked$ = this.rerenderButtonClickedSubject.asObservable();
        this.toggleLayerVisibilitySubject = new Subject<MapLayer>();
        this.toggleLayerVisibility$ = this.toggleLayerVisibilitySubject.asObservable();
    }

    removePolygonFilterForLayer(layer: MapLayer) {
        this.removeLayerFilterPolygon.next(layer);
    }

    addPolygonFilterForLayer(layer: MapLayer) {
        this.addLayerFilterPolygon.next(layer);
    }

    addPolygonToLayer(layer: MapLayer, polygon: Polygon){
        this.layerPolygonFilter.next([layer, polygon]);
    }

    setFitLayerToMap(layer: MapLayer) {
        this.fitLayerToMap.next(layer);
    }

    setResultsQuery(result: CombinedResult) {
        this.queryFromConsoleResults.next(result);
    }

    setBaseLayer(item: string) {
        this.selectedBaseLayer.next(item);
    }

    setLayers(layers: MapLayer[]) {
        this.layers.next(layers);
    }

    visualizationConfigurationChanged(config: MapLayerConfiguration): void {
        this.modifiedConfig.next(config);
    }

    setCanRerenderLayers(canRerenderMap: boolean) {
        this.canRerenderLayers.next(canRerenderMap);
    }

    rerenderButtonClicked() {
        this.rerenderButtonClickedSubject.next();
    }

    toggleLayerVisibility(layer: MapLayer) {
        this.toggleLayerVisibilitySubject.next(layer);
    }
}

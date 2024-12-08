import { Injectable } from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import { MapLayer } from '../models/MapLayer.model';
import {Visualization} from '../models/visualization.interface';
import {CombinedResult} from "../../../../components/data-view/data-view.model";

@Injectable({
    providedIn: 'root',
})
export class LayerSettingsService {
    private queryFromConsoleResults = new BehaviorSubject<CombinedResult>(null);
    queryFromConsoleResults$ = this.queryFromConsoleResults.asObservable();

    private selectedBaseLayer = new BehaviorSubject<string>('EMPTY');
    selectedBaseLayer$ = this.selectedBaseLayer.asObservable();

    private layers = new BehaviorSubject<MapLayer[]>([]);
    layers$ = this.layers.asObservable();

    private modifiedVisualization = new BehaviorSubject<Visualization | null>(null);
    modifiedVisualization$ = this.modifiedVisualization.asObservable();

    private canRerenderLayers = new BehaviorSubject(false);
    canRerenderLayers$ = this.canRerenderLayers.asObservable();

    private rerenderButtonClickedSubject = new Subject<void>();
    rerenderButtonClicked$ = this.rerenderButtonClickedSubject.asObservable();

    private toggleLayerVisibilitySubject = new Subject<MapLayer>();
    toggleLayerVisibility$ = this.toggleLayerVisibilitySubject.asObservable();
    setResultsQuery(result: CombinedResult){
        this.queryFromConsoleResults.next(result);
    }
    setBaseLayer(item: string) {
        this.selectedBaseLayer.next(item);
    }
    setLayers(layers: MapLayer[]) {
        this.layers.next(layers);
    }
    visualizationConfigurationChanged(visualization: Visualization): void {
        this.modifiedVisualization.next(visualization);
    }
    setCanRerenderLayers(canRerenderMap: boolean){
        this.canRerenderLayers.next(canRerenderMap);
    }
    rerenderButtonClicked(){
        this.rerenderButtonClickedSubject.next();
    }
    toggleLayerVisibility(layer: MapLayer){
        this.toggleLayerVisibilitySubject.next(layer);
    }
}

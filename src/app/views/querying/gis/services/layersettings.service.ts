import { Injectable } from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import { MapLayer } from '../models/MapLayer.model';
import {Visualization} from "../models/visualization.interface";

@Injectable({
    providedIn: 'root',
})
export class LayerSettingsService {
    private selectedBaseLayer = new BehaviorSubject<string>('EMPTY');
    selectedBaseLayer$ = this.selectedBaseLayer.asObservable();
    setBaseLayer(item: string) {
        this.selectedBaseLayer.next(item);
    }

    private layers = new BehaviorSubject<MapLayer[]>([]);
    layers$ = this.layers.asObservable();
    setLayers(layers: MapLayer[]) {
        this.layers.next(layers);
    }

    private modifiedVisualization = new BehaviorSubject<Visualization | null>(null);
    modifiedVisualization$ = this.modifiedVisualization.asObservable();
    visualizationConfigurationChanged(visualization: Visualization): void {
        this.modifiedVisualization.next(visualization);
    }

    private canRerenderLayers = new BehaviorSubject(false);
    canRerenderLayers$ = this.canRerenderLayers.asObservable();
    setCanRerenderLayers(canRerenderMap: boolean){
        this.canRerenderLayers.next(canRerenderMap);
    }

    private rerenderButtonClickedSubject = new Subject<void>();
    rerenderButtonClicked$ = this.rerenderButtonClickedSubject.asObservable();
    rerenderButtonClicked(){
        this.rerenderButtonClickedSubject.next();
    }

    private toggleLayerVisibilitySubject = new Subject<MapLayer>();
    toggleLayerVisibility$ = this.toggleLayerVisibilitySubject.asObservable();
    toggleLayerVisibility(layer: MapLayer){
        this.toggleLayerVisibilitySubject.next(layer);
    }
}

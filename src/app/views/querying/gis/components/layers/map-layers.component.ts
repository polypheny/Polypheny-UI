import {AfterViewInit, Component, ElementRef, HostListener, OnInit, Renderer2} from '@angular/core';
import {LayerContext} from '../../models/LayerContext.model';
import {LayerSettingsService} from '../../services/layersettings.service';
import {
    ButtonCloseDirective,
    ButtonDirective,
    CardBodyComponent,
    CardComponent,
    CardHeaderComponent,
    FormControlDirective,
    FormLabelDirective,
    FormSelectDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    ListGroupDirective,
    ListGroupItemDirective,
    ModalBodyComponent,
    ModalComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    ModalTitleDirective,
    PopoverDirective,
} from '@coreui/angular';
import {MapGeometryWithData} from '../../models/RowResult.model';
import * as GeoJSON from 'geojson';
import {FeatureCollection} from 'geojson';
import {MapLayer} from '../../models/MapLayer.model';
import {AsyncPipe, NgComponentOutlet, NgForOf, NgIf} from '@angular/common';
import isEqual from 'lodash/isEqual';
import {
    CdkDrag,
    CdkDragDrop,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
import {FormsModule} from '@angular/forms';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {ConfigSectionComponent} from '../config-section/config-section.component';
// noinspection ES6UnusedImports
import {getSampleMapLayers} from '../../models/get-sample-maplayers';

type BaseLayer = { name: string; value: string };

@Component({
    selector: 'app-map-layers',
    standalone: true,
    imports: [
        FormLabelDirective,
        FormControlDirective,
        AsyncPipe,
        NgComponentOutlet,
        NgIf,
        ModalComponent,
        ModalHeaderComponent,
        ModalBodyComponent,
        ModalFooterComponent,
        ModalTitleDirective,
        ButtonCloseDirective,
        ButtonDirective,
        CdkDropList,
        CdkDrag,
        CdkDragPlaceholder,
        CdkDragHandle,
        InputGroupComponent,
        InputGroupTextDirective,
        FormSelectDirective,
        FormsModule,
        NgForOf,
        CardComponent,
        CardHeaderComponent,
        CardBodyComponent,
        PopoverDirective,
        NgxJsonViewerModule,
        ConfigSectionComponent,
        ListGroupDirective,
        ListGroupItemDirective,
    ],
    templateUrl: './map-layers.component.html',
    styleUrl: './map-layers.component.scss',
    // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapLayersComponent implements OnInit, AfterViewInit {
    protected baseLayers: BaseLayer[] = [
        {
            name: 'OSM',
            value: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        },
        {
            name: 'OSM Hot',
            value: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        },
        {
            name: 'Grey Background',
            value: 'EMPTY',
        },
    ];
    protected selectedBaseLayer: BaseLayer = this.baseLayers[0];
    protected layers: MapLayer[] = [];
    protected renderedLayers: MapLayer[] = [];
    protected isAddLayerModalVisible = false;
    protected loadedGeoJsonFile?: GeoJSON.FeatureCollection = undefined;
    protected loadedGeoJsonFileName: string = '';
    protected anyLayersVisible = false;
    protected addLayerModes: LayerContext[] = [
        LayerContext.Results,
        LayerContext.Query,
        LayerContext.DB,
        LayerContext.External,
    ];
    protected addLayerMode: LayerContext = LayerContext.DB;
    protected datasetToUrl = new Map<string, string>([
        ['Genealogy (100, data)', 'gedcom_coordinates_100_data.geojson'],
        ['Genealogy (Full, no data)', 'gedcom_coordinates_full.geojson'],
        ['Landkreise (D)', 'landkreise_simplify200.geojson'],
        ['Basel Stadt Bevölkerung Quartiere', 'bs-stadt-bevoelkerung.geojson'],
        ['Leeds Litter Bins', 'LitterBins20211201.geojson'],
        ['Bern Urban Heat', 'bern-urban-heat.json'],
    ]);
    protected polyphenyDatasets = Array.from(this.datasetToUrl.keys());
    protected selectedPolyphenyDataset = '';

    // Correctly set height.
    private pollingTimer: any;
    private pollingDuration: number = 3000; // 3 seconds
    private pollInterval: number = 500; // Poll every 500ms
    private lastHeight: string = "";

    constructor(
        protected layerSettings: LayerSettingsService,
        private el: ElementRef,
        private renderer: Renderer2
        // private cdRef: ChangeDetectorRef,
    ) {
    }

    ngAfterViewInit(): void {
        this.startPollingHeight();
    }

    ngOnInit(): void {
        this.layerSettings.layers$.subscribe((layers) => {
            if (!layers) {
                return;
            }

            this.layers = layers;
            this.renderedLayers = this.deepCopyLayers(layers);
            this.layerSettings.setCanRerenderLayers(false);

            // Disable Change Detection and manually trigger to prevent rerenders when mouse moves
            // this.cdRef.markForCheck();
        });

        this.layerSettings.modifiedVisualization$.subscribe((config) => {
            if (!config) {
                return;
            }

            const canRerenderLayers = !isEqual(
                this.deepCopyLayers(this.layers),
                this.renderedLayers,
            );
            console.log('Config changed. Rerender layers?', canRerenderLayers);
            this.layerSettings.setCanRerenderLayers(canRerenderLayers);
        });

        this.layerSettings.rerenderButtonClicked$.subscribe(() => {
            this.updateLayers(this.layers);
        });

        this.updateLayers(getSampleMapLayers());
    }

    @HostListener('window:resize')
    onResize(): void {
        this.setMapHeight(this.getMapHeight());
    }

    private startPollingHeight(): void {
        // A bit dirty, but it works for now. For some reason, a second after the map is created, the size changes.
        // We just poll for the first few seconds after the component is created, and update the size if it changes.
        const endTime = Date.now() + this.pollingDuration;
        this.pollingTimer = setInterval(() => {
            const currentHeight = this.getMapHeight();
            if (currentHeight != this.lastHeight){
                this.setMapHeight(currentHeight);
            } else {
                if (Date.now() > endTime){
                    clearInterval(this.pollingTimer);
                }
            }
        }, this.pollInterval);
    }

    private getMapHeight(): string {
        return `${(document.querySelector("#map") as HTMLElement).offsetHeight}px`
    }

    private setMapHeight(mapHeight: string): void {
        this.lastHeight = mapHeight;
        this.renderer.setStyle(this.el.nativeElement, 'height', mapHeight);
    }

    deepCopyLayers(layers: MapLayer[]) {
        return layers.map((layer) => layer.copy());
    }

    async loadGeoJsonFile($event: Event) {
        if (!event) {
            return;
        }
        try {
            const input = event.target as HTMLInputElement;
            if (input.files && input.files.length) {
                const file = input.files[0];
                this.loadedGeoJsonFileName = file.name;
                this.loadedGeoJsonFile = JSON.parse(await file.text());
            }
        } catch (error) {
            if (error instanceof Error) {
                alert(`Failed to load file: ${error.message}`);
            }
            this.loadedGeoJsonFile = undefined;
        }
    }

    removeLayer(layer: MapLayer) {
        layer.isRemoved = true;
        if (layer.isActive) {
            this.toggleLayerVisibility(layer);
            this.updateLayerUi();
        }
    }

    onBaseLayerChange(selectedLayer: BaseLayer): void {
        this.layerSettings.setBaseLayer(selectedLayer.value);
    }

    // onLayerVisualizationChange(
    //     selectedLayer: MapLayer,
    //     selectedVisualization: Visualization,
    // ) {
    //     selectedLayer.updateConfigInjector();
    //     this.layerSettings.visualizationConfigurationChanged(
    //         selectedLayer.visualization,
    //     );
    // }

    addLayerInternal(layer: MapLayer) {
        const newLayers = [
            layer,
            ...this.layers.filter((l) => !l.isRemoved),
        ].map((v, i) => {
            v.index = i + 1;
            return v;
        });
        this.updateLayers(newLayers);
    }

    async fetchGeoJsonFile(url: string): Promise<FeatureCollection> {
        const response = await window.fetch(url, {
            method: 'GET',
            headers: {
                'content-type': 'application/json;charset=UTF-8',
            },
        });
        const geojson: GeoJSON.FeatureCollection = await response.json();
        return geojson;
    }

    async addLayer() {
        switch (this.addLayerMode) {
            case LayerContext.Query:
            case LayerContext.Results:
            case LayerContext.DB:
                if (!this.selectedPolyphenyDataset) {
                    break;
                }
                const url = `assets/${this.datasetToUrl.get(this.selectedPolyphenyDataset)}`;
                const geojson = await this.fetchGeoJsonFile(url);
                const layer = new MapLayer(
                    this.selectedPolyphenyDataset,
                ).addData(
                    geojson.features.map(
                        (f, i) =>
                            new MapGeometryWithData(
                                i,
                                f.geometry,
                                f.properties ? f.properties : {},
                            ),
                    ),
                );
                this.addLayerInternal(layer);
                break;
            case LayerContext.External:
                if (this.loadedGeoJsonFile) {
                    const layer = new MapLayer(
                        this.loadedGeoJsonFileName,
                    ).addData(
                        this.loadedGeoJsonFile.features.map(
                            (f, i) =>
                                new MapGeometryWithData(
                                    i,
                                    f.geometry,
                                    f.properties ? f.properties : {},
                                ),
                        ),
                    );
                    console.log('Added GeoJSON layer: ', layer);
                    this.addLayerInternal(layer);
                } else {
                    alert(`No file selected / File could not be loaded.`);
                }
                break;
        }
        this.isAddLayerModalVisible = false;
    }

    dropLayer(event: CdkDragDrop<MapLayer[]>) {
        // TODO: After dropping a layer, the UI is very buggy
        moveItemInArray(this.layers, event.previousIndex, event.currentIndex);
        this.updateLayers(this.layers);
    }

    updateLayers(newLayers: MapLayer[]) {
        this.layerSettings.setLayers(newLayers);
        this.updateLayerUi();
    }

    toggleLayerVisibility(layer: MapLayer) {
        layer.isActive = !layer.isActive;
        this.layerSettings.toggleLayerVisibility(layer);
    }

    toggleAddLayerModalVisibility() {
        this.isAddLayerModalVisible = !this.isAddLayerModalVisible;
    }

    addLayerModalVisibilityChanged(event: any) {
        this.isAddLayerModalVisible = event;
    }

    updateLayerUi() {
        // Layers which are first in the array are rendered first, and will be drawn over by other layers.
        // Layers: BOTTOM -> TOP
        const visibleLayers = this.layers.filter((d) => !d.isRemoved);
        for (let i = 0; i < visibleLayers.length; i++) {
            visibleLayers[visibleLayers.length - 1 - i].index = i + 1;
        }
        this.anyLayersVisible =
            this.layers.filter((d) => !d.isRemoved).length > 0;
    }

    protected readonly Object = Object;
    protected readonly LayerContext = LayerContext;
}

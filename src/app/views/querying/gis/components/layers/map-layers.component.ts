import {
    AfterViewInit, Component, effect,
    ElementRef,
    HostListener,
    inject, OnDestroy,
    OnInit,
    Renderer2, signal, ViewChild, WritableSignal
} from '@angular/core';
import {LayerContext} from '../../models/LayerContext.model';
import {LayerSettingsService} from '../../services/layersettings.service';
import {MapGeometryWithData} from '../../models/MapGeometryWithData.model';
import * as GeoJSON from 'geojson';
import {FeatureCollection} from 'geojson';
import {MapLayer} from '../../models/MapLayer.model';
import isEqual from 'lodash/isEqual';
import {
    CdkDragDrop,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
// noinspection ES6UnusedImports
import {getSampleMapLayers} from '../../models/get-sample-maplayers';
import {CrudService} from '../../../../../services/crud.service';
import {WebSocket} from '../../../../../services/webSocket';
import {Result} from '../../../../../components/data-view/models/result-set.model';
import {WebuiSettingsService} from '../../../../../services/webui-settings.service';
import {Subscription} from 'rxjs';
import {QueryRequest} from '../../../../../models/ui-request.model';
import {CombinedResult} from '../../../../../components/data-view/data-view.model';
import {CatalogService} from '../../../../../services/catalog.service';
import {QueryEditor} from '../../../console/components/code-editor/query-editor.component';

interface BaseLayer {
    name: string;
    value: string;
}

@Component({
    selector: 'app-map-layers',
    templateUrl: './map-layers.component.html',
    styleUrl: './map-layers.component.scss',
})
export class MapLayersComponent implements OnInit, AfterViewInit, OnDestroy {

    constructor(
        protected layerSettings: LayerSettingsService,
        private el: ElementRef,
        private renderer: Renderer2,
    ) {
        this.websocket = new WebSocket();
        this.initWebsocket();

        // Starting a new GIS query session: Remove all layers which were previously added and not cleaned up.
        this.updateLayers([])

        effect(() => {
            const res = this.results();
            if (res.length > 0) {
                const combinedResult = CombinedResult.from(res[0]);
                if (combinedResult.error) {
                    this.addLayerDialogErrorMessage = `There was an error executing the query. Error: ${combinedResult.error}`;
                } else {
                    this.addLayerInternal(MapLayer.from(combinedResult));
                    localStorage.setItem(this.LOCAL_STORAGE_LAST_QUERY_KEY, combinedResult.query);
                    this.isAddLayerModalVisible = false;
                }
            }
        });
    }

    ngOnDestroy(): void {
        // This component is only destroyed once we navigate away from the Map-Based Query Mode. In this case,
        // we want to remove everything that belongs to this session.
        // Note: Don't do the same thing for the map: Because when we are navigating from the results to the full
        //       query mode, we want to keep the session going, and transfer the last-run query over.
        this.layerSettings.reset();
        this.subscriptions.unsubscribe();
        clearInterval(this.pollingTimer);
    }

    // DI
    private readonly _crud = inject(CrudService);
    private readonly _settings = inject(WebuiSettingsService);
    public readonly _catalog = inject(CatalogService);

    @ViewChild(QueryEditor) queryEditor!: QueryEditor;

    // Querying
    websocket: WebSocket;
    results: WritableSignal<Result<any, any>[]> = signal([]);
    readonly language: WritableSignal<string> = signal('sql');
    private subscriptions = new Subscription();
    private readonly LOCAL_STORAGE_LAST_QUERY_KEY = 'last_query_gis';

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

    // Add Layer
    protected isAddLayerModalVisible = false;
    protected addLayerDialogErrorMessage = '';
    protected loadedGeoJsonFile?: GeoJSON.FeatureCollection = undefined;
    protected loadedGeoJsonFileName = '';
    protected anyLayersVisible = false;
    protected addLayerModes: LayerContext[] = [
        // LayerContext.Results,
        LayerContext.Query,
        // LayerContext.DB,
        LayerContext.External,
    ];
    protected addLayerMode: LayerContext = LayerContext.Query;

    // Correctly set height.
    private pollingTimer: any;
    private lastHeight = '';
    protected readonly Object = Object;
    protected readonly LayerContext = LayerContext;
    protected readonly queryLanguages = ['CYPHER', 'SQL', 'MQL'];
    readonly activeNamespace: WritableSignal<string> = signal(null);

    private initWebsocket() {
        const sub = this.websocket.onMessage().subscribe({
            next: msg => {
                if (Array.isArray(msg) && ((msg[0].hasOwnProperty('data') || msg[0].hasOwnProperty('affectedTuples') || msg[0].hasOwnProperty('error')))) { // array of ResultSet
                    this.results.set(<Result<any, any>[]>msg);
                }
            },
            error: err => {
                //this._leftSidebar.setError('Lost connection with the server.');
                setTimeout(() => {
                    this.initWebsocket();
                }, +this._settings.getSetting('reconnection.timeout'));
            }
        });
        this.subscriptions.add(sub);
    }

    ngAfterViewInit(): void {
        this.startPollingHeight();
        const lastQuery = localStorage.getItem(this.LOCAL_STORAGE_LAST_QUERY_KEY);
        if (lastQuery) {
            this.queryEditor.setCode(lastQuery);
        }
    }

    ngOnInit(): void {
        this.subscriptions.add(this.layerSettings.layers$.subscribe((layers) => {
            this.layers = layers;
            this.renderedLayers = this.deepCopyLayers(layers, false);
            this.layerSettings.setCanRerenderLayers(false);
            this.updateLayerUi();
        }))

        this.subscriptions.add(this.layerSettings.modifiedVisualization$.subscribe((config) => {
            if (!config) {
                return;
            }

            const canRerenderLayers = !isEqual(
                this.deepCopyLayers(this.layers, false),
                this.renderedLayers,
            );
            this.layerSettings.setCanRerenderLayers(canRerenderLayers);
        }));

        this.subscriptions.add(this.layerSettings.rerenderButtonClicked$.subscribe(() => {
            this.updateLayers(this.layers);
        }));

        this.subscriptions.add(this.layerSettings.queryFromConsoleResults$.subscribe((query) => {
            if (query){
                console.log("Run full query from results", query);
                this.submitQuery(query.query, query.language.toString(), query.namespace);
                // Remove it, so that if we navigate away and back again, we won't run the query twice.
                this.layerSettings.setResultsQuery(null);
            }
        }));

        // this.updateLayers(getSampleMapLayers());
    }

    trackByLayerUuid(index: number, layer: MapLayer): string {
        return layer.uuid;
    }

    @HostListener('window:resize')
    onResize(): void {
        this.setMapHeight(this.getMapHeight());
    }

    private startPollingHeight(): void {
        // A bit dirty, but it works for now. For some reason, a second after the map is created, the size changes.
        // We just poll for the first few seconds after the component is created, and update the size if it changes.
        const endTime = Date.now() + 3000;
        this.pollingTimer = setInterval(() => {
            const currentHeight = this.getMapHeight();

            if (currentHeight === undefined){
                return
            }

            if (currentHeight !== this.lastHeight) {
                this.setMapHeight(currentHeight);
            }
            // TODO: Somehow, sometimes, the onResize event does not capture all changes in the viewport, e.g.
            //       when interacting with windows snapping or doing other fast stuff. For now, just always poll while
            //       the component is active.
            // else {
            //     if (Date.now() > endTime) {
            //         clearInterval(this.pollingTimer);
            //     }
            // }
        }, 500);
    }

    private getMapHeight(): string | undefined {
        const elem = (document.querySelector('#map') as HTMLElement)
        if (elem === null){
            return undefined
        } else {
            return `${elem.offsetHeight}px`
        }
    }

    private setMapHeight(mapHeight: string): void {
        this.lastHeight = mapHeight;
        this.renderer.setStyle(this.el.nativeElement, 'height', mapHeight);
    }

    deepCopyLayers(layers: MapLayer[], includeData = true) {
        // We only case if the configuration has changed. Copying the data over every time something changes would
        // cause big performance problems.
        return layers.map((layer) => layer.copy(includeData));
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
                console.log("Loaded GeoJSON file!")
            }
        } catch (error) {
            if (error instanceof Error) {
                alert(`Failed to load file: ${error.message}`);
            }
            this.loadedGeoJsonFile = undefined;
        }
    }

    fitLayerToMap(layer: MapLayer){
        this.layerSettings.setFitLayerToMap(layer);
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

    submitQuery(query: string, language: string, namespace: string) : boolean {
        const request = new QueryRequest(query, false, false, language, namespace);
        request.noLimit = true;
        return this._crud.anyQuery(this.websocket, request)
    }

    filterLayer(layer: MapLayer){
        console.log("Filter layer", layer)
        this.layerSettings.addPolygonFilterForLayer(layer);
    }

    async addLayer() {
        this.addLayerDialogErrorMessage = '';

        switch (this.addLayerMode) {
            case LayerContext.Query:
                if (!this.submitQuery(this.queryEditor.getCode(), this.language(), this.activeNamespace())){
                    this.addLayerDialogErrorMessage = 'There was an error executing this query.';
                }
                // Dialog will be hidden when result has arrived in constructor.effect, because it is possible to
                // get the error in the result, and not directly here.
                break;
            case LayerContext.Results:
            case LayerContext.DB:
                alert('TODO');
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
                    this.isAddLayerModalVisible = false;
                    this.addLayerInternal(layer);
                } else {
                    this.addLayerDialogErrorMessage = 'No file selected / File could not be loaded.';
                }
                break;
        }
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
}

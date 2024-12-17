import {
    AfterViewInit,
    Component,
    effect,
    ElementRef,
    HostListener,
    inject,
    OnDestroy,
    OnInit,
    Renderer2,
    signal,
    ViewChild,
    WritableSignal
} from '@angular/core';
import {LayerContext} from '../../models/LayerContext.model';
import {LayerSettingsService} from '../../services/layersettings.service';
import {MapGeometryWithData} from '../../models/MapGeometryWithData.model';
import * as GeoJSON from 'geojson';
import {FeatureCollection} from 'geojson';
import {MapLayer} from '../../models/MapLayer.model';
import isEqual from 'lodash/isEqual';
import {CdkDragDrop, moveItemInArray,} from '@angular/cdk/drag-drop';
// noinspection ES6UnusedImports
import {getSampleMapLayers} from '../../models/get-sample-maplayers';
import {CrudService} from '../../../../../services/crud.service';
import {WebSocket} from '../../../../../services/webSocket';
import {RelationalResult, Result} from '../../../../../components/data-view/models/result-set.model';
import {WebuiSettingsService} from '../../../../../services/webui-settings.service';
import {Subscription} from 'rxjs';
import {DataModel, PolyAlgRequest, QueryRequest} from '../../../../../models/ui-request.model';
import {CombinedResult} from '../../../../../components/data-view/data-view.model';
import {CatalogService} from '../../../../../services/catalog.service';
import {QueryEditor} from '../../../console/components/code-editor/query-editor.component';
import {AlgValidatorService, trimLines} from '../../../../../components/polyalg/polyalg-viewer/alg-validator.service';
import {SidebarNode} from '../../../../../models/sidebar-node.model';
import {InformationGroup, InformationPage} from '../../../../../models/information-page.model';
import {AlgViewerComponent} from '../../../../../components/polyalg/polyalg-viewer/alg-viewer.component';
import {geojsonToWKT} from '@terraformer/wkt';


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
        this.updateLayers([]);

        effect(() => {
            const res = this.results();
            if (res.length > 0) {
                const combinedResult = CombinedResult.from(res[0]);
                if (combinedResult.error) {
                    this.addLayerDialogErrorMessage = `There was an error executing the query. Error: ${combinedResult.error}`;
                } else {
                    const queryLayer = MapLayer.from(combinedResult);

                    if (this.lastQueryAnalyzerId && this.lastQueryAnalyzerPage) {
                        this._crud.getAnalyzerPage(this.lastQueryAnalyzerId, this.lastQueryAnalyzerPage).subscribe({
                            next: res => {
                                const informationPage = res as InformationPage;
                                const groups = new Map<string, InformationGroup>(Object.entries(informationPage.groups));
                                for (const group of groups.values()) {
                                    const informationObjects = Object.values(group.informationObjects);
                                    for (const informationObject of informationObjects) {
                                        if (informationObject.type === 'InformationPolyAlg') {
                                            queryLayer.jsonPolyAlg = informationObject.jsonPolyAlg;
                                            queryLayer.planNode = JSON.parse(informationObject.jsonPolyAlg);
                                        }
                                    }
                                }
                            }, error: err => {
                                console.log(err);
                            }
                        });
                    }

                    console.log('this.addDataToExistingLayer', this.addDataToExistingLayer);
                    if (this.addDataToExistingLayer) {
                        this.addDataToExistingLayer.data = queryLayer.data;
                        this.addDataToExistingLayer.query = queryLayer.query;
                        // This timestamp will trigger the change detection.
                        this.addDataToExistingLayer.lastUpdated = queryLayer.lastUpdated;
                        this.addDataToExistingLayer = null;
                        this.checkCanRerender();
                    } else {
                        this.addLayerInternal(queryLayer);
                    }
                    localStorage.setItem(this.LOCAL_STORAGE_LAST_QUERY_KEY, combinedResult.query);
                    this.isAddLayerModalVisible = false;
                }
            }
        });
    }

    // DI
    private readonly _crud = inject(CrudService);
    private readonly _settings = inject(WebuiSettingsService);
    public readonly _catalog = inject(CatalogService);
    public readonly _validator = inject(AlgValidatorService);

    @ViewChild(QueryEditor) queryEditor!: QueryEditor;
    @ViewChild(AlgViewerComponent) algViewerComponent!: AlgViewerComponent;

    // Querying
    websocket: WebSocket;
    results: WritableSignal<Result<any, any>[]> = signal([]);
    readonly language: WritableSignal<string> = signal('sql');
    private subscriptions = new Subscription();
    private readonly LOCAL_STORAGE_LAST_QUERY_KEY = 'last_query_gis';
    private addDataToExistingLayer: MapLayer = null;
    private lastQueryAnalyzerId = null;
    private lastQueryAnalyzerPage = null;
    private applyFilterToLayer: MapLayer = null;

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

    runPolyPlan(layer: MapLayer) {
        if (this.applyFilterToLayer || this.addDataToExistingLayer) {
            console.log('Another query is already in progress. Wait for it to finish.');
            return;
        }

        this.applyFilterToLayer = layer;
        this.addDataToExistingLayer = layer;
        this.algViewerComponent.setPolyAlgPlan(layer.planNode, 'LOGICAL');
    }

    onPolyPlanChanged(polyPlan: string) {
        if (!this.applyFilterToLayer || !polyPlan) {
            return;
        }

        console.log('onPolyPlanChanged', polyPlan, this.applyFilterToLayer);

        let plan = '';

        if (this.applyFilterToLayer.language === 'mongo') {
            const wkt = geojsonToWKT(this.applyFilterToLayer.tempPolygon);
            plan = `DOC_FILTER[MQL_GEO_WITHIN(
                ${this.applyFilterToLayer.geometryField}, 
                SRID=4326;${wkt}:DOCUMENT, -1.0E0:DOCUMENT)](
                  ${polyPlan})`;
            plan = trimLines(plan);
        }

//         plan = `DOC_FILTER[MQL_GEO_WITHIN(geometry, SRID=4326;POLYGON ((12.535400390625002 52.92215137976296, 13.458251953125002 51.15178610143037, 15.128173828125002 51.41291212935532, 14.930419921875002 53.553362785528094, 13.348388671875002 53.6185793648952, 12.535400390625002 52.92215137976296)):DOCUMENT, -1.0E0:DOCUMENT)](
//   DOC_SCAN[doc.geocollection2]
// )`;

        console.log('Run plan:', plan);
        const request = new PolyAlgRequest(plan, DataModel.DOCUMENT, 'LOGICAL');
        request.noLimit = true;
        const success = this.websocket.sendMessage(request);
        console.log('success', success);
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

    private initWebsocket() {
        const sub = this.websocket.onMessage().subscribe({
            next: msg => {
                console.log('msg: ', msg);
                if (Array.isArray(msg) && msg[0].hasOwnProperty('routerLink')) {
                    const sidebarNodesTemp: SidebarNode[] = <SidebarNode[]>msg;
                    const logicalQueryPlanNode = sidebarNodesTemp.filter(n => n.name === 'Logical Query Plan')[0] || null;
                    if (logicalQueryPlanNode !== null) {
                        const split = logicalQueryPlanNode.routerLink.split('/');
                        this.lastQueryAnalyzerId = split[0];
                        this.lastQueryAnalyzerPage = split[1];
                    }
                }
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
        }));

        this.subscriptions.add(this.layerSettings.modifiedConfig$.subscribe((config) => {
            if (!config) {
                return;
            }
            this.checkCanRerender();
        }));

        this.subscriptions.add(this.layerSettings.rerenderButtonClicked$.subscribe(() => {
            this.updateLayers(this.layers);
        }));

        this.subscriptions.add(this.layerSettings.queryFromConsoleResults$.subscribe((query) => {
            if (query) {
                console.log('Run full query from results', query);
                this.submitQuery(query.query, query.language.toString(), query.namespace);
                // Remove it, so that if we navigate away and back again, we won't run the query twice.
                this.layerSettings.setResultsQuery(null);
            }
        }));

        this.subscriptions.add(this.layerSettings.layerPolygonFilter$.subscribe((layerAndPolygon) => {
            if (layerAndPolygon === null) {
                return;
            }
            const [layer, polygon] = layerAndPolygon;
            layer.filterConfig.addPolygon(polygon);
        }));

        // this.updateLayers(getSampleMapLayers());
    }

    checkCanRerender() {
        const canRerenderLayers = !isEqual(
            this.deepCopyLayers(this.layers, false),
            this.renderedLayers,
        );
        this.layerSettings.setCanRerenderLayers(canRerenderLayers);
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

            if (currentHeight === undefined) {
                return;
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
        const elem = (document.querySelector('#map') as HTMLElement);
        if (elem === null) {
            return undefined;
        } else {
            return `${elem.offsetHeight}px`;
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
                console.log('Loaded GeoJSON file!');
            }
        } catch (error) {
            if (error instanceof Error) {
                alert(`Failed to load file: ${error.message}`);
            }
            this.loadedGeoJsonFile = undefined;
        }
    }

    rerunQuery(layer: MapLayer) {
        if (this.applyFilterToLayer || this.addDataToExistingLayer) {
            console.log('Another query is already in progress. Do not update this.addDataToExistingLayer.');
            return;
        }

        // Data will be overwritten once the results are in
        this.addDataToExistingLayer = layer;
        this.submitQuery(layer.query, layer.language, layer.namespace);
    }

    fitLayerToMap(layer: MapLayer) {
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
        layer.planValidator = this._validator;

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

    submitQuery(query: string, language: string, namespace: string): boolean {
        const request = new QueryRequest(query, true, false, language, namespace);
        request.noLimit = true;
        return this._crud.anyQuery(this.websocket, request);
    }

    filterLayer(layer: MapLayer) {
        console.log('Filter layer', layer);
        this.layerSettings.addPolygonFilterForLayer(layer);
    }

    async addLayer() {
        this.addLayerDialogErrorMessage = '';

        switch (this.addLayerMode) {
            case LayerContext.Query:
                if (!this.submitQuery(this.queryEditor.getCode(), this.language(), this.activeNamespace())) {
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

    export() {
        if (this.layers.length === 0) {
            return;
        }

        // Create and download a GeoJSON file.
        const geoJSON = {
            type: 'FeatureCollection',
            features: this.layers.flatMap(layer =>
                layer.data.map(item => ({
                    type: 'Feature',
                    geometry: item.geometry,
                    properties: {
                        ...item.data,
                        layerName: layer.name,
                        layerUUID: layer.uuid,
                    },
                }))
            ),
        };

        const jsonString = JSON.stringify(geoJSON, null, 2);
        const blob = new Blob([jsonString], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        // Timestamp looks like 01-12-2024-15-30
        const timestamp = [
            now.getDate().toString().padStart(2, '0'),
            (now.getMonth() + 1).toString().padStart(2, '0'),
            now.getFullYear(),
            now.getHours().toString().padStart(2, '0'),
            now.getMinutes().toString().padStart(2, '0')
        ].join('-');
        a.download = `${timestamp}_polypheny_map_layers_export.geojson`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

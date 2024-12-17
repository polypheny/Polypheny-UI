import {AfterViewInit, Component, effect, Input, OnDestroy} from '@angular/core';
import {DataTemplateComponent} from '../data-template/data-template.component';
import * as d3 from 'd3';
import {GeoPath, GeoPermissibleObjects} from 'd3';
import * as d3Geo from 'd3-geo';
import * as L from 'leaflet';
import 'leaflet-draw';
import {LayerSettingsService} from '../../../views/querying/gis/services/layersettings.service';
import {MapLayer} from '../../../views/querying/gis/models/MapLayer.model';
import {MapGeometryWithData} from '../../../views/querying/gis/models/MapGeometryWithData.model';
import {CombinedResult} from '../data-view.model';
import {LatLng} from 'leaflet';
import {Polygon, Position} from 'geojson';
import {cibYarn} from '@coreui/icons';

// tslint:disable:no-non-null-assertion

@Component({
    selector: 'app-data-map',
    templateUrl: './data-map.component.html',
    styleUrls: ['./data-map.component.scss']
})
export class DataMapComponent extends DataTemplateComponent implements AfterViewInit, OnDestroy {
    // If the map is shown inside the results section, different styling needs to be applied.
    @Input() isInsideResults = false;

    currentBaseLayer: L.TileLayer | undefined;
    layers: MapLayer[] = [];
    isLoading = false;
    isLoadingMessage = 'TODO isLoadingMessage';
    canRerenderLayers = false;
    previewResult: CombinedResult = null;

    // leaflet-draw
    leafletDrawControl = null;
    layerIdToPoylgon = new Map<string, L.Polygon>();
    currentDrawingLayer: MapLayer = null;
    // polygonTool = null;
    isInitialRender = true;

    readonly MIN_ZOOM = 0;
    readonly MAX_ZOOM = 19;
    readonly INITIAL_ZOOM = 6;
    private map!: L.DrawMap;
    private svg:
        | d3.Selection<SVGSVGElement, unknown, null, undefined>
        | undefined;
    private g: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    private pathGenerator!: GeoPath<any, GeoPermissibleObjects>;
    private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    private renderedGeometries: d3.Selection<SVGPathElement, MapGeometryWithData, SVGGElement, unknown>;

    constructor(protected layerSettings: LayerSettingsService) {
        super();

        effect(() => {
            if (!this.isInsideResults) {
                return;
            }

            // Display the results.
            const result = this.$result();
            if (!result) {
                return;
            }

            // The CombinedResult will be given to the LayerSettings, if the user clicks on the button to show the
            // results in the full GIS query mode.
            this.previewResult = result;

            // Always update layers, because even if the current query did not result in any geometries that we can
            // show on the map, we have to at least remove the old results.
            const layers = [];
            const resultsLayer = MapLayer.from(result);
            if (resultsLayer.data.length > 0){
                layers.push(resultsLayer);
            }
            this.layerSettings.setLayers(layers);
        });
    }

    ngOnInit() {
        this.subscriptions.add(this.layerSettings.selectedBaseLayer$.subscribe((item) => {
            if (!item) {
                return;
            }

            if (this.currentBaseLayer) {
                this.map.removeLayer(this.currentBaseLayer);
            }

            if (item !== 'EMPTY') {
                this.currentBaseLayer = L.tileLayer(item, {
                    maxZoom: this.MAX_ZOOM,
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                }).addTo(this.map);
            }
        }));

        this.subscriptions.add(this.layerSettings.layers$.subscribe((layers) => {
            this.layers = layers;
            this.renderLayersWithD3();
        }));

        this.subscriptions.add(this.layerSettings.canRerenderLayers$.subscribe((canRerenderLayers) => {
            this.canRerenderLayers = canRerenderLayers;
        }));

        this.subscriptions.add(this.layerSettings.toggleLayerVisibility$.subscribe((layer) => {
            this.toggleLayerVisibility(layer);
        }));

        this.subscriptions.add(this.layerSettings.fitLayerToMap$.subscribe((layer) => {
            if (layer) {
                this.fitLayerToMap(layer);
            }
        }));


    }

    fitLayerToMap(layer: MapLayer) {
        const bounds = layer.getBounds();
        if (bounds.length > 0) {
            const latLngBounds = L.latLngBounds(bounds);
            if (latLngBounds.isValid()) {
                this.map.fitBounds(latLngBounds);
            }
        }
    }

    ngOnDestroy() {
        // TODO: This breaks the navigation from results to map query view
        this.subscriptions.unsubscribe();
    }

    ngAfterViewInit(): void {
        const leafletMap = L.map('map').setView([52, 10], this.INITIAL_ZOOM);
        this.map = leafletMap;

        // Leaflet.Draw edit toolbar
        const drawnItems = new L.FeatureGroup();
        leafletMap.addLayer(drawnItems);
        this.leafletDrawControl = new L.Control.Draw({
            edit: {
                featureGroup: drawnItems
            },
            draw: {
                circle: false,
                marker: false,
                polyline: false,
                rectangle: false,
                circlemarker: false
            }
        });

        leafletMap.on(L.Draw.Event.CREATED, (event) => {
            if (this.currentDrawingLayer === null) {
                throw new Error('We are drawing, but there is no layer set?');
            }
            const polygon: L.Polygon = event.layer;
            this.layerIdToPoylgon.set(this.currentDrawingLayer.uuid, polygon);
            console.log('Polygon added for layer ', this.currentDrawingLayer.uuid, polygon);
            leafletMap.removeControl(this.leafletDrawControl);
            // this.polygonTool.disable();
            drawnItems.addLayer(polygon);

            // Send coordinates back to map-layers
            const coordinates = polygon.getLatLngs() as LatLng[][];
            const positions: Position[][] = coordinates.map((ring) =>
                ring.map((c) => [c.lng, c.lat])
            );
            // Close the linear ring
            positions[0].push(positions[0][0]);
            const geoJsonPolygon: Polygon = {
                type: 'Polygon',
                coordinates: positions,
            };
            this.layerSettings.addPolygonToLayer(this.currentDrawingLayer, geoJsonPolygon);
        });

        this.subscriptions.add(this.layerSettings.addLayerFilterPolygon$.subscribe((mapLayer) => {
            if (mapLayer === null) {
                return;
            }
            this.currentDrawingLayer = mapLayer;
            leafletMap.addControl(this.leafletDrawControl);
            // const polygonTool = new L.Draw.Polygon(leafletMap, this.leafletDrawControl.options.draw.polygon);
            // polygonTool.enable();
            // this.polygonTool = polygonTool;
        }));

        this.subscriptions.add(this.layerSettings.removeLayerFilterPolygon$.subscribe((mapLayer) => {
            if (mapLayer === null) {
                return;
            }
            if (!this.layerIdToPoylgon.has(mapLayer.uuid)) {
                return;
            }
            const polygon = this.layerIdToPoylgon.get(mapLayer.uuid);
            drawnItems.removeLayer(polygon);
        }));

        this.svg = d3.select(this.map.getPanes().overlayPane).append('svg');
        this.g = this.svg.append('g').attr('class', 'leaflet-zoom-hide');
        this.tooltip = d3
            .select('body')
            .append('div')
            .style('position', 'absolute')
            .style('font-size', '0.75rem')
            .style('font-family', 'monospace')
            .style('background', 'white')
            .style('border', '1px solid #ccc')
            .style('padding', '5px')
            .style('display', 'none')
            .style('z-index', '9999');

        function projectPoint(this: any, x: number, y: number) {
            const point = leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        }

        const transform = d3Geo.geoTransform({point: projectPoint});
        this.pathGenerator = d3Geo.geoPath().projection(transform);

        this.map.on('zoomstart', () => {
            if (this.g) {
                this.g.style('visibility', 'hidden');
            }
        });
        this.map.on('zoomend', () => {
            this.updateSvgPosition();
        });
        this.map.on('moveend', () => {
            if (!this.svg || !this.g) {
                return;
            }
            const bounds = this.map.getBounds();
            const topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());
            this.svg
                .style('width', '999999px')
                .style('height', '999999px')
                .style('left', topLeft.x + 'px')
                .style('top', topLeft.y + 'px');
            this.g.attr('transform', `translate(${-topLeft.x}, ${-topLeft.y})`);
        });

        this.currentBaseLayer = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: this.MAX_ZOOM,
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
        ).addTo(this.map);
    }

    showLoadingSpinner(message: string) {
        this.isLoading = true;
        this.isLoadingMessage = message;
    }

    updateSvgPosition() {
        this.showLoadingSpinner('Reposition shapes on map');

        setTimeout(() => {
            try {
                if (!this.g || !this.svg) {
                    return;
                }

                // GeoJSON paths
                this.renderedGeometries
                    .filter((d) => d.type === 'path')
                    .attr('d', (d) => this.pathGenerator(d.geometry));
                // Circles
                this.renderedGeometries
                    .filter((d) => d.type === 'point' && d.layer!.pointShapeVisualization.selectedMode === 'Circle')
                    .each((d) => {
                        const layerPoint = this.map.latLngToLayerPoint([
                            d.getPoint().coordinates[1],
                            d.getPoint().coordinates[0],
                        ]);
                        d.cache['x'] = layerPoint.x;
                        d.cache['y'] = layerPoint.y;
                    })
                    .attr('cx', (d) => d.cache['x'])
                    .attr('cy', (d) => d.cache['y']);
                // Manually created Paths: Squares, Triangles, Stars
                const createTrianglePath = this.createTrianglePath;
                const createStarPath = this.createStarPath;
                const createSquarePath = this.createSquarePath;
                const createCrossPath = this.createCrossPath;

                this.renderedGeometries
                    .filter((d) => d.type === 'point' && d.layer!.pointShapeVisualization.selectedMode !== 'Circle')
                    .each((d) => {
                        const layerPoint = this.map.latLngToLayerPoint([
                            d.getPoint().coordinates[1],
                            d.getPoint().coordinates[0],
                        ]);
                        d.cache['x'] = layerPoint.x;
                        d.cache['y'] = layerPoint.y;
                    })
                    .attr('d', (d) => {
                        switch (d.layer!.pointShapeVisualization.selectedMode) {
                            case 'Triangle':
                                return createTrianglePath(d.cache['x'], d.cache['y'], d.cache['size']);
                            case 'Star':
                                return createStarPath(d.cache['x'], d.cache['y'], d.cache['size']);
                            case 'Square':
                                return createSquarePath(d.cache['x'], d.cache['y'], d.cache['size']);
                            case 'Cross':
                                return createCrossPath(d.cache['x'], d.cache['y'], d.cache['size']);
                            default:
                                throw new Error(`Update SVG-Repositioning function to include point shape [${d.layer!.pointShapeVisualization.selectedMode}]`);
                        }
                    });

                const bounds = this.map.getBounds();
                const topLeft = this.map.latLngToLayerPoint(
                    bounds.getNorthWest(),
                );
                this.svg
                    .style('width', '999999px')
                    .style('height', '999999px')
                    .style('left', topLeft.x + 'px')
                    .style('top', topLeft.y + 'px');
                this.g.attr(
                    'transform',
                    `translate(${-topLeft.x}, ${-topLeft.y})`,
                );
                this.g.style('visibility', 'visible');
            } finally {
                this.isLoading = false;
            }
        }, 0);
    }

    renderLayersWithD3() {
        console.log('Map: Render layers...', this.layers);
        this.showLoadingSpinner('Rendering layers');

        setTimeout(() => {
            try {
                if (!this.svg || !this.g) {
                    return;
                }

                // Remove all previously added elements
                this.g.selectAll('*').remove();
                const geometries: MapGeometryWithData[] = [];
                for (const layer of this.layers.slice().reverse()) {
                    // Initialize all configs
                    layer.pointShapeVisualization.init(layer.data);
                    layer.areaShapeVisualization.init(layer.data);
                    layer.colorVisualization.init(layer.data);
                    geometries.push(...layer.data);
                }
                
                console.log('Render geometries: ', geometries);
                this.renderedGeometries = this.renderGeometries(geometries);

                // Set SVG position correctly
                this.updateSvgPosition();

                // Only for the first layer we add: Adjust map to points from layer.
                // Otherwise: Maybe the user is already looking at the data they are interested in -> do not change
                //            map position, because it could be unwanted.
                // Only do this for the
                if (this.isInitialRender && this.layers.length === 1) {
                    this.fitLayerToMap(this.layers[0]);
                }

            } finally {
                this.isLoading = false;
                this.isInitialRender = false;
            }
        }, 0);
    }

    renderGeometries(geometries: (MapGeometryWithData)[]) {
        if (!this.g) {
            return;
        }

        const tt = this.tooltip;
        const pathGenerator = this.pathGenerator;
        const map = this.map;
        const createTrianglePath = this.createTrianglePath;
        const createStarPath = this.createStarPath;
        const createSquarePath = this.createSquarePath;
        const createCrossPath = this.createCrossPath;

        return this.g
            .selectAll('.geometry')
            .data(geometries)
            .enter()
            .append(function (d) {
                if (d.type === 'point' && d.layer!.pointShapeVisualization.selectedMode === 'Circle') {
                    return document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                }

                // All other more complex shapes need to be created by using paths.
                return document.createElementNS('http://www.w3.org/2000/svg', 'path');
            })
            .attr('class', 'geometry')
            .attr('layer-id', (d) => d.layer!.uuid)
            .attr('layer-index', (d) => d.layer!.index.toString())
            .each(function (d) {
                const element = d3.select(this);
                const fill = d.layer!.colorVisualization.getValueForAttribute('fill', d) as string;

                switch (d.type) {
                    case 'point':
                        const layerPoint = map.latLngToLayerPoint([
                            d.getPoint().coordinates[1],
                            d.getPoint().coordinates[0],
                        ]);
                        const x = layerPoint.x;
                        const y = layerPoint.y;
                        const size = d.layer!.pointShapeVisualization.getValueForAttribute('r', d) as number;
                        d.cache['x'] = x;
                        d.cache['y'] = y;
                        d.cache['size'] = size;

                        switch (d.layer!.pointShapeVisualization.selectedMode) {
                            case 'Circle':
                                element
                                    .attr('cx', x)
                                    .attr('cy', y)
                                    .attr('r', size)
                                    .attr('fill', fill);
                                break;
                            case 'Square':
                                element
                                    .attr('d', (d) => createSquarePath(x, y, size))
                                    .attr('fill', fill);
                                break;
                            case 'Triangle':
                                element
                                    .attr('d', () => createTrianglePath(x, y, size))
                                    .attr('fill', fill);
                                break;
                            case 'Star':
                                element
                                    .attr('d', (d) => createStarPath(x, y, size))
                                    .attr('fill', fill);
                                break;
                            case 'Cross':
                                element
                                    .attr('d', (d) => createCrossPath(x, y, size))
                                    .attr('stroke', fill);
                                break;
                            default:
                                throw new Error(`Update render function to include shape [${d.type}]`);
                        }
                        break;
                    case 'path':
                        element
                            .attr('d', pathGenerator(d.geometry))
                            .attr('stroke-width', d.layer!.areaShapeVisualization.getValueForAttribute('stroke-width', d))
                            .attr('stroke', d.layer!.colorVisualization.getValueForAttribute('stroke', d))
                            .attr('fill', fill)
                            .attr('fill-opacity', d.layer!.colorVisualization.getValueForAttribute('fill-opacity', d));
                        break;
                    default:
                        throw new Error(`Update render function to include shape [${d.type}]`);
                }
            })
            .style('pointer-events', 'auto')
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                tt.style('display', 'block').html(JSON.stringify(d.data, null, 2));
            })
            .on('mousemove', function (event) {
                tt.style('top', event.pageY + 10 + 'px').style(
                    'left',
                    event.pageX + 10 + 'px',
                );
            })
            .on('mouseout', function () {
                tt.style('display', 'none');
            });
    }

    createTrianglePath(x, y, size) {
        const side = size * 3;
        const height = (Math.sqrt(3) / 2) * side;
        return `M ${x} ${y - height / 2} 
                L ${x - side / 2} ${y + height / 2} 
                L ${x + side / 2} ${y + height / 2} Z`;
    }

    createStarPath(x, y, size) {
        const outerRadius = size * 2;
        const innerRadius = size;
        const spikes = 5;

        let path = '';
        const step = Math.PI / spikes;
        for (let i = 0; i < 2 * spikes; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const xStar = x + Math.cos(i * step) * radius;
            const yStar = y - Math.sin(i * step) * radius;
            path += i === 0 ? `M ${xStar} ${yStar}` : `L ${xStar} ${yStar}`;
        }
        return `${path} Z`;
    }

    createSquarePath(x, y, size) {
        // No idea why this is necessary, but on the second render the size is suddenly no longer a number
        // and gets concatenated instead of added, which leads to the square looking wrong on the map.
        size = Number(size);
        return `M ${x - size} ${y - size} 
                L ${x + size} ${y - size} 
                L ${x + size} ${y + size} 
                L ${x - size} ${y + size} Z`;
    }

    createCrossPath(x, y, size) {
        const half = Number(size);
        return `M ${x - half} ${y - half} L ${x + half} ${y + half}
                M ${x - half} ${y + half} L ${x + half} ${y - half}`;
    }

    toggleLayerVisibility(layer: MapLayer) {
        if (!this.g?.node()) {
            throw new Error('SVG g does not exist.');
        }

        const layerElements = this.g
            .node()!
            .querySelectorAll(
                `[layer-id='${layer.uuid}']`,
            );

        if (!layerElements.length) {
            // Nothing to do
            return;
        }

        layerElements.forEach((elem) => {
            if (layer.isActive) {
                elem.classList.remove('map-layer-hidden');
            } else {
                elem.classList.add('map-layer-hidden');
            }
        });
    }

    navigateToMapQueryMode() {
        // Give CombinedResult to map-layers component, so that the full query can be run and added from there.
        this.layerSettings.setResultsQuery(this.previewResult);
        this._router.navigate(['/views/querying/gis']);
    }
}


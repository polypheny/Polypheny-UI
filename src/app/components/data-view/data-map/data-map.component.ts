import {AfterViewInit, Component, effect, Input, OnDestroy} from '@angular/core';
import {DataTemplateComponent} from '../data-template/data-template.component';
import * as d3 from 'd3';
import {GeoPath, GeoPermissibleObjects} from 'd3';
import * as d3Geo from 'd3-geo';
import * as L from 'leaflet';
import 'leaflet-draw';
import {LayerSettingsService} from '../../../views/querying/gis/services/layersettings.service';
import {MapLayer} from '../../../views/querying/gis/models/MapLayer.model';
import {MapGeometryWithData} from '../../../views/querying/gis/models/RowResult.model';
import {CombinedResult} from '../data-view.model';

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
    previewResult : CombinedResult = null;

    readonly MIN_ZOOM = 0;
    readonly MAX_ZOOM = 19;
    readonly INITIAL_ZOOM = 6;
    private map!: L.Map;
    private svg:
        | d3.Selection<SVGSVGElement, unknown, null, undefined>
        | undefined;
    private g: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    private circles:
        | d3.Selection<SVGCircleElement, MapGeometryWithData, SVGGElement, unknown>
        | undefined;
    private paths:
        | d3.Selection<SVGPathElement, MapGeometryWithData, SVGGElement, unknown>
        | undefined;
    private pathGenerator!: GeoPath<any, GeoPermissibleObjects>;
    private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

    constructor(protected layerSettings: LayerSettingsService) {
        super();

        effect(() => {
            if (!this.isInsideResults) {
                return
            }

            // Display the results.
            const result = this.$result();
            if (!result) {
                return;
            }

            // The CombinedResult will be given to the LayerSettings, if the user clicks on the button to show the
            // results in the full GIS query mode.
            this.previewResult = result;
            this.layerSettings.setLayers([MapLayer.from(result)]);
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
        const drawControl = new L.Control.Draw({
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
        leafletMap.addControl(drawControl);

        leafletMap.on(L.Draw.Event.CREATED, function (event) {

            // TODO: What is the best way to use this shape to add a filter to another layer?
            //         - We could add this shape as its own layer.
            const layer = event.layer;
            drawnItems.addLayer(layer);
        });

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

        this.map.on('zoomend', () => {
            this.updateSvgPosition();
        });
        this.map.on('moveend', () => {
            if (!this.svg || !this.g) {
                return;
            }
            const bounds = this.map.getBounds();
            const topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());
            const bottomRight = this.map.latLngToLayerPoint(
                bounds.getSouthEast(),
            );
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

                if (this.paths) {
                    this.paths.attr('d', (d) => this.pathGenerator(d.geometry));
                }

                if (this.circles) {
                    this.circles
                        .each((d) => {
                            const layerPoint = this.map.latLngToLayerPoint([
                                d.getPoint()!.coordinates[1],
                                d.getPoint()!.coordinates[0],
                            ]);
                            d.cache['x'] = layerPoint.x;
                            d.cache['y'] = layerPoint.y;
                        })
                        .attr('cx', (d) => d.cache['x'])
                        .attr('cy', (d) => d.cache['y']);
                }

                const bounds = this.map.getBounds();
                const topLeft = this.map.latLngToLayerPoint(
                    bounds.getNorthWest(),
                );
                const bottomRight = this.map.latLngToLayerPoint(
                    bounds.getSouthEast(),
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
            } finally {
                this.isLoading = false;
            }
        }, 0);
    }

    renderLayersWithD3() {
        this.showLoadingSpinner('Rendering layers');

        setTimeout(() => {
            try {
                if (!this.svg || !this.g) {
                    return;
                }

                // Remove all previously added elements
                this.g.selectAll('*').remove();

                const points: MapGeometryWithData[] = [];
                const paths: MapGeometryWithData[] = [];

                // Add shapes from each layer to array
                for (const layer of this.layers.slice().reverse()) {

                    // Initialize all configs
                    layer.pointShapeVisualization.init(layer.data);
                    layer.areaShapeVisualization.init(layer.data);
                    layer.colorVisualization.init(layer.data);

                    points.push(
                        ...layer.data.filter(
                            (d) => d.geometry.type === 'Point',
                        ),
                    );
                    paths.push(
                        ...layer.data.filter(
                            (d) => d.geometry.type !== 'Point',
                        ),
                    );
                }

                // Render all points
                // TODO: Circles are always on the bottom this way...
                console.log('Create Points: ', points);
                this.circles = this.createPoints(points);

                console.log('Create Paths: ', paths);
                this.paths = this.createPaths(paths);

                // Set SVG position correctly
                this.updateSvgPosition();

                // Center the map around the data.
                // TODO: Do the same thing for paths.
                const latLngs: L.LatLng[] = [];
                this.circles!.each(d => {
                    // d has the property geometry, which is a GeoJSON point of type
                    latLngs.push(L.latLng(d.getPoint().coordinates[1], d.getPoint().coordinates[0],));
                });

                // TODO: Currently, only do this, if the dataset is not too big. Otherwise we zoom way out,
                // and zooming back in can be very slow. (if the points are all over the world)
                if (latLngs.length > 0 && latLngs.length <= 1000) {
                    const latLngBounds = L.latLngBounds(latLngs);
                    if (latLngBounds.isValid()) {
                        this.map.fitBounds(latLngBounds);
                    }
                }
            } finally {
                this.isLoading = false;
            }
        }, 0);
    }

    createPoints(points: MapGeometryWithData[]) {
        if (!this.g) {
            return;
        }

        const tt = this.tooltip;

        return this.g
            .selectAll('circle')
            .data(points)
            .enter()
            .append('circle')
            .attr('layer-name', (d) => d.layer!.name)
            .attr('layer-index', (d) => d.layer!.index.toString())
            .attr('r', (d) =>
                d.layer!.pointShapeVisualization.getValueForAttribute('r', d),
            )
            .attr('fill', (d) =>
                d.layer!.colorVisualization.getValueForAttribute('fill', d),
            )
            .each((d) => {
                const layerPoint = this.map.latLngToLayerPoint([
                    d.getPoint().coordinates[1],
                    d.getPoint().coordinates[0],
                ]);
                d.cache['x'] = layerPoint.x;
                d.cache['y'] = layerPoint.y;
            })
            .attr('cx', (d) => d.cache['x'])
            .attr('cy', (d) => d.cache['y'])
            .style('pointer-events', 'auto')
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                tt.style('display', 'block').html(JSON.stringify(d.data, null, 1));
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

    createPaths(paths: MapGeometryWithData[]) {
        if (!this.g) {
            return;
        }

        const tt = this.tooltip;

        return this.g
            .selectAll('.paths')
            .data(paths)
            .enter()
            .append('path')
            .attr('layer-name', (d) => d.layer!.name)
            .attr('layer-index', (d) => d.layer!.index.toString())
            .attr('d', (d) => this.pathGenerator(d.geometry))
            .attr('stroke-width', (d) =>
                d.layer!.areaShapeVisualization.getValueForAttribute(
                    'stroke-width',
                    d,
                ),
            )
            .attr('stroke', (d) =>
                d.layer!.colorVisualization.getValueForAttribute('stroke', d),
            )
            .attr('fill', (d) =>
                d.layer!.colorVisualization.getValueForAttribute('fill', d),
            )
            .attr('fill-opacity', (d) =>
                d.layer!.colorVisualization.getValueForAttribute(
                    'fill-opacity',
                    d,
                ),
            )
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

    toggleLayerVisibility(layer: MapLayer) {
        if (!this.g?.node()) {
            throw new Error('SVG g does not exist.');
        }

        const layerElements = this.g
            .node()!
            .querySelectorAll(
                `[layer-name='${layer.name}'][layer-index='${layer.index.toString()}']`,
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


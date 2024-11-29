import {AfterViewInit, Component, effect} from '@angular/core';
import {DataTemplateComponent} from '../data-template/data-template.component';
import * as d3 from 'd3';
import { GeoPath, GeoPermissibleObjects } from 'd3';
import * as d3Geo from 'd3-geo';
import * as L from 'leaflet';

@Component({
    selector: 'app-data-map',
    templateUrl: './data-map.component.html',
    styleUrls: ['./data-map.component.scss']
})
export class DataMapComponent extends DataTemplateComponent implements AfterViewInit {
    constructor() {
        super();
    }

    // Leaflet
    readonly MIN_ZOOM = 0;
    readonly MAX_ZOOM = 19;
    readonly INITIAL_ZOOM = 6;
    private map!: L.Map;
    private currentBaseLayer: L.TileLayer | undefined;

    // D3
    private svg:
        | d3.Selection<SVGSVGElement, unknown, null, undefined>
        | undefined;
    private g: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    // private circles:
    //     | d3.Selection<SVGCircleElement, RowResult, SVGGElement, unknown>
    //     | undefined;
    // private paths:
    //     | d3.Selection<SVGPathElement, RowResult, SVGGElement, unknown>
    //     | undefined;
    private pathGenerator!: GeoPath<any, GeoPermissibleObjects>;
    private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

    ngAfterViewInit(): void {
        const leafletMap = L.map('map').setView([52, 10], this.INITIAL_ZOOM);
        this.map = leafletMap;
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

        // function projectPoint(this: any, x: number, y: number) {
        //     const point = leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
        //     this.stream.point(point.x, point.y);
        // }
        //
        // const transform = d3Geo.geoTransform({ point: projectPoint });
        // this.pathGenerator = d3Geo.geoPath().projection(transform);
        //
        // this.map.on('zoomend', () => {
        //     this.updateSvgPosition();
        // });
        // this.map.on('moveend', () => {
        //     if (!this.svg || !this.g) {
        //         return;
        //     }
        //     const bounds = this.map.getBounds();
        //     const topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());
        //     const bottomRight = this.map.latLngToLayerPoint(
        //         bounds.getSouthEast(),
        //     );
        //     this.svg
        //         .style('width', '999999px')
        //         .style('height', '999999px')
        //         .style('left', topLeft.x + 'px')
        //         .style('top', topLeft.y + 'px');
        //     this.g.attr('transform', `translate(${-topLeft.x}, ${-topLeft.y})`);
        // });

        this.currentBaseLayer = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: this.MAX_ZOOM,
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
        ).addTo(this.map);
    }
}


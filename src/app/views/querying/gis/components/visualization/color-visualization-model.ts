import { Visualization } from '../../models/visualization.interface';
import { MapGeometryWithData } from '../../models/MapGeometryWithData.model';
import * as d3 from 'd3';
import * as turf from '@turf/turf';
import { ColorComponent } from './color/color.component';
import {MapLayerConfiguration} from '../../models/MapLayerConfiguration.interface';

// tslint:disable:no-non-null-assertion

export class ColorVisualization implements Visualization, MapLayerConfiguration {
    name = 'Color';
    configurationComponentType = ColorComponent;

    modes: string[] = ['Static', 'Gradient'];
    selectedMode: string = this.modes[0];

    // Static
    color: string;
    fillOpacity = 0.25;

    // Gradient
    fieldName = '';
    normalizeByArea = false;
    colorScale?: d3.ScaleSequential<string>;

    constructor(color: string) {
        this.color = color;
    }

    init(data: MapGeometryWithData[]): void {
        if (this.selectedMode === this.modes[0]) {
            // Nothing to do
            return;
        }

        const values = this.normalizeByArea
            ? data
                  .map((d) => [
                      d.getNumberValueFromField(this.fieldName),
                      turf.area(d.geometry),
                  ])
                  .filter(
                      (v): v is [number, number] =>
                          !isNaN(v[0]) && !isNaN(v[1]),
                  )
                  .map((v) => (v[1] > 0 ? v[0] / v[1] : 0))
            : data
                  .map((d) => d.getNumberValueFromField(this.fieldName))
                  .filter((v): v is number => !isNaN(v));

        console.log('values', values);

        const minValue = d3.min(values) ?? 0;
        const maxValue = d3.max(values) ?? 1;
        console.log('minValue', minValue);
        console.log('maxValue', maxValue);

        this.colorScale = d3
            .scaleSequential(d3.interpolateHsl('lightblue', 'darkblue'))
            .domain([minValue, maxValue]);
        console.log('this.colorScale', this.colorScale);
    }

    copy(): Visualization {
        const copy = new ColorVisualization(this.color);
        copy.selectedMode = this.selectedMode;
        copy.fillOpacity = this.fillOpacity;
        copy.fieldName = this.fieldName;
        copy.normalizeByArea = this.normalizeByArea;
        return copy;
    }

    getValueForAttribute(attr: string, data: MapGeometryWithData): string | number {
        switch (attr) {
            case 'stroke':
                switch (this.selectedMode) {
                    case 'Static':
                        return this.color;
                    case 'Gradient':
                        return 'black';
                }
                return this.color;
            case 'fill-opacity':
                return this.fillOpacity;
            case 'fill':
                switch (this.selectedMode) {
                    case 'Static':
                        return this.color;
                    case 'Gradient':
                        return this.colorScale!(
                            data.getNumberValueFromField(this.fieldName),
                        );
                }
        }

        throw new Error(`Visualization does not support attribute [${attr}]`);
    }

    apply(): void {}
}

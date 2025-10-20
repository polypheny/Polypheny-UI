import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {hexToRgba} from '@coreui/utils';

@Component({
    selector: 'app-graph',
    templateUrl: './graph.component.html',
    styleUrls: ['./graph.component.scss'],
    standalone: false
})

export class GraphComponent implements OnInit, OnChanges {

    _chartType: string;
    @Input() chartType: string;

    _data;
    @Input() data: Array<any>;

    _labels;
    @Input() labels: Array<string>;

    _colorList;
    @Input() colorList: Array<string>;

    _min: number;
    @Input() min: number;

    _max: number;
    @Input() max: number;

    _xLabel: string;
    @Input() xLabel: string;

    _yLabel: string;
    @Input() yLabel: string;

    @Input() maintainAspectRatio = true;


    options: any = {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        tooltips: {
            enabled: false,
        },
        layout: {
            padding: {
                left: 16,
                right: 16,
                top: 16,
                bottom: 16
            }
        },
        scales: {
            y: {
                scaleLabel: {
                    display: false,
                    labelString: ''
                },
                ticks: {
                }
            },
            x: {
                scaleLabel: {
                    display: false,
                    labelString: ''
                }
            }
        }
    };

    colors;//will be assigned in function

    doughnutPolarColors = [{
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1
    }];

    barColors = [];

    legend = true;

    constructor() {
    }

    ngOnInit() {
        const numberOfColors = 9;

        const iterableColorList = this.generateIterableArray(this.colorList);
        for (let i = 0; i < numberOfColors; i++) {
            this.doughnutPolarColors[0].backgroundColor[i] = hexToRgba(iterableColorList.next(), 60);
            this.doughnutPolarColors[0].borderColor[i] = iterableColorList.lastUsed();
            this.barColors[i] = {
                borderWidth: 1,
                backgroundColor: (iterableColorList.lastUsed() ? hexToRgba(iterableColorList.lastUsed(), 60) : null)
            };
        }
    }

    /**
     * ngOnChanges instead of @Input setters is needed to make sure that
     * the changes on 'chartType' are applied first, since the changes on
     * other variables depend on it
     */
    ngOnChanges(changes: SimpleChanges) {
        if (changes['chartType']) {
            this.setChartType(changes['chartType'].currentValue);
        }
        if (changes['data']) {
            this._data = this.mapData(changes['data'].currentValue);
        }
        if (changes['labels']) {
            this._labels = this.mapLabel(changes['labels'].currentValue);
        }
        if (changes['colors']) {
            this._colorList = changes['colors'].currentValue;
        }
        if (changes['min']) {
            this._min = changes['min'].currentValue;
            this.updateOptions();
        }
        if (changes['max']) {
            this._max = changes['max'].currentValue;
            this.updateOptions();
        }
        if (changes['xLabel']) {
            this._xLabel = changes['xLabel'].currentValue;
            this.updateOptions();
        }
        if (changes['yLabel']) {
            this._yLabel = changes['yLabel'].currentValue;
            this.updateOptions();
        }
        if (changes['maintainAspectRatio']) {
            this.options.maintainAspectRatio = changes['maintainAspectRatio'].currentValue;
        }
    }

    setChartType(chartType) {
        chartType = chartType.toLowerCase() || 'line';
        if (chartType === 'polararea') {
            chartType = 'polarArea';
        }
        if (chartType === 'doughnut' || chartType === 'polarArea') {
            this.colors = this.doughnutPolarColors;
        } else if (chartType === 'bar') {
            this.colors = this.barColors;
        } else {
            this.colors = undefined;
        }
        this._chartType = chartType;
        const showAxes = ['bar', 'line'].includes(this._chartType);
        this.options.scales.x.display = showAxes;
        this.options.scales.y.display = showAxes;
    }

    mapData(data) {
        // map hashmap to array
        const data2 = [];
        for (const key of Object.keys(data)) {
            data2.push(data[key]);
        }
        return data2;
    }

    mapLabel(labels) {
        let labels2 = labels;
        if (['line', 'bar'].includes(this._chartType) && !labels) {
            const length = this._data[0].data.length;
            labels2 = Array(length).fill('');
        }
        return labels2;
    }

    updateOptions() {
        if (['line', 'bar'].includes(this._chartType)) {
            if (this._min) {
                this.options.scales.y.ticks.suggestedMin = this._min;
            }
            if (this._max) {
                this.options.scales.y.ticks.suggestedMax = this._max;
            }
        }
        if (this._xLabel) {
            this.options.scales.x.scaleLabel.display = true;
            this.options.scales.x.scaleLabel.labelString = this._xLabel;
        }
        if (this._yLabel) {
            this.options.scales.y.scaleLabel.display = true;
            this.options.scales.y.scaleLabel.labelString = this._yLabel;
        }
    }

    generateIterableArray = (arr: any) => ({
        nextIndex: 0,
        arr,
        next() {
            if (!this.arr || this.arr.length === 0) {
                return '#000000';
            }
            if (this.nextIndex >= (this.arr.length)) {
                this.nextIndex = 0;
            }
            return this.arr[this.nextIndex++];
        },
        lastUsed() {
            if (this.nextIndex === 0) {
                return this.arr?.[0] || '#000000';
            } else {
                return this.arr[this.nextIndex - 1];
            }
        }
    })

}




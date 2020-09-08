import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {CustomTooltips} from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import {getStyle, hexToRgba} from '@coreui/coreui/dist/js/coreui-utilities';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, OnChanges {

  _chartType: string;
  @Input() chartType: string;

  _data;
  @Input() data: Array<any>;

  _labels;
  @Input() labels: Array<string>;

  //@Input() config?:any;

  _min: number;
  @Input() min: number;

  _max: number;
  @Input() max: number;

  options: any = {
    animation: false,
    responsive: true,
    maintainAspectRatio: true,
    tooltips: {
      enabled: false,
      custom: CustomTooltips
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
      yAxes: [{
        ticks: {
          //values are set by updateOptions()
          //suggestedMin: 0,
          //suggestedMax: 0
        }
      }],
      xAxes: [{}]
    }
  };

  colors: Array<any> = [
    { // brandInfo
      backgroundColor: hexToRgba(getStyle('--info'), 60),
      borderColor: getStyle('--info'),
      pointHoverBackgroundColor: '#fff'
    },
    { // brandSuccess
      backgroundColor: hexToRgba(getStyle('--success'), 60),
      borderColor: getStyle('--success'),
      pointHoverBackgroundColor: '#fff'
    }
  ];

  legend = true;

  constructor() {
  }

  ngOnInit() {
  }

  /**
   * ngOnChanges instead of @Input setters is needed to make sure that
   * the changes on 'chartType' are applied first, since the changes on
   * other variables depend on it
   */
  ngOnChanges(changes: SimpleChanges) {
    if( changes['chartType'] ) {
      this.setChartType( changes['chartType'].currentValue );
    }
    if( changes['data'] ) {
      this._data = this.mapData( changes['data'].currentValue );
    }
    if( changes['labels'] ) {
      this._labels = this.mapLabel( changes['labels'].currentValue );
    }
    if( changes['min'] ) {
      this._min = changes['min'].currentValue;
      this.updateOptions();
    }
    if( changes['max'] ) {
      this._max = changes['max'].currentValue;
      this.updateOptions();
    }
  }

  setChartType(chartType) {
    chartType = chartType.toLowerCase() || 'line';
    if (chartType === 'polararea') {
      chartType = 'polarArea';
    }
    this._chartType = chartType;
    const showAxes = ['bar', 'line'].includes(this._chartType);
    this.options.scales.xAxes[0].display = showAxes;
    this.options.scales.yAxes[0].display = showAxes;
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
      if(this._min) this.options.scales.yAxes[0].ticks.suggestedMin = this._min;
      if(this._max) this.options.scales.yAxes[0].ticks.suggestedMax = this._max;
    }
  }

}

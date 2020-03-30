import {Component, Input, OnInit} from '@angular/core';
import {CustomTooltips} from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import {getStyle, hexToRgba} from '@coreui/coreui/dist/js/coreui-utilities';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit {

  _chartType: string;
  @Input() set chartType(val) {
    this.setChartType(val);
  }

  //@Input() data: Array<any>;
  _data;
  @Input() set data(data) {
    this._data = this.mapData(data);
  }

  _labels;
  @Input() set labels(labels) {
    this._labels = this.mapLabel(labels);
  }

  //@Input() config?:any;
  _min: number;
  @Input() set min(min) {
    this._min = min;
    this.updateOptions();
  }

  _max: number;
  @Input() set max(max) {
    this._max = max;
    this.updateOptions();
  }

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

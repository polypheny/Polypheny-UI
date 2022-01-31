import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {CustomTooltips} from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import {hexToRgba} from '@coreui/coreui/dist/js/coreui-utilities';

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

  colors;//will be assigned in function

  colorList = [
    '#f86c6b',
    '#20a8d8',
    '#ffc107',
    '#21576A',
    '#814848',
    '#88bb9a',
    '#3a7c96',
    '#914661',
    '#bfa0ab',
  ];

  doughnutPolarColors = [{
    backgroundColor: [
      hexToRgba( this.getColor(0), 60),
      hexToRgba( this.getColor(1), 60),
      hexToRgba( this.getColor(2), 60),
      hexToRgba( this.getColor(3), 60),
      hexToRgba( this.getColor(4), 60),
      hexToRgba( this.getColor(5), 60),
      hexToRgba( this.getColor(6), 60),
      hexToRgba( this.getColor(7), 60),
      hexToRgba( this.getColor(8), 60),
    ],
    borderColor: [
      this.getColor(0),
      this.getColor(1),
      this.getColor(2),
      this.getColor(3),
      this.getColor(4),
      this.getColor(5),
      this.getColor(6),
      this.getColor(7),
      this.getColor(8),
    ],
    borderWidth: 1
  }];

  barColors = [
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(0), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(1), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(2), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(3), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(4), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(5), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(6), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(7), 60 ) },
    { borderWidth: 1, backgroundColor: hexToRgba( this.getColor(8), 60 ) },
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
    if (chartType === 'doughnut' || chartType === 'polarArea'){
      this.colors = this.doughnutPolarColors;
    } else if (chartType === 'bar'){
      this.colors = this.barColors;
    } else {
      this.colors = undefined;
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

  getColor ( i: number ) {
    return this.colorList[i];
  }

}

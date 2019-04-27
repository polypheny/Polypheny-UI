import {Component, Input, OnInit} from '@angular/core';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { getStyle, hexToRgba } from '@coreui/coreui/dist/js/coreui-utilities';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit {

  @Input() data: Array<any>;
  @Input() labels: Array<any>;
  @Input() config?:any;
  @Input() chartType:string;

  options: any = {
    animation: false,
    responsive: true,
    tooltips: {
      enabled: false,
      custom: CustomTooltips
    },
    maintainAspectRatio: true,
    scales: {
      xAxes: [{
        display: true
      }],
      yAxes: [{
        display: true
      }]
    },
    elements: {
      line: {
        borderWidth: 2
      },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4,
      },
    },
    legend: {
      display: true
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

  legend = false;

  constructor() {}

  ngOnInit() {
    this.chartType = this.chartType.toLowerCase() || 'line';
  }

}

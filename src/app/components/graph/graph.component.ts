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
    responsive: true,
    tooltips: {
      enabled: false,
      custom: CustomTooltips
    },
    maintainAspectRatio: false,
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
    this.data = [
      {
        data: [1, 18, 9, 17, 34, 22],
        label: 'row 1'
      },
      {
        data: [5, 10, 3, 2, 18, 4],
        label: 'row 2'
      },
      {
        data: [6,3,2,8,4,6],
        label: 'row 3'
      }
    ];

    this.labels = ['January', 'February', 'March', 'April', 'May', 'June'];

    this.chartType = this.chartType || 'line';
  }

}

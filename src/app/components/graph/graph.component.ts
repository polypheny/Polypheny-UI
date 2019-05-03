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

  constructor() {}

  ngOnInit() {
    this.chartType = this.chartType.toLowerCase() || 'line';
    if( this.chartType === 'polararea' ) this.chartType = 'polarArea';
  }

}
